import { create } from 'zustand';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type {
  Case, CaseLog, Flight, FlightChangeType, ImpactReport, Notification, PermissionMatrix, RoleKey, Route, SectionKey, Task, TaskStatus,
  WorkflowTemplate, NextStep,
} from '@/types';
import { seedCases } from '@/data/cases';
import { seedTasks } from '@/data/tasks';
import { seedNotifications } from '@/data/notifications';
import { seedLogs } from '@/data/logs';
import { workflows as seedWorkflows } from '@/data/workflows';
import { defaultPermissions } from '@/data/roles';
import { routes as seedRoutes } from '@/data/routes';
import { users, userById, userName } from '@/data/users';
import { SEED_TODAY, addDays, diffDays, fmtDate } from '@/lib/dates';
import { buildTimeline, completeStepByKey, refreshTimelineStatus, shiftTimeline, advanceStep as advanceTimeline } from '@/lib/workflow';
import { computeImpact } from '@/lib/impact';
import { generateReminders } from '@/lib/reminders';

let seq = 1000;
const nextId = (p = 'x') => `${p}${++seq}`;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const seedState = () => ({
  cases: clone(seedCases),
  tasks: clone(seedTasks),
  notifications: clone(seedNotifications),
  logs: clone(seedLogs),
  workflows: clone(seedWorkflows),
  permissions: clone(defaultPermissions),
  routes: clone(seedRoutes),
  today: SEED_TODAY,
  lastImpact: null as ImpactReport | null,
});

export interface NewCaseInput {
  pet_name: string; species: 'dog' | 'cat'; breed: string; owner_name: string;
  origin: string; dest: string; departure_date: string; template_id: string;
  ops_docs_id: string; ops_logistics_id: string; booking_id: string;
}
export interface NewTaskInput {
  case_id: string; type: Task['type']; assignee_id: string; date: string; time_start: string; time_end: string;
  pickup_addr: string; dest_addr: string; notes: string;
}

interface AppState extends ReturnType<typeof seedState> {
  currentUserId: string | null;
  // session
  login: (userId: string) => void;
  switchUser: (userId: string) => void;
  logout: () => void;
  resetDemo: () => void;
  setToday: (date: string) => void;
  clearImpact: () => void;
  // case
  updateCase: (id: string, patch: Partial<Case>, actorId: string, logText?: string) => void;
  addLog: (caseId: string, actorId: string | '系统', action: string) => void;
  markFlightChange: (caseId: string, type: FlightChangeType, newDate: string, actorId: string) => void;
  advanceCaseStep: (caseId: string, actorId: string) => void;
  completeCaseStep: (caseId: string, stepKey: string, actorId: string) => void;
  confirmBooking: (caseId: string, input: { flight_no: string; awb: string; airline: string }, actorId: string) => void;
  fillRoute: (caseId: string, routeId: string, actorId: string) => void;
  updateFlight: (caseId: string, flightId: string, patch: Partial<Flight>, actorId: string) => void;
  addFosterDaily: (caseId: string, note: string, actorId: string) => void;
  createCase: (input: NewCaseInput, actorId: string) => string;
  // task
  createTask: (input: NewTaskInput, actorId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus, actorId: string) => void;
  toggleTaskConfirm: (taskId: string, field: 'owner_confirmed' | 'driver_confirmed') => void;
  // notifications
  markRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  // admin
  togglePermission: (role: RoleKey, section: SectionKey, field: 'view' | 'edit') => void;
}

const nowIso = (today: string) => `${today}T${format(new Date(), 'HH:mm:ss')}`;
const actorName = (id: string) => (id === '系统' ? '系统' : userName(id));

