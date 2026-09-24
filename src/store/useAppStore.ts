import { create } from 'zustand';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type {
  Alert, AlertKind, Attachment, AttachmentCategory, Case, CaseLog, CaseType, Currency, ExtraFee, FeeBearer, FinalPaymentPoint, Flight, FlightChangeType,
  ImpactReport, InternalNote, Notification, OpsFlightChangeType, PermissionMatrix, RoleKey, Route, SalesOrder, SectionKey, ServiceScope, SmsRecord, Species, Task, TaskStatus,
  WorkflowTemplate, AccompanyStatus,
} from '@/types';
import { seedCases } from '@/data/cases';
import { seedTasks } from '@/data/tasks';
import { seedAttachments, seedFees, seedLogs, seedNotes, seedNotifications } from '@/data/extras';
import { seedAlerts, seedSms } from '@/data/alerts';
import { seedSalesOrders } from '@/data/sales';
import { workflows as seedWorkflows } from '@/data/workflows';
import { defaultPermissions } from '@/data/roles';
import { routes as seedRoutes } from '@/data/routes';
import { users, userById, userName, adminIds } from '@/data/users';
import { AIRPORT_CITY, AIRPORT_COUNTRY, AIRPORT_REGION } from '@/data/options';
import { SEED_TODAY, addDays, diffDays, fmtMD } from '@/lib/dates';
import { buildTimeline, completeStepByKey, preDocsDone, rebuildTimeline, refreshTimelineStatus, shiftTimeline } from '@/lib/workflow';
import { computeImpact } from '@/lib/impact';
import { generateReminders } from '@/lib/reminders';
import { alertTargets, isDriverTask } from '@/lib/permissions';
import { sendSms, smsBody } from '@/lib/sms';

let seq = 1000;
const nextId = (p = 'x') => `${p}${++seq}`;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const seedState = () => ({
  cases: clone(seedCases),
  tasks: clone(seedTasks),
  notifications: clone(seedNotifications),
  logs: clone(seedLogs),
  notes: clone(seedNotes),
  fees: clone(seedFees),
  attachments: clone(seedAttachments),
  alerts: clone(seedAlerts),
  sms: clone(seedSms),
  salesOrders: clone(seedSalesOrders),
  workflows: clone(seedWorkflows),
  permissions: clone(defaultPermissions),
  routes: clone(seedRoutes),
  today: SEED_TODAY,
  lastImpact: null as ImpactReport | null,
});

export interface NewCaseInput {
  sales_order_id: string;
  pet_name: string; species: Species; breed: string; owner_name: string;
  origin: string; entry_airport: string; final_dest: string; departure_date: string;
  case_type: CaseType; service_scope: ServiceScope; template_id: string;
  ops_docs_id: string; sales_id: string;
}
export interface NewTaskInput {
  case_id: string; type: Task['type']; assignee_id: string; date: string; time_start: string; time_end: string;
  pickup_addr: string; pickup_phone: string; dest_addr: string; dest_phone: string; notes: string;
}
export interface NewSalesOrderInput {
  sales_id: string; owner_wechat_name: string; owner_wechat_id: string; origin_text: string; dest_text: string; price_text: string; currency: Currency; order_status_text: string; caution: string; pet_name: string;
}
export interface NewFlightInput { airline: string; flight_no: string; from_code: string; to_code: string; dep_time: string; arr_time: string; awb: string }

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
  addNote: (caseId: string, text: string, actorId: string) => void;
  addFee: (caseId: string, fee: { date: string; desc: string; amount: number; currency: Currency; bearer: FeeBearer }, actorId: string) => void;
  setFeeBearer: (feeId: string, bearer: FeeBearer, actorId: string) => void;
  addAttachment: (caseId: string, category: AttachmentCategory, stepKey: string, file: { name: string; size: number; mime: string; url: string }, actorId: string) => void;
  completeCaseStep: (caseId: string, stepKey: string, actorId: string) => boolean;
  setDeparture: (caseId: string, date: string, actorId: string) => void;
  changeCaseSetup: (caseId: string, patch: { case_type?: CaseType; service_scope?: ServiceScope; final_payment_point?: FinalPaymentPoint }, actorId: string) => void;
  createCase: (input: NewCaseInput, actorId: string) => string;
  notifyBooking: (caseId: string, actorId: string, note: string) => void;
  markArrivedHome: (caseId: string, actorId: string) => void;
  // flights（托运）
  addFlight: (caseId: string, input: NewFlightInput, actorId: string) => void;
  fillRoute: (caseId: string, routeId: string, actorId: string) => void;
  updateFlight: (caseId: string, flightId: string, patch: Partial<Flight>, actorId: string) => void;
  confirmBooking: (caseId: string, input: { flight_id: string; awb: string }, actorId: string) => void;
  markFlightChange: (caseId: string, type: FlightChangeType, newDate: string, note: string, actorId: string) => void;
  opsFlightChange: (caseId: string, type: OpsFlightChangeType, newDate: string, note: string, actorId: string) => void;
  // 随机
  updateAccompany: (caseId: string, patch: Partial<Pick<Case, 'accompany_needed' | 'accompany_person' | 'accompany_status' | 'accompany_notes' | 'cabin'>>, actorId: string) => void;
  markAccompanyException: (caseId: string, type: string, note: string, actorId: string) => void;
  // task
  createTask: (input: NewTaskInput, actorId: string) => void;
  updateTask: (taskId: string, patch: Partial<Task>, reason: string, actorId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus, actorId: string) => void;
  driverDecline: (taskId: string, reason: string, actorId: string) => void;
  reportException: (taskId: string, reason: string, note: string, actorId: string) => void;
  ackTaskChange: (taskId: string, actorId: string) => void;
  // alerts
  confirmAlert: (alertId: string, userId: string) => void;
  // sales
  createSalesOrder: (input: NewSalesOrderInput, actorId: string) => string;
  updateSalesOrder: (id: string, patch: Partial<SalesOrder>, actorId: string) => void;
  // notifications
  markRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  // admin
  togglePermission: (role: RoleKey, section: SectionKey, field: 'view' | 'edit') => void;
  updateRoute: (id: string, patch: Partial<Route>) => void;
  addFosterDaily: (caseId: string, note: string, actorId: string) => void;
}

