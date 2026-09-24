import type { Case, RoleKey, Task } from '@/types';
import { addDays, diffDays, fmtMD, weekIndex } from '@/lib/dates';
import { isDriverTask } from '@/lib/permissions';
import { stageOf } from '@/lib/workflow';

/**
 * 今日总控：近 7 天待办（今天起往后 7 天）+ 近 3 周待办（按实际星期：本周 / 下周 / 下下周）。
 * 每个角色看到的桶不一样。
 */
export type BucketKey = 'departing7' | 'pickups7' | 'payment7' | 'arriving7' | 'passport7' | 'week0' | 'week1' | 'week2' | 'hospital3w' | 'pickup3w' | 'payment3w';
export type BucketWindow = '7d' | '3w';

export interface BucketDef { key: BucketKey; label: string; hint: string; color: string; window: BucketWindow }
export interface BucketItem { c: Case; task?: Task; when: string; note: string }

export const BUCKET_DEFS: Record<BucketKey, BucketDef> = {
  departing7: { key: 'departing7', label: '即将出发', hint: '出发日在今天起 7 天内', color: '#2b5672', window: '7d' },
  pickups7: { key: 'pickups7', label: '接送', hint: '7 天内的司机任务', color: '#7fa88b', window: '7d' },
  payment7: { key: 'payment7', label: '需收款', hint: '收尾款节点已到 / 7 天内到，尾款未收齐', color: '#d2ac72', window: '7d' },
  arriving7: { key: 'arriving7', label: '即将到达', hint: '7 天内落地，或已落地未到家', color: '#5b7fa6', window: '7d' },
  passport7: { key: 'passport7', label: '需寄护照', hint: '已出发，护照 / 清关文件还没寄', color: '#a2675b', window: '7d' },
  week0: { key: 'week0', label: '本周出发', hint: '', color: '#2b5672', window: '3w' },
  week1: { key: 'week1', label: '下周出发', hint: '', color: '#5b7fa6', window: '3w' },
  week2: { key: 'week2', label: '下下周出发', hint: '', color: '#8fa3bf', window: '3w' },
  hospital3w: { key: 'hospital3w', label: '需约医院', hint: '健康证 / 检疫证计划日期在 3 周内，还没办', color: '#c97b84', window: '3w' },
  pickup3w: { key: 'pickup3w', label: '需安排接送', hint: '3 周内出发或入寄养，还没排司机', color: '#cbb2a6', window: '3w' },
  payment3w: { key: 'payment3w', label: '需收款', hint: '3 周内到收尾款节点', color: '#d2ac72', window: '3w' },
};

export const ROLE_BUCKETS: Partial<Record<RoleKey, BucketKey[]>> = {
  admin: ['departing7', 'pickups7', 'payment7', 'arriving7', 'week0', 'week1', 'week2', 'hospital3w', 'pickup3w'],
  ops_docs: ['departing7', 'pickups7', 'payment7', 'arriving7', 'week0', 'week1', 'week2', 'hospital3w', 'pickup3w'],
  booking_cargo: ['departing7', 'week0', 'week1', 'week2'],
  ops_post: ['departing7', 'payment7', 'passport7', 'arriving7', 'week0', 'week1', 'week2', 'payment3w'],
};

const CERT_KEYS = ['health_cert', 'quarantine_cert'];
const departed = (c: Case) => ['出发', '到达', '完成'].includes(stageOf(c));
const finalPayPending = (c: Case) => c.case_type !== '随机' && !['已收齐全部尾款', '不适用（随机全款）'].includes(c.final_payment_status);
export const arrivalDate = (c: Case) => {
  const active = c.flights.filter((f) => f.status === 'active');
  const last = active[active.length - 1];
  return last ? last.arr_time.slice(0, 10) : c.departure_date ? addDays(c.departure_date, 1) : '';
};