export const useAppStore = create<AppState>((set, get) => {
  const log = (caseId: string, actorId: string, action: string) => {
    const entry: CaseLog = { id: nextId('l'), case_id: caseId, at: nowIso(get().today), actor: actorName(actorId), action };
    set((s) => ({ logs: [entry, ...s.logs] }));
  };
  const notify = (list: Omit<Notification, 'id' | 'created_at' | 'read'>[]) => {
    const { today, currentUserId } = get();
    const items: Notification[] = list.map((n) => ({ ...n, id: nextId('n'), created_at: nowIso(today), read: false }));
    set((s) => ({ notifications: [...items, ...s.notifications] }));
    items.filter((n) => n.to_user_id === currentUserId).forEach((n) => toast(n.title, { description: n.body }));
    return items;
  };
  const patchCase = (id: string, patch: Partial<Case>) => set((s) => ({ cases: s.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const caseOf = (id: string) => get().cases.find((c) => c.id === id);
  const templateOf = (c: Case) => get().workflows.find((w) => w.id === c.template_id)!;

  return {
    ...seedState(),
    currentUserId: null,

    login: (userId) => set({ ...seedState(), currentUserId: userId }),
    switchUser: (userId) => set({ currentUserId: userId }),
    logout: () => set({ ...seedState(), currentUserId: null }),
    resetDemo: () => { const uid = get().currentUserId; set({ ...seedState(), currentUserId: uid }); toast.success('已重置为 seed 数据'); },

    setToday: (date) => {
      const s = get();
      const cases = s.cases.map((c) => ({ ...c, timeline: refreshTimelineStatus(c.timeline, date, c.current_step_key) }));
      const { tasks, notifications } = generateReminders(s.tasks, cases, date, nowIso(date), () => nextId('n'));
      set({ today: date, cases, tasks, notifications: [...notifications, ...s.notifications] });
      const mine = notifications.filter((n) => n.to_user_id === s.currentUserId);
      mine.forEach((n) => toast(n.title, { description: n.body }));
      const others = notifications.filter((n) => n.to_user_id !== s.currentUserId);
      if (others.length) {
        const by = Object.entries(others.reduce<Record<string, number>>((m, n) => ({ ...m, [userName(n.to_user_id)]: (m[userName(n.to_user_id)] ?? 0) + 1 }), {}))
          .map(([k, v]) => `${k} ×${v}`).join('，');
        toast.info(`日期拨到 ${fmtDate(date)}，系统生成 ${others.length} 条提醒`, { description: by });
      }
    },
    clearImpact: () => set({ lastImpact: null }),

    updateCase: (id, patch, actorId, logText) => {
      const before = caseOf(id);
      if (!before) return;
      patchCase(id, patch);
      if (logText) { log(id, actorId, logText); return; }
      const LABELS: Partial<Record<keyof Case, string>> = { priority: '优先级', next_step: '下一步', stage: '阶段', airline_confirmed: '航司状态', waiting: '等待', deadline: '截止', files_status: '文件状态', payment_status: '收款情况', final_payment_status: '尾款情况', driver_needed: '司机需求', departure_date: '出发日' };
      (Object.keys(patch) as (keyof Case)[]).forEach((k) => {
        if (LABELS[k] && before[k] !== patch[k]) log(id, actorId, `把${LABELS[k]}从 ${String(before[k] || '空')} 改为 ${String(patch[k] || '空')}`);
      });
    },
    addLog: (caseId, actorId, action) => log(caseId, actorId, action),

    markFlightChange: (caseId, type, newDate, actorId) => {
      const s = get();
      const c = caseOf(caseId);
      if (!c) return;
      const old = c.departure_date;
      const items = computeImpact(c, s.tasks, type, newDate || old, s.today);
      const tpl = templateOf(c);
      const cancelled = type === '取消' || !newDate;
      const patch: Partial<Case> = {
        airline_confirmed: cancelled ? '已取消' : '已改期',
        risk_tags: Array.from(new Set([...c.risk_tags, '时间' as const, ...(type === '当天拒载' ? ['健康' as const] : [])])),
        priority: '紧急',
        next_step: (cancelled || type === '当天拒载' || type === '无仓位' ? '订舱' : c.next_step) as NextStep,
        waiting: cancelled ? '航司' : c.waiting,
        notes_extra: `${c.notes_extra ? c.notes_extra + '\n' : ''}【航变 ${fmtDate(s.today)}】${type}${newDate ? `，新日期 ${fmtDate(newDate)}` : ''}`,
      };
      if (!cancelled) {
        const delta = diffDays(old, newDate);
        patch.departure_date = newDate;
        patch.deadline = newDate;
        patch.timeline = shiftTimeline(c.timeline, tpl, newDate, s.today);
        patch.flights = c.flights.map((f) => ({ ...f, dep_time: addDays(f.dep_time.slice(0, 10), delta) + f.dep_time.slice(10), arr_time: addDays(f.arr_time.slice(0, 10), delta) + f.arr_time.slice(10), confirmed: false }));
        if (c.foster_end && diffDays(c.foster_end, newDate) > 0) patch.foster_end = newDate;
      } else {
        patch.flights = c.flights.map((f) => ({ ...f, confirmed: false }));
      }
      patchCase(caseId, patch);
      // 受影响司机任务加标记
      const affectedTasks = s.tasks.filter((t) => t.case_id === caseId && !['已完成', '异常'].includes(t.status) && diffDays(s.today, t.date) >= 0);
      set((st) => ({ tasks: st.tasks.map((t) => (affectedTasks.some((a) => a.id === t.id) ? { ...t, notes: `⚠ 航变（${type}）待改期 · ${t.notes}` } : t)) }));
      log(caseId, actorId, `标记航变：${type}${newDate ? `，${fmtDate(old)} → ${fmtDate(newDate)}` : ''}，航司状态改为 ${patch.airline_confirmed}`);
      log(caseId, '系统', `航变触发影响清单（${items.length} 项）：${items.filter((i) => i.level !== 'info').map((i) => i.text).slice(0, 2).join('；') || '无重大影响'}`);
      // 通知
      const drivers = affectedTasks.map((t) => t.assignee_id);
      const admins = users.filter((u) => u.role === 'admin').map((u) => u.id);
      const targets = Array.from(new Set([c.ops_docs_id, c.ops_logistics_id, c.booking_id, ...drivers, ...admins])).filter((id) => id !== actorId);
      const flightNo = c.flights[0]?.flight_no ?? '';
      const created = notify(targets.map((to) => ({
        to_user_id: to,
        kind: 'flight_change' as const,
        title: `航变 · ${c.pet_name}（${type}）`,
        body: `${flightNo} ${fmtDate(old)}${newDate ? ` → ${fmtDate(newDate)}` : ' 取消'}；${drivers.includes(to) ? '你的司机任务需改期，请等待新安排' : items.find((i) => i.level !== 'info')?.text ?? '请查看影响清单'}`,
        case_id: caseId,
      })));
      const report: ImpactReport = { case_id: caseId, change_type: type, old_date: old, new_date: newDate || old, items, notified: created.map((n) => n.to_user_id), created_at: nowIso(s.today) };
      set({ lastImpact: report });
      toast.warning(`已标记航变：${c.pet_name} ${type}`, { description: `影响清单 ${items.length} 项，已通知 ${created.length} 人：${created.map((n) => userName(n.to_user_id)).join('、')}` });
    },

    advanceCaseStep: (caseId, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      const cur = c.timeline.find((t) => t.key === c.current_step_key);
      const { timeline, nextKey } = advanceTimeline(c.timeline, c.current_step_key, get().today);
      patchCase(caseId, { timeline, current_step_key: nextKey });
      log(caseId, actorId, `完成步骤「${cur?.label}」，当前步骤 → ${timeline.find((t) => t.key === nextKey)?.label}`);
    },
    completeCaseStep: (caseId, stepKey, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      const { timeline, nextKey } = completeStepByKey(c.timeline, stepKey, get().today, c.current_step_key);
      patchCase(caseId, { timeline, current_step_key: nextKey });
      log(caseId, actorId, `完成步骤「${c.timeline.find((t) => t.key === stepKey)?.label}」`);
    },

    confirmBooking: (caseId, input, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      const flights: Flight[] = c.flights.length
        ? c.flights.map((f, i) => ({ ...f, awb: input.awb, confirmed: true, ...(i === 0 ? { flight_no: input.flight_no || f.flight_no, airline: input.airline || f.airline } : {}) }))
        : [{ id: nextId('f'), airline: input.airline, flight_no: input.flight_no, from_code: c.origin, to_code: c.dest_region, dep_time: `${c.departure_date}T12:00:00`, arr_time: `${addDays(c.departure_date, 1)}T14:00:00`, awb: input.awb, confirmed: true }];
      const { timeline, nextKey } = completeStepByKey(c.timeline, 'booking', get().today, c.current_step_key);
      const nextStep: NextStep = c.next_step === '订舱' ? '约医院' : c.next_step;
      patchCase(caseId, { flights, airline_confirmed: '已确认', timeline, current_step_key: nextKey, next_step: nextStep, waiting: c.waiting === '航司' ? '' : c.waiting, risk_tags: c.risk_tags.filter((r) => r !== '时间') });
      log(caseId, actorId, `填写 AWB ${input.awb}，航班 ${input.flight_no} 已确认，航司状态 → 已确认`);
      notify([c.ops_docs_id, c.ops_logistics_id, ...users.filter((u) => u.role === 'admin').map((u) => u.id)].filter((id) => id !== actorId).map((to) => ({ to_user_id: to, kind: 'task' as const, title: `订舱完成 · ${c.pet_name}`, body: `${input.flight_no} ${fmtDate(c.departure_date)}，AWB ${input.awb}`, case_id: caseId })));
      toast.success(`${c.pet_name} 订舱已确认`, { description: `AWB ${input.awb}` });
    },

    fillRoute: (caseId, routeId, actorId) => {
      const c = caseOf(caseId);
      const r = get().routes.find((x) => x.id === routeId);
      if (!c || !r) return;
      const dep = c.departure_date;
      const flights: Flight[] = r.type === '直飞'
        ? [{ id: nextId('f'), airline: r.airline, flight_no: r.flight_no, from_code: r.origin, to_code: r.dest, dep_time: `${dep}T${r.dep_time}:00`, arr_time: `${addDays(dep, r.arr_day_offset)}T${r.arr_time}:00`, awb: '', confirmed: false }]
        : [
          { id: nextId('f'), airline: r.airline, flight_no: r.flight_no, from_code: r.origin, to_code: r.via ?? '', dep_time: `${dep}T${r.dep_time}:00`, arr_time: `${addDays(dep, 1)}T07:00:00`, awb: '', confirmed: false },
          { id: nextId('f'), airline: r.airline, flight_no: r.second_leg ?? '', from_code: r.via ?? '', to_code: r.dest, dep_time: `${addDays(dep, 1)}T13:00:00`, arr_time: `${addDays(dep, r.arr_day_offset)}T${r.arr_time}:00`, awb: '', confirmed: false },
        ];
      patchCase(caseId, { flights, airline_confirmed: ['未订', '查询中'].includes(c.airline_confirmed) ? '待确认' : c.airline_confirmed, route: `${r.origin} → ${r.dest} · ${r.flight_no}${r.type === '中转' ? ` 经 ${r.via}` : ' 直飞'}` });
      log(caseId, actorId, `从航线速查填入 ${r.airline} ${r.flight_no}${r.type === '中转' ? ` 经 ${r.via}` : ''}，航司状态 → 待确认`);
      toast.success(`已填入 ${c.pet_name} 的航班子表`, { description: `${r.flight_no} ${r.origin} → ${r.dest}` });
    },
    updateFlight: (caseId, flightId, patch, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      patchCase(caseId, { flights: c.flights.map((f) => (f.id === flightId ? { ...f, ...patch } : f)) });
      if (patch.awb) log(caseId, actorId, `填写 AWB ${patch.awb}`);
    },
    addFosterDaily: (caseId, note, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      patchCase(caseId, { foster_daily: [...c.foster_daily, { date: get().today, note, by: userName(actorId) }] });
      log(caseId, actorId, `寄养日常：${note}`);
    },

    createCase: (input, actorId) => {
      const s = get();
      const tpl = s.workflows.find((w) => w.id === input.template_id)!;
      const id = nextId('c');
      const n = s.cases.length + 1;
      const c: Case = {
        id, file_no: `JM-2026-${String(70 + n).padStart(3, '0')}`, template_id: tpl.id, archived: false, created_at: s.today,
        pet_name: input.pet_name, species: input.species, breed: input.breed, birth_date: '', gender: '公', weight: 0, color: '', chip_no: '', crate_no: '',
        foster_start: '', foster_end: '', foster_med_count: 0, foster_notes: '', foster_daily: [],
        owner_name: input.owner_name, passport_no: '', owner_phone_cn: '', owner_phone_intl: '', owner_addr_cn: '', owner_addr_intl: '', owner_email: '',
        origin: input.origin, dest_country: tpl.dest_country, dest_region: input.dest, route: `${input.origin} → ${input.dest}`, departure_date: input.departure_date,
        stage: '新建', next_step: tpl.steps[0].key === 'chip' ? '调档' : '补狂犬', deadline: addDays(input.departure_date, tpl.steps[0].offset_days), waiting: '', priority: '待定', status: '进行中', risk_tags: [],
        current_step_key: tpl.steps[0].key, timeline: buildTimeline(tpl, input.departure_date, tpl.steps[0].key, s.today),
        files_status: '无', expected_vaccine_date: '', expected_blood_draw_date: '', expected_health_cert_date: '', health_cert_issued: '',
        vacc_rabies_1: '', vacc_rabies_2: '', vacc_fvrcp: '', vacc_favn: '', vacc_ihc: '', vacc_notes: '',
        airline_confirmed: '未订', flights: [], driver_needed: '待定',
        payment_status: '必填费用未收', final_payment_status: '未收齐', payment_notes: '',
        sales_handover: '', pickup_log: '', foster_log: '', arrival_log: '', notes_extra: '',
        ops_docs_id: input.ops_docs_id, ops_logistics_id: input.ops_logistics_id, booking_id: input.booking_id,
      };
      set((st) => ({ cases: [c, ...st.cases] }));
      log(id, actorId, `新建 Case，模板「${tpl.name}」，按出发日 ${fmtDate(input.departure_date)} 生成 ${tpl.steps.length} 步 Timeline`);
      toast.success(`已新建 ${c.pet_name}（${c.file_no}）`, { description: `按模板生成 ${tpl.steps.length} 步计划` });
      return id;
    },

    createTask: (input, actorId) => {
      const s = get();
      const c = caseOf(input.case_id);
      const task: Task = { id: nextId('t'), ...input, status: '待开始', owner_confirmed: false, driver_confirmed: false, created_by: actorId, reminded: [] };
      const { tasks: withReminder, notifications } = generateReminders([task], s.cases, s.today, nowIso(s.today), () => nextId('n'));
      set((st) => ({ tasks: [...st.tasks, withReminder[0]], notifications: [...notifications, ...st.notifications] }));
      log(input.case_id, actorId, `创建任务：${input.type} ${fmtDate(input.date)} ${input.time_start}–${input.time_end}，指派 ${userName(input.assignee_id)}`);
      if (input.assignee_id !== actorId) {
        notify([{ to_user_id: input.assignee_id, kind: 'task', title: `新任务 · ${input.type}`, body: `${fmtDate(input.date)} ${input.time_start} ${c?.pet_name ?? ''}（${c?.file_no ?? ''}）${input.pickup_addr ? `，${input.pickup_addr} → ${input.dest_addr}` : ''}`, case_id: input.case_id, task_id: task.id }]);
      }
      notifications.filter((n) => n.to_user_id === s.currentUserId).forEach((n) => toast(n.title, { description: n.body }));
      const d = diffDays(s.today, input.date);
      toast.success(`已创建任务并指派给 ${userName(input.assignee_id)}`, { description: d > 2 ? `${d} 天后执行；临 48h / 24h / 当天会自动提醒（可拨动日期演示）` : '已触发提醒' });
    },

    updateTaskStatus: (taskId, status, actorId) => {
      const s = get();
      const t = s.tasks.find((x) => x.id === taskId);
      const c = t && caseOf(t.case_id);
      if (!t || !c) return;
      set((st) => ({ tasks: st.tasks.map((x) => (x.id === taskId ? { ...x, status } : x)) }));
      log(c.id, actorId, `任务「${t.type} ${fmtDate(t.date)}」状态 → ${status}`);
      if (status === '已完成') {
        const patch: Partial<Case> = {};
        let stepKey: string | null = null;
        if (t.type === '送机') { patch.next_step = '跟航班'; patch.stage = '出发'; stepKey = 'driver_airport'; if (['已确认', '已改期'].includes(c.airline_confirmed)) patch.airline_confirmed = '已起飞'; }
        if (t.type === '送医院') { patch.next_step = '盖章'; stepKey = c.timeline.some((x) => x.key === 'hospital') ? 'hospital' : 'health_cert'; patch.health_cert_issued = s.today; patch.vacc_ihc = s.today; }
        if (t.type === '送 CFIA') { patch.next_step = '最终检查'; patch.files_status = '已盖章'; stepKey = c.timeline.find((x) => ['cfia', 'usda', 'cn_quarantine'].includes(x.key))?.key ?? null; }
        if (t.type === '采血') { patch.next_step = '等血清'; patch.vacc_favn = s.today; stepKey = 'favn'; }
        if (t.type === '接宠') { patch.pickup_log = `${c.pickup_log ? c.pickup_log + '\n' : ''}${fmtDate(s.today)} ${userName(actorId)} 接宠完成（${t.pickup_addr} → ${t.dest_addr}）`; if (!c.foster_start) patch.foster_start = s.today; }
        if (stepKey) {
          const r = completeStepByKey(c.timeline, stepKey, s.today, c.current_step_key);
          patch.timeline = r.timeline; patch.current_step_key = r.nextKey;
        }
        patchCase(c.id, patch);
        if (patch.next_step) log(c.id, '系统', `${userName(actorId)}完成「${t.type}」，next_step 跳到 ${patch.next_step}`);
        const targets = Array.from(new Set([c.ops_logistics_id, ...users.filter((u) => u.role === 'admin').map((u) => u.id)])).filter((id) => id !== actorId);
        notify(targets.map((to) => ({ to_user_id: to, kind: 'task' as const, title: `任务完成 · ${c.pet_name} ${t.type}`, body: `${userName(actorId)} 已完成 ${fmtDate(t.date)} ${t.type}${patch.next_step ? `，Case 下一步 → ${patch.next_step}` : ''}`, case_id: c.id, task_id: t.id })));
      }
      if (status === '异常') {
        const targets = Array.from(new Set([c.ops_logistics_id, ...users.filter((u) => u.role === 'admin').map((u) => u.id)])).filter((id) => id !== actorId);
        notify(targets.map((to) => ({ to_user_id: to, kind: 'task' as const, title: `任务异常 · ${c.pet_name} ${t.type}`, body: `${userName(actorId)} 标记异常，请联系处理`, case_id: c.id, task_id: t.id })));
      }
    },
    toggleTaskConfirm: (taskId, field) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, [field]: !t[field] } : t)) })),

    markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    markAllRead: (userId) => set((s) => ({ notifications: s.notifications.map((n) => (n.to_user_id === userId ? { ...n, read: true } : n)) })),

    togglePermission: (role, section, field) => set((s) => {
      const cur = s.permissions[role][section];
      const next = { ...cur, [field]: !cur[field] };
      if (field === 'view' && !next.view) next.edit = false;
      if (field === 'edit' && next.edit) next.view = true;
      return { permissions: { ...s.permissions, [role]: { ...s.permissions[role], [section]: next } } as PermissionMatrix };
    }),
  };
});

export const useCurrentUser = () => useAppStore((s) => (s.currentUserId ? userById(s.currentUserId) : undefined));
export type { WorkflowTemplate, Route };
