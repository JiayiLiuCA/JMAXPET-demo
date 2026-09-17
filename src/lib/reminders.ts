import type { Case, Notification, Task } from '@/types';
import { diffDays, fmtDate } from '@/lib/dates';

type Window = '48h' | '24h' | 'today';
const LABEL: Record<Window, string> = { '48h': '48 小时提醒', '24h': '24 小时提醒', today: '当天提醒' };

/**
 * 拨动"当前日期"后，按 48h / 24h / 当天 规则生成提醒。
 * 只发最贴近的窗口（同一任务不重复），并把更宽的窗口一并标记为已提醒。
 */
export function generateReminders(tasks: Task[], cases: Case[], today: string, nowIso: string, nextId: () => string): { tasks: Task[]; notifications: Notification[] } {
  const notifications: Notification[] = [];
  const updated = tasks.map((t) => {
    if (['已完成', '异常'].includes(t.status)) return t;
    const d = diffDays(today, t.date);
    let win: Window | null = null;
    if (d === 0) win = 'today';
    else if (d === 1) win = '24h';
    else if (d === 2) win = '48h';
    if (!win || t.reminded.includes(win)) return t;
    const c = cases.find((x) => x.id === t.case_id);
    const when = win === 'today' ? `今天 ${t.time_start}` : `${fmtDate(t.date)} ${t.time_start}`;
    notifications.push({
      id: nextId(),
      to_user_id: t.assignee_id,
      kind: 'reminder',
      title: `${LABEL[win]} · ${t.type}`,
      body: `${when} ${c?.pet_name ?? ''}（${c?.file_no ?? ''}）${t.type}${t.pickup_addr ? `，${t.pickup_addr} → ${t.dest_addr}` : ''}`,
      case_id: t.case_id,
      task_id: t.id,
      created_at: nowIso,
      read: false,
    });
    const looser: Window[] = win === 'today' ? ['48h', '24h', 'today'] : win === '24h' ? ['48h', '24h'] : ['48h'];
    return { ...t, reminded: Array.from(new Set([...t.reminded, ...looser])) };
  });
  return { tasks: updated, notifications };
}