export function computeBuckets(cases: Case[], tasks: Task[], today: string, keys: BucketKey[]): Record<BucketKey, BucketItem[]> {
  const out = Object.fromEntries(keys.map((k) => [k, [] as BucketItem[]])) as Record<BucketKey, BucketItem[]>;
  const active = cases.filter((c) => !c.archived && c.status === '进行中');
  const in7 = (d: string) => !!d && diffDays(today, d) >= 0 && diffDays(today, d) <= 7;
  const wk = (d: string) => (d ? weekIndex(today, d) : NaN);
  const has = (k: BucketKey) => keys.includes(k);
  const push = (k: BucketKey, item: BucketItem) => { if (has(k)) out[k].push(item); };

  for (const c of active) {
    const dep = c.departure_date;
    const arr = arrivalDate(c);
    // 7 天
    if (in7(dep) && !departed(c)) push('departing7', { c, when: dep, note: c.departure_confirmed ? '实际出发日' : '预计出发日，未确认' });
    const payStep = c.timeline.find((t) => t.key === 'final_payment');
    if (payStep && payStep.status !== '完成' && finalPayPending(c) && diffDays(today, payStep.planned_date) <= 7) {
      push('payment7', { c, when: payStep.planned_date, note: `${c.final_payment_status} · ${c.final_payment_point}收 ${c.final_amount} ${c.currency}` });
    }
    if (!c.arrived_home && departed(c) && (in7(arr) || diffDays(today, arr) < 0)) push('arriving7', { c, when: arr, note: diffDays(today, arr) < 0 ? '已落地，未到家' : '落地日' });
    else if (!c.arrived_home && !departed(c) && in7(arr) && in7(dep)) push('arriving7', { c, when: arr, note: '出发后落地' });
    if (departed(c) && !c.arrived_home && !c.passport_sent && c.case_type === '托运') push('passport7', { c, when: dep, note: '护照 / 清关文件未寄' });
    // 3 周
    const w = wk(dep);
    if (!departed(c)) {
      if (w === 0) push('week0', { c, when: dep, note: c.departure_confirmed ? '实际出发日' : '预计出发日' });
      if (w === 1) push('week1', { c, when: dep, note: c.departure_confirmed ? '实际出发日' : '预计出发日' });
      if (w === 2) push('week2', { c, when: dep, note: c.departure_confirmed ? '实际出发日' : '预计出发日' });
    }
    const cert = c.timeline.find((t) => CERT_KEYS.includes(t.key));
    if (cert && cert.status !== '完成') {
      const cw = wk(cert.planned_date);
      const booked = tasks.some((t) => t.case_id === c.id && ['约医院', '接去医院送回', '接去医院送寄养'].includes(t.type) && t.status !== '异常' && diffDays(today, t.date) >= 0);
      if (cw >= 0 && cw <= 2 && !booked) push('hospital3w', { c, when: cert.planned_date, note: `${cert.label} 计划 ${fmtMD(cert.planned_date)}，还没约` });
      else if (cw < 0 && !booked) push('hospital3w', { c, when: cert.planned_date, note: `${cert.label} 已逾期，还没约` });
    }
    if (c.driver_needed === '需要' && !departed(c) && w >= 0 && w <= 2) {
      const airportTask = tasks.some((t) => t.case_id === c.id && t.type === '送机' && t.status !== '无法确认');
      if (!airportTask) push('pickup3w', { c, when: dep, note: `${fmtMD(dep)} 出发，还没排送机` });
      else if (c.foster_start && wk(c.foster_start) >= 0 && !tasks.some((t) => t.case_id === c.id && t.type === '接回寄养')) push('pickup3w', { c, when: c.foster_start, note: `${fmtMD(c.foster_start)} 入寄养，还没排接宠` });
    }
    if (payStep && payStep.status !== '完成' && finalPayPending(c) && wk(payStep.planned_date) >= 0 && wk(payStep.planned_date) <= 2) push('payment3w', { c, when: payStep.planned_date, note: `${c.final_payment_point}收尾款` });
  }
  if (has('pickups7')) {
    tasks.filter((t) => isDriverTask(t.type) && !['已完成', '无法确认'].includes(t.status) && in7(t.date)).forEach((t) => {
      const c = active.find((x) => x.id === t.case_id);
      if (c) out.pickups7.push({ c, task: t, when: t.date, note: `${t.type} ${t.time_start}` });
    });
  }
  (Object.keys(out) as BucketKey[]).forEach((k) => out[k].sort((a, b) => a.when.localeCompare(b.when) || a.c.departure_date.localeCompare(b.c.departure_date)));
  return out;
}

/** 近一周航班 */
export function upcomingFlights(cases: Case[], today: string) {
  return cases
    .filter((c) => !c.archived && c.flights.some((f) => f.status === 'active') && diffDays(today, c.departure_date) >= -1 && diffDays(today, c.departure_date) <= 7)
    .map((c) => ({ c, flights: c.flights.filter((f) => f.status === 'active'), days: diffDays(today, c.departure_date) }))
    .sort((a, b) => a.c.departure_date.localeCompare(b.c.departure_date));
}

export const AIRLINE_STATUS_COLOR: Record<string, string> = {
  未订: '#8f8f8f', 查询中: '#d2ac72', 待确认: '#f1cb77', 已确认: '#7fa88b', 异常: '#e03939', 已起飞: '#2b5672', 已到达: '#5b7fa6', 不需要: '#c9c3d6',
};
export const ACCOMPANY_STATUS_COLOR: Record<string, string> = {
  未订: '#8f8f8f', 正在查询: '#d2ac72', 待主人确认: '#f1cb77', 待航司确认: '#cbb2a6', 已添加宠物位置: '#7fa88b', 异常: '#e03939',
};
export const STAGE_COLOR: Record<string, string> = { 新建: '#8f8f8f', 办理文件: '#c9c3d6', 待订舱: '#d2ac72', '健康证 / 盖章': '#5b7fa6', 出发: '#2b5672', 到达: '#7fa88b', 完成: '#7fa88b', 已取消: '#e03939' };
export const STEP_STATUS_COLOR: Record<string, string> = { 未开始: '#e2e2e2', 进行中: '#d2ac72', 完成: '#7fa88b', 延误: '#e03939' };
export const TASK_STATUS_COLOR: Record<string, string> = { 待确认: '#8f8f8f', 已确认: '#7fa88b', 无法确认: '#e03939', 已出发: '#d2ac72', 已接到: '#f1cb77', 已完成: '#5b7fa6', 异常: '#e03939' };
export const TASK_TYPE_COLOR: Record<string, string> = { 接回寄养: '#7fa88b', 接去医院送回: '#5b7fa6', 接去医院送寄养: '#5b7fa6', 仅接送: '#cbb2a6', 送机: '#2b5672', 接机: '#2b5672', 'CFIA 盖章': '#d2ac72', 约医院: '#c97b84', 等待: '#c9c3d6', 办文件: '#c9c3d6' };
export const CASE_TYPE_COLOR: Record<string, string> = { 托运: '#2b5672', 随机: '#7a8fc9', 仅代办文件: '#c9a86a' };
