import type { Case } from '@/types';
import { diffDays } from '@/lib/dates';

export type BucketKey = 'urgent' | 'today' | 'tomorrow' | 'week' | 'departing' | 'waiting' | 'risk';

export const BUCKETS: { key: BucketKey; label: string; color: string; hint: string }[] = [
  { key: 'urgent', label: '紧急', color: 'var(--bucket-urgent)', hint: '优先级 = 紧急' },
  { key: 'today', label: '今天必须做', color: 'var(--bucket-today)', hint: '优先级 = 今天做，或截止日 = 今天' },
  { key: 'tomorrow', label: '明天', color: 'var(--bucket-tomorrow)', hint: '优先级 = 明天做，或截止日 = 明天' },
  { key: 'week', label: '未来 7 天', color: 'var(--bucket-week)', hint: '优先级 = 未来 7 天，或截止日在 7 天内' },
  { key: 'departing', label: '即将出发', color: 'var(--bucket-departing)', hint: '出发日在 5 天内' },
  { key: 'waiting', label: '谁在等我', color: 'var(--bucket-waiting)', hint: '正在等 主人 / 医院 / 文件 / 航司 …' },
  { key: 'risk', label: '风险 Case', color: 'var(--bucket-risk)', hint: '带风险标签' },
];

export function bucketize(cases: Case[], today: string): Record<BucketKey, Case[]> {
  const out: Record<BucketKey, Case[]> = { urgent: [], today: [], tomorrow: [], week: [], departing: [], waiting: [], risk: [] };
  for (const c of cases) {
    if (c.archived) continue;
    const dl = c.deadline ? diffDays(today, c.deadline) : NaN;
    const dep = diffDays(today, c.departure_date);
    if (c.priority === '紧急') out.urgent.push(c);
    if (c.priority === '今天做' || (dl === 0 && !['紧急', '即将出发'].includes(c.priority))) out.today.push(c);
    if (c.priority === '明天做' || (dl === 1 && !['紧急', '即将出发', '今天做'].includes(c.priority))) out.tomorrow.push(c);
    if (c.priority === '未来 7 天' || (dl >= 2 && dl <= 7 && ['未来 14 天', '未来 30 天', '待定'].includes(c.priority))) out.week.push(c);
    if ((dep >= 0 && dep <= 5 && c.airline_confirmed !== '已到达') || (c.priority === '即将出发' && !['已到达'].includes(c.airline_confirmed))) out.departing.push(c);
    if (c.waiting) out.waiting.push(c);
    if (c.risk_tags.length) out.risk.push(c);
  }
  const order = (a: Case, b: Case) => (a.deadline || '9').localeCompare(b.deadline || '9') || a.departure_date.localeCompare(b.departure_date);
  (Object.keys(out) as BucketKey[]).forEach((k) => out[k].sort(order));
  return out;
}

/** 近一周航班 */
export function upcomingFlights(cases: Case[], today: string) {
  return cases
    .filter((c) => !c.archived && c.flights.length && diffDays(today, c.departure_date) >= -1 && diffDays(today, c.departure_date) <= 7)
    .map((c) => ({ c, flight: c.flights[0], days: diffDays(today, c.departure_date) }))
    .sort((a, b) => a.c.departure_date.localeCompare(b.c.departure_date));
}

export const AIRLINE_STATUS_COLOR: Record<string, string> = {
  未订: '#8f8f8f', 查询中: '#d2ac72', 待确认: '#f1cb77', 已确认: '#7fa88b', 已改期: '#e03939', 已取消: '#e03939', 已起飞: '#2b5672', 已到达: '#5b7fa6', 不需要: '#c9c3d6',
};
export const PRIORITY_COLOR: Record<string, string> = {
  紧急: '#a2675b', 今天做: '#d2ac72', 明天做: '#f1cb77', '未来 7 天': '#cbb2a6', '未来 14 天': '#cbc7b5', '未来 30 天': '#cbc7b5', 即将出发: '#2b5672', 暂缓: '#c9c3d6', 待定: '#8f8f8f',
};
export const STEP_STATUS_COLOR: Record<string, string> = { 未开始: '#e2e2e2', 进行中: '#d2ac72', 完成: '#7fa88b', 延误: '#e03939' };
export const TASK_STATUS_COLOR: Record<string, string> = { 待开始: '#8f8f8f', 已出发: '#d2ac72', 已接到: '#f1cb77', 已到医院: '#5b7fa6', 已完成: '#7fa88b', 异常: '#e03939' };