const nowIso = (today: string) => `${today}T${format(new Date(), 'HH:mm:ss')}`;
const actorName = (id: string) => (id === '系统' ? '系统' : userName(id));
const opts = (c: Case) => ({ caseType: c.case_type, scope: c.service_scope, payPoint: c.final_payment_point });
const NON_DRIVER_FINANCE = (id: string) => { const r = userById(id)?.role; return r !== 'driver' && r !== 'finance'; };

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

  /** 紧急变动：写入紧急变动页 + 站内通知；withSms=true 时给管理员 + 负责人 + 销售发短信（司机、财务不发） */
  const raiseAlert = (c: Case, kind: AlertKind, title: string, detail: string, actorId: string, targets: string[], withSms: boolean) => {
    const s = get();
    const uniq = Array.from(new Set(targets));
    const smsTo = withSms ? uniq.filter(NON_DRIVER_FINANCE) : [];
    const alert: Alert = { id: nextId('al'), case_id: c.id, kind, title, detail, created_at: nowIso(s.today), created_by: actorId, departure_date: c.departure_date, targets: uniq, confirmations: {}, sms_to: smsTo, sms_status: withSms ? 'mocked' : 'none', resolved: false };
    set((st) => ({ alerts: [alert, ...st.alerts] }));
    notify(uniq.filter((id) => id !== actorId).map((to) => ({ to_user_id: to, kind: 'alert' as const, title, body: `${detail}；请在「紧急变动」里确认`, case_id: c.id, alert_id: alert.id })));
    if (withSms && smsTo.length) {
      const body = smsBody(c.pet_name, c.file_no, title.replace(/ · .*$/, ''), detail);
      const phones = smsTo.map((id) => userById(id)?.phone ?? '').filter(Boolean);
      void sendSms(phones, body).then((r) => {
        const rec: SmsRecord = { id: nextId('sms'), alert_id: alert.id, to_user_ids: smsTo, body, at: nowIso(get().today), status: r.status, detail: r.detail };
        set((st) => ({ sms: [rec, ...st.sms], alerts: st.alerts.map((a) => (a.id === alert.id ? { ...a, sms_status: r.status } : a)) }));
        const names = smsTo.map(userName).join('、');
        notify([{ to_user_id: actorId, kind: 'sms', title: `短信${r.status === 'sent' ? '已发送' : r.status === 'mocked' ? '已模拟发送' : '发送失败'} · ${c.pet_name}`, body: `${names}（${r.detail}）`, case_id: c.id, alert_id: alert.id }]);
      });
    }
    return alert;
  };

  const resolveAlerts = (caseId: string) => set((st) => ({ alerts: st.alerts.map((a) => (a.case_id === caseId ? { ...a, resolved: true } : a)) }));

  /** 前期文件办完 → 自动转给订舱 */
  const maybeHandToBooking = (caseId: string, actorId: string) => {
    const c = caseOf(caseId);
    if (!c || c.booking_notified || !c.booking_id || !preDocsDone(c)) return;
    patchCase(caseId, { booking_notified: true });
    log(caseId, '系统', `前期文件已办完，自动转给订舱 ${userName(c.booking_id)}`);
    notify([{ to_user_id: c.booking_id, kind: 'task', title: `新订舱任务 · ${c.pet_name}`, body: `${c.route}，预计 ${fmtMD(c.departure_date)} 出发，前期文件已办完`, case_id: caseId }]);
    if (actorId !== c.booking_id) toast.info(`前期文件办完，已自动转给订舱 ${userName(c.booking_id)}`);
  };

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
      notifications.filter((n) => n.to_user_id === s.currentUserId).forEach((n) => toast(n.title, { description: n.body }));
      const others = notifications.filter((n) => n.to_user_id !== s.currentUserId);
      if (others.length) {
        const by = Object.entries(others.reduce<Record<string, number>>((m, n) => ({ ...m, [userName(n.to_user_id)]: (m[userName(n.to_user_id)] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ×${v}`).join('，');
        toast.info(`日期拨到 ${fmtMD(date)}，系统生成 ${others.length} 条提醒`, { description: by });
      }
    },
    clearImpact: () => set({ lastImpact: null }),

    updateCase: (id, patch, actorId, logText) => {
      const before = caseOf(id);
      if (!before) return;
      patchCase(id, patch);
      if (logText) { log(id, actorId, logText); return; }
      const LABELS: Partial<Record<keyof Case, string>> = {
        airline_confirmed: '航司状态', waiting: '等待', files_status: '文件状态', final_payment_status: '尾款情况', driver_needed: '司机需求',
        pet_name: '宠物名', breed: '品种', gender: '性别', weight: '体重', color: '毛色', chip_no: '芯片号', birth_date: '出生日期', crate_size: '航空箱尺寸',
        foster_start: '寄养开始', foster_end: '寄养结束', owner_name: '主人姓名', passport_no: '护照号', owner_phone_cn: '国内电话', owner_phone_intl: '海外电话', owner_email: '邮箱',
        origin_city: '出发地', final_dest: '最终目的地', entry_airport: '入境机场', cabin: '舱位', docs_handed_to_owner: '文件转交主人', passport_sent: '护照已寄', accompany_status: '随机状态', accompany_person: '随机人',
        health_cert_issued: '健康证签发日', vacc_rabies_1: '狂犬 1 针', vacc_rabies_2: '狂犬 2 针', vacc_combo: '联合疫苗', vacc_blood: '采血日', ops_docs_id: '前期文件负责人', booking_id: '订舱负责人', ops_post_id: '后段负责人', status: '状态',
      };
      (Object.keys(patch) as (keyof Case)[]).forEach((k) => {
        if (LABELS[k] && before[k] !== patch[k]) log(id, actorId, `把${LABELS[k]}从「${String(before[k] || '空')}」改为「${String(patch[k] || '空')}」`);
      });
    },
    addLog: (caseId, actorId, action) => log(caseId, actorId, action),
    addNote: (caseId, text, actorId) => {
      const note: InternalNote = { id: nextId('nt'), case_id: caseId, text, by: userName(actorId), at: nowIso(get().today) };
      set((s) => ({ notes: [...s.notes, note] }));
      log(caseId, actorId, `添加内部备注：${text.slice(0, 40)}${text.length > 40 ? '…' : ''}`);
    },
    addFee: (caseId, fee, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      const item: ExtraFee = { id: nextId('fee'), case_id: caseId, ...fee, by: userName(actorId), at: nowIso(get().today) };
      set((s) => ({ fees: [...s.fees, item] }));
      log(caseId, actorId, `添加额外费用：${fmtMD(fee.date)} ${fee.desc} ${fee.amount} ${fee.currency}（${fee.bearer}）`);
      notify(users.filter((u) => u.role === 'finance').map((u) => ({ to_user_id: u.id, kind: 'system' as const, title: `额外费用 · ${c.pet_name}`, body: `${userName(actorId)} 添加：${fmtMD(fee.date)} ${fee.desc} ${fee.amount} ${fee.currency}（${fee.bearer}）`, case_id: caseId })));
    },
    setFeeBearer: (feeId, bearer, actorId) => {
      const f = get().fees.find((x) => x.id === feeId);
      if (!f) return;
      set((s) => ({ fees: s.fees.map((x) => (x.id === feeId ? { ...x, bearer } : x)) }));
      log(f.case_id, actorId, `额外费用「${f.desc}」承担方 ${f.bearer} → ${bearer}`);
    },
    addAttachment: (caseId, category, stepKey, file, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      const a: Attachment = { id: nextId('at'), case_id: caseId, category, step_key: stepKey, name: file.name, size: file.size, mime: file.mime, uploaded_by: actorId, uploaded_at: nowIso(get().today), url: file.url };
      set((s) => ({ attachments: [...s.attachments, a] }));
      const where = category === 'step' ? `步骤「${c.timeline.find((t) => t.key === stepKey)?.label ?? stepKey}」` : category === 'airline' ? '航司文件' : '其他文件';
      log(caseId, actorId, `上传附件 ${file.name} 到 ${where}`);
      toast.success(`已上传 ${file.name}`);
    },

    completeCaseStep: (caseId, stepKey, actorId) => {
      const s = get();
      const c = caseOf(caseId);
      if (!c) return false;
      const st = c.timeline.find((t) => t.key === stepKey);
      if (!st) return false;
      if (st.required_docs.length && !s.attachments.some((a) => a.case_id === caseId && a.category === 'step' && a.step_key === stepKey)) {
        toast.error(`「${st.label}」需要先上传附件（${st.required_docs.join(' / ')}）才能标记完成`);
        return false;
      }
      const r = completeStepByKey(c.timeline, stepKey, s.today, c.current_step_key, userName(actorId));
      const patch: Partial<Case> = { timeline: r.timeline, current_step_key: r.nextKey };
      if (['health_cert', 'quarantine_cert'].includes(stepKey) && !c.health_cert_issued) patch.health_cert_issued = s.today;
      if (stepKey === 'stamp') patch.files_status = '已盖章';
      if (stepKey === 'handover_docs') { patch.files_status = '已转交主人'; patch.docs_handed_to_owner = true; }
      if (stepKey === 'final_payment') patch.final_payment_status = '已收齐全部尾款';
      if (stepKey === 'home') { patch.arrived_home = true; patch.home_date = s.today; }
      patchCase(caseId, patch);
      log(caseId, actorId, `完成步骤「${st.label}」`);
      maybeHandToBooking(caseId, actorId);
      if (stepKey === 'home') get().markArrivedHome(caseId, actorId);
      return true;
    },

    setDeparture: (caseId, date, actorId) => {
      const s = get();
      const c = caseOf(caseId);
      if (!c || !date) return;
      patchCase(caseId, { departure_date: date, timeline: shiftTimeline(c.timeline, templateOf(c), opts(c), date, s.today) });
      log(caseId, actorId, `${c.departure_confirmed ? '实际' : '预计'}出发日期 ${fmtMD(c.departure_date)} → ${fmtMD(date)}，未完成步骤按新日期重排`);
    },

    changeCaseSetup: (caseId, patch, actorId) => {
      const s = get();
      const c = caseOf(caseId);
      if (!c) return;
      const next = { ...c, ...patch };
      const r = rebuildTimeline(c.timeline, templateOf(c), opts(next), c.departure_date, s.today);
      const extra: Partial<Case> = {};
      if (patch.case_type && patch.case_type !== c.case_type) {
        extra.booking_id = patch.case_type === '随机' ? users.find((u) => u.role === 'booking_accompany')?.id ?? '' : patch.case_type === '托运' ? users.find((u) => u.role === 'booking_cargo')?.id ?? '' : '';
        extra.booking_notified = false;
        if (patch.case_type === '随机') { extra.airline_confirmed = '不需要'; extra.driver_needed = '不需要'; extra.final_payment_status = '不适用（随机全款）'; }
        if (patch.case_type === '托运') { extra.airline_confirmed = c.airline_confirmed === '不需要' ? '未订' : c.airline_confirmed; extra.driver_needed = '需要'; if (c.final_payment_status === '不适用（随机全款）') extra.final_payment_status = '尾款未收齐'; }
      }
      patchCase(caseId, { ...patch, ...extra, timeline: r.timeline, current_step_key: r.currentKey });
      const parts: string[] = [];
      if (patch.case_type && patch.case_type !== c.case_type) parts.push(`Case 类型 ${c.case_type} → ${patch.case_type}`);
      if (patch.service_scope && patch.service_scope !== c.service_scope) parts.push(`服务范围 ${c.service_scope} → ${patch.service_scope}`);
      if (patch.final_payment_point && patch.final_payment_point !== c.final_payment_point) parts.push(`收尾款节点 ${c.final_payment_point} → ${patch.final_payment_point}`);
      if (parts.length) {
        log(caseId, actorId, `${parts.join('；')}；已完成步骤保留，其余按新流程重建（共 ${r.timeline.length} 步）`);
        notify(alertTargets(c).filter((id) => id !== actorId).map((to) => ({ to_user_id: to, kind: 'system' as const, title: `Case 流程变更 · ${c.pet_name}`, body: parts.join('；'), case_id: caseId })));
        toast.success(`已更新：${parts.join('；')}`);
      }
      maybeHandToBooking(caseId, actorId);
    },

    createCase: (input, actorId) => {
      const s = get();
      const tpl = s.workflows.find((w) => w.id === input.template_id)!;
      const id = nextId('c');
      const n = s.cases.length + 1;
      const region = AIRPORT_REGION[input.entry_airport] ?? '中国大陆';
      const post = users.find((u) => u.role === 'ops_post' && (u.regions ?? []).includes(region))?.id ?? users.find((u) => u.role === 'ops_post')?.id ?? '';
      const booking = input.case_type === '随机' ? users.find((u) => u.role === 'booking_accompany')?.id ?? '' : input.case_type === '托运' ? users.find((u) => u.role === 'booking_cargo')?.id ?? '' : '';
      const payPoint: FinalPaymentPoint = input.service_scope === '仅订舱' ? '送机前' : '清关后';
      const o = { caseType: input.case_type, scope: input.service_scope, payPoint };
      const timeline = buildTimeline(tpl, o, input.departure_date, '', s.today);
      const so = s.salesOrders.find((x) => x.id === input.sales_order_id);
      const price = so?.price_text.split('/').map((x) => Number(x.replace(/[^\d.]/g, '')) || 0) ?? [0, 0];
      const isAcc = input.case_type === '随机';
      const c: Case = {
        id, file_no: `JM-2026-${String(80 + n).padStart(3, '0')}`, case_type: input.case_type, service_scope: input.service_scope, template_id: tpl.id, archived: false, created_at: s.today, sales_order_id: input.sales_order_id,
        pet_name: input.pet_name, species: input.species, breed: input.breed, birth_date: '', gender: 'F', weight: 0, color: '', chip_no: '', crate_size: '', pet_notes: '',
        foster_start: '', foster_end: '', foster_notes: '', foster_daily: [],
        owner_name: input.owner_name, passport_no: '', owner_phone_cn: '', owner_phone_intl: '', owner_addr_cn: '', owner_addr_intl: '', owner_email: '',
        origin_country: AIRPORT_COUNTRY[input.origin] ?? '加拿大', origin_city: AIRPORT_CITY[input.origin] ?? input.origin, origin: input.origin, entry_airport: input.entry_airport, final_dest: input.final_dest || AIRPORT_CITY[input.entry_airport] || input.entry_airport,
        dest_country: AIRPORT_COUNTRY[input.entry_airport] ?? tpl.dest_country, dest_region: region, route: `${input.origin} → ${input.entry_airport}`, departure_date: input.departure_date, departure_confirmed: false,
        status: '进行中', waiting: '', risk_tags: [], current_step_key: timeline[0].key, timeline, final_payment_point: payPoint,
        files_status: '无', health_cert_issued: '', vacc_rabies_1: '', vacc_rabies_2: '', vacc_combo: '', vacc_blood: '', vacc_notes: '',
        airline_confirmed: isAcc || input.case_type === '仅代办文件' ? '不需要' : '未订', flights: [], flight_change: '', flight_change_note: '', booking_notified: false,
        accompany_needed: false, accompany_person: '', accompany_status: '未订', accompany_notes: '', accompany_notes_updated: '', cabin: '',
        docs_handed_to_owner: false, passport_sent: false, arrived_home: false, home_date: '', driver_needed: input.case_type === '托运' ? '待定' : '不需要',
        order_amount: (price[0] ?? 0) + (price[1] ?? 0), deposit_amount: price[0] ?? 0, final_amount: price[1] ?? 0, currency: so?.currency ?? 'CAD',
        final_payment_status: isAcc ? '不适用（随机全款）' : '尾款未收齐', payment_notes: '',
        sales_handover: so ? `${so.order_status_text}${so.caution ? `；注意：${so.caution}` : ''}` : '', pickup_log: '', foster_log: '', arrival_log: '',
        ops_docs_id: input.ops_docs_id, booking_id: booking, ops_post_id: post, sales_id: input.sales_id || so?.sales_id || '',
      };
      set((st) => ({ cases: [c, ...st.cases], salesOrders: so ? st.salesOrders.map((x) => (x.id === so.id ? { ...x, case_id: id, pet_name: x.pet_name || input.pet_name } : x)) : st.salesOrders }));
      log(id, actorId, `新建 Case（${input.case_type} · ${input.service_scope}），模板「${tpl.name}」，按预计出发日 ${fmtMD(input.departure_date)} 生成 ${timeline.length} 步${so ? `；关联销售接单 ${so.id}（${userName(so.sales_id)}）` : ''}`);
      if (so && so.sales_id !== actorId) notify([{ to_user_id: so.sales_id, kind: 'system', title: `已录单 · ${input.pet_name}`, body: `File No ${c.file_no} 已生成并关联到你的接单`, case_id: id }]);
      toast.success(`已新建 ${c.pet_name}（${c.file_no}）`, { description: `按模板生成 ${timeline.length} 步计划` });
      return id;
    },

    notifyBooking: (caseId, actorId, note) => {
      const c = caseOf(caseId);
      if (!c || !c.booking_id) return;
      patchCase(caseId, { booking_notified: true });
      log(caseId, actorId, `提前通知订舱 ${userName(c.booking_id)}：${note}`);
      notify([{ to_user_id: c.booking_id, kind: 'task', title: `提前订舱 · ${c.pet_name}`, body: `${userName(actorId)}：${note}（${c.route}，预计 ${fmtMD(c.departure_date)}）`, case_id: caseId }]);
      toast.success(`已通知订舱 ${userName(c.booking_id)}`);
    },

    markArrivedHome: (caseId, actorId) => {
      const s = get();
      const c = caseOf(caseId);
      if (!c) return;
      const homeDone = c.timeline.find((t) => t.key === 'home')?.status === '完成';
      const r = homeDone ? { timeline: c.timeline, nextKey: c.current_step_key } : completeStepByKey(c.timeline, 'home', s.today, c.current_step_key, userName(actorId));
      const flightsOk = c.case_type !== '托运' || c.flights.filter((f) => f.status === 'active').every((f) => f.confirmed);
      const patch: Partial<Case> = { arrived_home: true, home_date: c.home_date || s.today, timeline: r.timeline, current_step_key: r.nextKey, airline_confirmed: c.case_type === '托运' ? '已到达' : c.airline_confirmed };
      if (flightsOk) { patch.archived = true; patch.status = '已完成'; patch.timeline = r.timeline.map((t) => ({ ...t, status: '完成', missing_docs: [] })); patch.current_step_key = 'archive'; }
      patchCase(caseId, patch);
      resolveAlerts(caseId);
      log(caseId, actorId, `确认到家${flightsOk ? '，所有航班已确认且已到家 → 自动归档' : ''}`);
      notify(alertTargets(c).filter((id) => id !== actorId).map((to) => ({ to_user_id: to, kind: 'system' as const, title: `已到家 · ${c.pet_name}`, body: `${userName(actorId)} 确认到家${flightsOk ? '，Case 已自动归档' : ''}`, case_id: caseId })));
      toast.success(`${c.pet_name} 已到家${flightsOk ? '，已自动归档' : ''}`);
    },

    addFlight: (caseId, input, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      const f: Flight = { id: nextId('f'), ...input, confirmed: false, status: 'active', note: '', created_at: get().today };
      patchCase(caseId, { flights: [...c.flights, f], airline_confirmed: c.airline_confirmed === '未订' ? '待确认' : c.airline_confirmed });
      log(caseId, actorId, `手动录入航班 ${input.airline} ${input.flight_no} ${fmtMD(input.dep_time.slice(0, 10))}`);
    },
    fillRoute: (caseId, routeId, actorId) => {
      const c = caseOf(caseId);
      const r = get().routes.find((x) => x.id === routeId);
      if (!c || !r) return;
      const dep = c.departure_date;
      const base = { awb: '', confirmed: false, status: 'active' as const, note: '', created_at: get().today };
      const flights: Flight[] = r.type === '直飞'
        ? [{ id: nextId('f'), airline: r.airline, flight_no: r.flight_no, from_code: r.origin, to_code: r.dest, dep_time: `${dep}T${r.dep_time}:00`, arr_time: `${addDays(dep, r.arr_day_offset)}T${r.arr_time}:00`, ...base }]
        : [
          { id: nextId('f'), airline: r.airline, flight_no: r.flight_no, from_code: r.origin, to_code: r.via ?? '', dep_time: `${dep}T${r.dep_time}:00`, arr_time: `${addDays(dep, 1)}T07:00:00`, ...base },
          { id: nextId('f'), airline: r.airline, flight_no: r.second_leg ?? '', from_code: r.via ?? '', to_code: r.dest, dep_time: `${addDays(dep, 1)}T13:00:00`, arr_time: `${addDays(dep, r.arr_day_offset)}T${r.arr_time}:00`, ...base },
        ];
      const kept = c.flights.map((f) => (f.status === 'active' && !f.confirmed ? { ...f, status: 'superseded' as const, note: f.note || '被新航线替换' } : f));
      patchCase(caseId, { flights: [...kept, ...flights], airline_confirmed: ['未订', '查询中'].includes(c.airline_confirmed) ? '待确认' : c.airline_confirmed, route: `${r.origin} → ${r.dest} · ${r.flight_no}${r.type === '中转' ? ` 经 ${r.via}` : ' 直飞'}` });
      log(caseId, actorId, `从航线速查填入 ${r.airline} ${r.flight_no}${r.type === '中转' ? ` 经 ${r.via}` : ''}，航司状态 → 待确认`);
      toast.success(`已填入 ${c.pet_name} 的航班`, { description: `${r.flight_no} ${r.origin} → ${r.dest}` });
    },
    updateFlight: (caseId, flightId, patch, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      patchCase(caseId, { flights: c.flights.map((f) => (f.id === flightId ? { ...f, ...patch } : f)) });
      if (patch.awb !== undefined) log(caseId, actorId, `填写 AWB ${patch.awb}`);
    },
    confirmBooking: (caseId, input, actorId) => {
      const s = get();
      const c = caseOf(caseId);
      if (!c) return;
      const target = c.flights.find((f) => f.id === input.flight_id) ?? c.flights.find((f) => f.status === 'active');
      if (!target) { toast.error('还没有航班记录，先从航线速查填入或手动录入'); return; }
      const flights = c.flights.map((f) => (f.status === 'active' ? { ...f, awb: input.awb || f.awb, confirmed: true } : f));
      const newDep = target.dep_time.slice(0, 10);
      const bookingKey = c.timeline.some((t) => t.key === 'booking') ? 'booking' : 'accompany_booking';
      const r = completeStepByKey(c.timeline, bookingKey, s.today, c.current_step_key, userName(actorId));
      const shifted = newDep !== c.departure_date ? shiftTimeline(r.timeline, templateOf(c), opts(c), newDep, s.today) : r.timeline;
      patchCase(caseId, { flights, airline_confirmed: '已确认', departure_date: newDep, departure_confirmed: true, timeline: shifted, current_step_key: r.nextKey, waiting: c.waiting === '航司' ? '' : c.waiting, risk_tags: c.risk_tags.filter((x) => x !== '时间'), flight_change: '', flight_change_note: '' });
      if (c.sales_order_id) set((st) => ({ salesOrders: st.salesOrders.map((o) => (o.id === c.sales_order_id ? { ...o } : o)) }));
      log(caseId, actorId, `确认订舱：${target.flight_no} ${fmtMD(newDep)}，AWB ${input.awb}，预计出发日期 → 实际出发日期${newDep !== c.departure_date ? `（${fmtMD(c.departure_date)} → ${fmtMD(newDep)}）` : ''}`);
      notify(alertTargets(c).filter((id) => id !== actorId).map((to) => ({ to_user_id: to, kind: 'task' as const, title: `订舱完成 · ${c.pet_name}`, body: `${target.flight_no} ${fmtMD(newDep)}，AWB ${input.awb}；实际出发日期已回写到接单表`, case_id: caseId })));
      toast.success(`${c.pet_name} 订舱已确认`, { description: `AWB ${input.awb}，实际出发日 ${fmtMD(newDep)}` });
    },

    markFlightChange: (caseId, type, newDate, note, actorId) => {
      const s = get();
      const c = caseOf(caseId);
      if (!c) return;
      const old = c.departure_date;
      const items = computeImpact(c, s.tasks, type, newDate || old, s.today);
      const noNew = type === '取消' || !newDate;
      const delta = noNew ? 0 : diffDays(old, newDate);
      const tag = `${fmtMD(s.today)} ${type}${note ? `：${note}` : ''}`;
      // 旧航班保留，只变颜色；有新日期则复制一份新航班（未确认）
      const flights: Flight[] = c.flights.map((f) => (f.status === 'active' ? { ...f, status: type === '取消' ? 'cancelled' as const : 'superseded' as const, confirmed: false, note: tag } : f));
      if (!noNew) c.flights.filter((f) => f.status === 'active').forEach((f) => flights.push({ ...f, id: nextId('f'), status: 'active', confirmed: false, awb: type === '改期' ? f.awb : '', note: type === '暂定新日期' ? '暂定，待航司确认' : '', dep_time: addDays(f.dep_time.slice(0, 10), delta) + f.dep_time.slice(10), arr_time: addDays(f.arr_time.slice(0, 10), delta) + f.arr_time.slice(10), created_at: s.today }));
      const patch: Partial<Case> = {
        flights,
        airline_confirmed: noNew || type === '无仓位' || type === '当天拒载' ? '异常' : '待确认',
        risk_tags: Array.from(new Set([...c.risk_tags, '时间' as const, ...(type === '当天拒载' ? ['健康' as const] : [])])),
        waiting: '航司', departure_confirmed: false,
      };
      if (!noNew) {
        patch.departure_date = newDate;
        patch.timeline = shiftTimeline(c.timeline, templateOf(c), opts(c), newDate, s.today);
        if (c.foster_end && diffDays(c.foster_end, newDate) > 0) patch.foster_end = newDate;
      }
      patchCase(caseId, patch);
      const affected = s.tasks.filter((t) => t.case_id === caseId && isDriverTask(t.type) && !['已完成', '异常', '无法确认'].includes(t.status) && diffDays(s.today, t.date) >= 0);
      set((st) => ({ tasks: st.tasks.map((t) => (affected.some((a) => a.id === t.id) ? { ...t, change_note: `航变（${type}）待改期`, change_acked: false } : t)) }));
      log(caseId, actorId, `标记航变：${type}${newDate ? `，${fmtMD(old)} → ${fmtMD(newDate)}` : ''}${note ? `；${note}` : ''}；旧航班保留为「${type === '取消' ? '已取消' : '已替代'}」`);
      log(caseId, '系统', `航变影响清单（${items.length} 项）：${items.filter((i) => i.level !== 'info').map((i) => i.text).slice(0, 2).join('；') || '无重大影响'}`);
      const flightNo = c.flights.find((f) => f.status === 'active')?.flight_no ?? '';
      const detail = `${flightNo} ${fmtMD(old)}${newDate ? ` → ${fmtMD(newDate)}` : ' 取消'}${note ? `；${note}` : ''}`;
      raiseAlert({ ...c, ...patch } as Case, 'flight_change', `航变 · ${c.pet_name}（${type}）`, detail, actorId, alertTargets(c), true);
      // 司机：站内通知，不发短信
      notify(Array.from(new Set(affected.map((t) => t.assignee_id))).map((to) => ({ to_user_id: to, kind: 'flight_change' as const, title: `航变 · ${c.pet_name}（${type}）`, body: `${detail}；你的任务需改期，请等待新安排`, case_id: caseId })));
      const report: ImpactReport = { case_id: caseId, change_type: type, old_date: old, new_date: newDate || old, items, notified: alertTargets(c), created_at: nowIso(s.today) };
      set({ lastImpact: report });
      toast.warning(`已标记航变：${c.pet_name} ${type}`, { description: `影响清单 ${items.length} 项；已进紧急变动并短信通知 ${alertTargets(c).filter(NON_DRIVER_FINANCE).map(userName).join('、')}` });
    },

    opsFlightChange: (caseId, type, newDate, note, actorId) => {
      const s = get();
      const c = caseOf(caseId);
      if (!c) return;
      const patch: Partial<Case> = { flight_change: type, flight_change_note: note };
      if (type === '本单取消') { patch.status = '已取消'; patch.waiting = ''; }
      else if ((type === '客人要求提前' || type === '客人要求延后') && newDate) {
        patch.departure_date = newDate; patch.departure_confirmed = false;
        patch.timeline = shiftTimeline(c.timeline, templateOf(c), opts(c), newDate, s.today);
        patch.flights = c.flights.map((f) => (f.status === 'active' ? { ...f, confirmed: false, note: `${type}，待订舱重排` } : f));
        if (c.airline_confirmed === '已确认') patch.airline_confirmed = '待确认';
      } else if (type === '本单时间暂定') { patch.departure_confirmed = false; }
      patchCase(caseId, patch);
      log(caseId, actorId, `操作侧航变：${type}${newDate ? `，${fmtMD(c.departure_date)} → ${fmtMD(newDate)}` : ''}${note ? `；${note}` : ''}`);
      const detail = `${type}${newDate ? ` ${fmtMD(c.departure_date)} → ${fmtMD(newDate)}` : ''}${note ? `；${note}` : ''}`;
      raiseAlert({ ...c, ...patch } as Case, 'ops_flight_change', `航变 · ${c.pet_name}（${type}）`, detail, actorId, alertTargets(c), true);
      toast.warning(`已记录：${c.pet_name} ${type}`, { description: '已进紧急变动并短信通知负责人' });
    },

    updateAccompany: (caseId, patch, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      const p: Partial<Case> = { ...patch };
      if (patch.accompany_notes !== undefined && patch.accompany_notes !== c.accompany_notes) p.accompany_notes_updated = get().today;
      patchCase(caseId, p);
      const parts: string[] = [];
      if (patch.accompany_status && patch.accompany_status !== c.accompany_status) parts.push(`随机状态 ${c.accompany_status} → ${patch.accompany_status}`);
      if (patch.accompany_person !== undefined && patch.accompany_person !== c.accompany_person) parts.push(`随机人 → ${patch.accompany_person || '空'}`);
      if (patch.accompany_needed !== undefined && patch.accompany_needed !== c.accompany_needed) parts.push(`${patch.accompany_needed ? '需要' : '不需要'}找随机人`);
      if (patch.cabin !== undefined && patch.cabin !== c.cabin) parts.push(`舱位 → ${patch.cabin || '未定'}`);
      if (patch.accompany_notes !== undefined && patch.accompany_notes !== c.accompany_notes) parts.push('更新随机进度备注');
      if (parts.length) log(caseId, actorId, parts.join('；'));
      if (patch.accompany_status === '已添加宠物位置' && c.accompany_status !== '已添加宠物位置') {
        const s = get();
        const r = completeStepByKey(c.timeline, 'accompany_booking', s.today, c.current_step_key, userName(actorId));
        patchCase(caseId, { timeline: r.timeline, current_step_key: r.nextKey, departure_confirmed: true, waiting: c.waiting === '随机人' ? '' : c.waiting });
        notify(alertTargets(c).filter((id) => id !== actorId).map((to) => ({ to_user_id: to, kind: 'task' as const, title: `随机订舱完成 · ${c.pet_name}`, body: `已添加宠物位置${patch.accompany_person ?? c.accompany_person ? `，随机人 ${patch.accompany_person ?? c.accompany_person}` : ''}`, case_id: caseId })));
      }
    },
    markAccompanyException: (caseId, type, note, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      patchCase(caseId, { accompany_status: '异常', accompany_notes: `${fmtMD(get().today)} ${type}：${note}`, accompany_notes_updated: get().today, departure_confirmed: false, risk_tags: Array.from(new Set([...c.risk_tags, '时间' as const])) });
      log(caseId, actorId, `随机异常：${type}，${note}`);
      raiseAlert(c, 'accompany_exception', `随机异常 · ${c.pet_name}（${type}）`, note || type, actorId, alertTargets(c), true);
      toast.warning(`已记录随机异常：${c.pet_name}`, { description: '已进紧急变动并短信通知负责人' });
    },

    createTask: (input, actorId) => {
      const s = get();
      const c = caseOf(input.case_id);
      const driver = isDriverTask(input.type);
      const task: Task = { id: nextId('t'), ...input, status: driver ? '待确认' : '已确认', decline_reason: '', exception_reason: '', exception_note: '', created_by: actorId, reminded: [], change_note: '', change_acked: true };
      const { tasks: withReminder, notifications } = generateReminders([task], s.cases, s.today, nowIso(s.today), () => nextId('n'));
      set((st) => ({ tasks: [...st.tasks, withReminder[0]], notifications: [...notifications, ...st.notifications] }));
      log(input.case_id, actorId, `创建任务：${input.type} ${fmtMD(input.date)} ${input.time_start}${input.time_end ? `–${input.time_end}` : ''}，指派 ${userName(input.assignee_id)}${input.pickup_addr ? `（${input.pickup_addr} → ${input.dest_addr}）` : ''}`);
      if (input.assignee_id !== actorId) notify([{ to_user_id: input.assignee_id, kind: 'task', title: `新任务 · ${input.type}`, body: `${fmtMD(input.date)} ${input.time_start} ${c?.pet_name ?? ''}（${c?.file_no ?? ''}）${input.pickup_addr ? `，${input.pickup_addr} → ${input.dest_addr}` : ''}${driver ? '；请确认能否执行' : ''}`, case_id: input.case_id, task_id: task.id }]);
      notifications.filter((n) => n.to_user_id === s.currentUserId).forEach((n) => toast(n.title, { description: n.body }));
      const d = diffDays(s.today, input.date);
      toast.success(`已创建任务并指派给 ${userName(input.assignee_id)}`, { description: d > 2 ? `${d} 天后执行；临 48h / 24h / 当天会自动提醒` : '已触发提醒' });
    },

    updateTask: (taskId, patch, reason, actorId) => {
      const s = get();
      const t = s.tasks.find((x) => x.id === taskId);
      const c = t && caseOf(t.case_id);
      if (!t || !c) return;
      const changes: string[] = [];
      if (patch.date && patch.date !== t.date) changes.push(`日期 ${fmtMD(t.date)} → ${fmtMD(patch.date)}`);
      if (patch.time_start && patch.time_start !== t.time_start) changes.push(`时间 ${t.time_start} → ${patch.time_start}`);
      if (patch.pickup_addr !== undefined && patch.pickup_addr !== t.pickup_addr) changes.push(`提货地址 → ${patch.pickup_addr}`);
      if (patch.dest_addr !== undefined && patch.dest_addr !== t.dest_addr) changes.push(`目的地址 → ${patch.dest_addr}`);
      if (patch.assignee_id && patch.assignee_id !== t.assignee_id) changes.push(`司机 ${userName(t.assignee_id)} → ${userName(patch.assignee_id)}`);
      if (patch.notes !== undefined && patch.notes !== t.notes) changes.push('备注已更新');
      const note = `${fmtMD(s.today)} ${userName(actorId)}：${changes.join('，')}${reason ? `（${reason}）` : ''}`;
      set((st) => ({ tasks: st.tasks.map((x) => (x.id === taskId ? { ...x, ...patch, change_note: changes.length ? note : x.change_note, change_acked: changes.length ? false : x.change_acked, status: x.status === '无法确认' ? '待确认' : x.status } : x)) }));
      if (!changes.length) return;
      log(c.id, actorId, `修改任务「${t.type} ${fmtMD(t.date)}」：${changes.join('，')}${reason ? `；原因：${reason}` : ''}`);
      const driverId = patch.assignee_id ?? t.assignee_id;
      raiseAlert(c, 'task_change', `任务变动 · ${c.pet_name} ${t.type}`, `${changes.join('，')}${reason ? `；${reason}` : ''}，司机需确认已看到`, actorId, Array.from(new Set([driverId, ...adminIds(), c.ops_docs_id])), false);
      toast.success('任务已修改，已同步到司机的紧急变动');
    },

    updateTaskStatus: (taskId, status, actorId) => {
      const s = get();
      const t = s.tasks.find((x) => x.id === taskId);
      const c = t && caseOf(t.case_id);
      if (!t || !c) return;
      set((st) => ({ tasks: st.tasks.map((x) => (x.id === taskId ? { ...x, status, decline_reason: status === '已确认' ? '' : x.decline_reason, completed_at: status === '已完成' ? nowIso(s.today) : x.completed_at } : x)) }));
      log(c.id, actorId, `任务「${t.type} ${fmtMD(t.date)}」状态 → ${status}`);
      if (status === '已确认' && isDriverTask(t.type)) {
        notify(Array.from(new Set([...adminIds(), c.ops_docs_id])).filter((id) => id !== actorId).map((to) => ({ to_user_id: to, kind: 'task' as const, title: `司机已确认 · ${c.pet_name} ${t.type}`, body: `${userName(actorId)} 已确认 ${fmtMD(t.date)} ${t.time_start} 的任务`, case_id: c.id, task_id: t.id })));
      }
      if (status === '已完成') {
        const patch: Partial<Case> = {};
        let stepKey: string | null = null;
        if (t.type === '送机') { stepKey = 'driver_airport'; if (['已确认'].includes(c.airline_confirmed)) patch.airline_confirmed = '已起飞'; }
        if (t.type === 'CFIA 盖章') { const st = c.timeline.find((x) => x.key === 'stamp'); const hasAtt = s.attachments.some((a) => a.case_id === c.id && a.category === 'step' && a.step_key === 'stamp'); if (st && (!st.required_docs.length || hasAtt)) stepKey = 'stamp'; }
        if (t.type === '接回寄养') { patch.pickup_log = `${c.pickup_log ? c.pickup_log + '\n' : ''}${fmtMD(s.today)} ${userName(actorId)} 接回寄养完成（${t.pickup_addr} → ${t.dest_addr}）`; if (!c.foster_start) patch.foster_start = s.today; }
        if (t.type === '接机') { patch.arrival_log = `${c.arrival_log ? c.arrival_log + '\n' : ''}${fmtMD(s.today)} ${userName(actorId)} 接机完成（${t.pickup_addr} → ${t.dest_addr}）`; }
        if (stepKey) { const r = completeStepByKey(c.timeline, stepKey, s.today, c.current_step_key, userName(actorId)); patch.timeline = r.timeline; patch.current_step_key = r.nextKey; if (stepKey === 'stamp') patch.files_status = '已盖章'; }
        patchCase(c.id, patch);
        if (stepKey) log(c.id, '系统', `${userName(actorId)}完成「${t.type}」，步骤「${c.timeline.find((x) => x.key === stepKey)?.label}」自动完成`);
        if (t.type === 'CFIA 盖章' && !stepKey) notify([c.ops_docs_id].map((to) => ({ to_user_id: to, kind: 'task' as const, title: `盖章任务完成 · ${c.pet_name}`, body: '司机已完成 CFIA 盖章，请上传盖章后的健康证并标记步骤完成', case_id: c.id, task_id: t.id })));
        notify(Array.from(new Set([...adminIds(), c.ops_docs_id, c.ops_post_id])).filter((id) => id !== actorId).map((to) => ({ to_user_id: to, kind: 'task' as const, title: `任务完成 · ${c.pet_name} ${t.type}`, body: `${userName(actorId)} 已完成 ${fmtMD(t.date)} ${t.type}`, case_id: c.id, task_id: t.id })));
      }
    },
    driverDecline: (taskId, reason, actorId) => {
      const t = get().tasks.find((x) => x.id === taskId);
      const c = t && caseOf(t.case_id);
      if (!t || !c) return;
      set((st) => ({ tasks: st.tasks.map((x) => (x.id === taskId ? { ...x, status: '无法确认', decline_reason: reason } : x)) }));
      log(c.id, actorId, `司机无法确认任务「${t.type} ${fmtMD(t.date)}」：${reason}`);
      raiseAlert(c, 'driver_decline', `司机无法确认 · ${c.pet_name} ${t.type}`, `${userName(actorId)}：${reason}（${fmtMD(t.date)} ${t.time_start}），需重新安排`, actorId, Array.from(new Set([...adminIds(), c.ops_docs_id, c.sales_id])), true);
      toast.warning('已提交，运营会重新安排');
    },
    reportException: (taskId, reason, note, actorId) => {
      const t = get().tasks.find((x) => x.id === taskId);
      const c = t && caseOf(t.case_id);
      if (!t || !c) return;
      set((st) => ({ tasks: st.tasks.map((x) => (x.id === taskId ? { ...x, status: '异常', exception_reason: reason, exception_note: note } : x)) }));
      log(c.id, actorId, `任务「${t.type} ${fmtMD(t.date)}」上报异常：${reason}${note ? `，${note}` : ''}`);
      raiseAlert(c, 'driver_exception', `司机异常 · ${c.pet_name} ${t.type}`, `${userName(actorId)}：${reason}${note ? `，${note}` : ''}`, actorId, Array.from(new Set([...adminIds(), c.ops_docs_id, c.sales_id])), true);
      toast.warning('异常已上报，已短信通知管理员和负责人');
    },
    ackTaskChange: (taskId, actorId) => {
      const t = get().tasks.find((x) => x.id === taskId);
      if (!t) return;
      set((st) => ({ tasks: st.tasks.map((x) => (x.id === taskId ? { ...x, change_acked: true } : x)) }));
      const related = get().alerts.filter((a) => a.case_id === t.case_id && a.kind === 'task_change' && a.targets.includes(actorId) && !a.confirmations[actorId]);
      related.forEach((a) => get().confirmAlert(a.id, actorId));
      log(t.case_id, actorId, `司机确认已看到任务变动：${t.change_note}`);
    },

    confirmAlert: (alertId, userId) => {
      const a = get().alerts.find((x) => x.id === alertId);
      if (!a) return;
      set((st) => ({ alerts: st.alerts.map((x) => (x.id === alertId ? { ...x, confirmations: { ...x.confirmations, [userId]: nowIso(get().today) } } : x)) }));
      log(a.case_id, userId, `确认紧急变动「${a.title}」已看见并处理`);
      const remaining = a.targets.filter((id) => id !== userId && !a.confirmations[id]);
      if (!remaining.length) notify(adminIds().map((to) => ({ to_user_id: to, kind: 'system' as const, title: `紧急变动全部确认 · ${a.title}`, body: '所有相关人已确认', case_id: a.case_id, alert_id: a.id })));
    },

    createSalesOrder: (input, actorId) => {
      const id = nextId('so');
      const o: SalesOrder = { id, created_at: get().today, case_id: '', ...input };
      set((st) => ({ salesOrders: [o, ...st.salesOrders] }));
      notify(users.filter((u) => u.role === 'ops_docs' || u.role === 'admin').map((u) => ({ to_user_id: u.id, kind: 'system' as const, title: `新接单 · ${input.pet_name || input.owner_wechat_name}`, body: `${userName(actorId)}：${input.origin_text}，${input.price_text} ${input.currency}；请录单建 Case` })));
      toast.success('接单已保存', { description: '操作部录单后会自动关联 File No 和实际出发日期' });
      return id;
    },
    updateSalesOrder: (id, patch, actorId) => {
      const o = get().salesOrders.find((x) => x.id === id);
      if (!o) return;
      set((st) => ({ salesOrders: st.salesOrders.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      if (patch.case_id && patch.case_id !== o.case_id) {
        const c = caseOf(patch.case_id);
        if (c) { patchCase(c.id, { sales_order_id: id, sales_id: o.sales_id }); log(c.id, actorId, `关联销售接单 ${id}（${userName(o.sales_id)}）`); }
      }
    },

    markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    markAllRead: (userId) => set((s) => ({ notifications: s.notifications.map((n) => (n.to_user_id === userId ? { ...n, read: true } : n)) })),

    togglePermission: (role, section, field) => set((s) => {
      const cur = s.permissions[role][section];
      const next = { ...cur, [field]: !cur[field] };
      if (field === 'view' && !next.view) next.edit = false;
      if (field === 'edit' && next.edit) next.view = true;
      return { permissions: { ...s.permissions, [role]: { ...s.permissions[role], [section]: next } } as PermissionMatrix };
    }),
    updateRoute: (id, patch) => set((s) => ({ routes: s.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    addFosterDaily: (caseId, note, actorId) => {
      const c = caseOf(caseId);
      if (!c) return;
      patchCase(caseId, { foster_daily: [...c.foster_daily, { date: get().today, note, by: userName(actorId) }] });
      log(caseId, actorId, `寄养日常：${note}`);
    },
  };
});

// 开发态暴露 store，便于自动化冒烟测试读取状态
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') (window as unknown as { __jmaxpetStore?: typeof useAppStore }).__jmaxpetStore = useAppStore;

export const useCurrentUser = () => useAppStore((s) => (s.currentUserId ? userById(s.currentUserId) : undefined));
export type { WorkflowTemplate, Route, AccompanyStatus };
