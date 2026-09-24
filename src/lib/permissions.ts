import type { Attachment, Case, PageKey, PermissionMatrix, RoleKey, SectionKey, SectionPerm, Task, User } from '@/types';
import { roles, SECTION_META } from '@/data/roles';
import { users, usersByRole } from '@/data/users';
import { DRIVER_TASK_TYPES } from '@/data/options';

export const roleOf = (user: User) => roles[user.role];

export const canViewPage = (user: User | undefined, page: PageKey) => !!user && roles[user.role].pages.includes(page);

export const sectionPerm = (matrix: PermissionMatrix, role: RoleKey, section: SectionKey): SectionPerm => matrix[role]?.[section] ?? { view: false, edit: false };

/** 需要订舱动作的状态 */
export const BOOKING_PENDING = ['未订', '查询中', '待确认', '异常'] as const;

/** 该用户在可见范围内的 Case（含归档，调用方自行过滤） */
export function scopedCases(cases: Case[], tasks: Task[], user: User): Case[] {
  switch (roles[user.role].scope) {
    case 'all': return cases;
    case 'assigned_docs': return cases.filter((c) => c.ops_docs_id === user.id);
    case 'booking_cargo': return cases.filter((c) => c.case_type === '托运' && c.booking_id === user.id && c.booking_notified);
    case 'booking_accompany': return cases.filter((c) => c.case_type === '随机' && c.booking_id === user.id);
    case 'post_regions': return cases.filter((c) => (user.regions ?? []).includes(c.dest_region));
    case 'driver': {
      const ids = new Set(tasks.filter((t) => t.assignee_id === user.id).map((t) => t.case_id));
      return cases.filter((c) => ids.has(c.id));
    }
    default: return [];
  }
}

/** 当前用户可见的进行中 Case */
export const visibleCases = (cases: Case[], tasks: Task[], user: User) => scopedCases(cases, tasks, user).filter((c) => !c.archived);

/** 能否打开 Case 详情页 */
export function canOpenCase(c: Case, cases: Case[], tasks: Task[], user: User) {
  if (user.role === 'driver' || user.role === 'sales') return false;
  return scopedCases(cases, tasks, user).some((x) => x.id === c.id);
}

/** 分区负责人 */
export function sectionOwner(c: Case, section: SectionKey): User | undefined {
  const meta = SECTION_META.find((s) => s.key === section);
  switch (meta?.owner) {
    case 'ops_docs': return users.find((u) => u.id === c.ops_docs_id);
    case 'booking': return users.find((u) => u.id === c.booking_id);
    case 'ops_post': return users.find((u) => u.id === c.ops_post_id);
    default: return users.find((u) => u.role === 'admin');
  }
}

/** Case 的负责人（不含司机、财务） */
export const responsibles = (c: Case) => Array.from(new Set([c.ops_docs_id, c.booking_id, c.ops_post_id, c.sales_id].filter(Boolean)));
/** 紧急事件确认 / 短信对象：管理员 + 所有负责人 + 接单销售 */
export const alertTargets = (c: Case) => Array.from(new Set([...usersByRole('admin').map((u) => u.id), ...responsibles(c)]));
/** 航变通知对象：除司机、财务以外所有相关同事 + 接单销售 */
export const flightChangeTargets = (c: Case) => alertTargets(c);

export const isDriverTask = (type: Task['type']) => (DRIVER_TASK_TYPES as readonly string[]).includes(type);

export type Progress = { label: '已完成' | '进行中' | '未开始'; detail: string };

/** 无权限时展示的进度摘要 */
export function sectionProgress(c: Case, tasks: Task[], section: SectionKey, attachments: Attachment[] = []): Progress {
  const stepDone = (keys: string[]) => c.timeline.filter((s) => keys.includes(s.key)).every((s) => s.status === '完成');
  switch (section) {
    case 'pet':
      return { label: c.chip_no ? '已完成' : '进行中', detail: c.foster_start ? `寄养 ${c.foster_start} ~ ${c.foster_end}` : '基础信息已录入' };
    case 'owner':
      return { label: c.passport_no ? '已完成' : '进行中', detail: '护照 / 联系方式已录入' };
    case 'route':
      return { label: '已完成', detail: c.route };
    case 'docs': {
      const steps = c.timeline.filter((s) => s.owner_role === 'ops_docs' && !['driver_airport', 'remind_checkin', 'handover_docs'].includes(s.key));
      const done = steps.filter((s) => s.status === '完成').length;
      const cur = steps.find((s) => s.status !== '完成');
      const files = attachments.filter((a) => a.case_id === c.id).length;
      return { label: done === steps.length ? '已完成' : done ? '进行中' : '未开始', detail: `${done}/${steps.length} 步 · ${files} 个附件${cur ? ` · 当前：${cur.label}` : ''}` };
    }
    case 'flight': {
      if (c.case_type === '随机') return { label: c.accompany_status === '已添加宠物位置' ? '已完成' : c.accompany_status === '未订' ? '未开始' : '进行中', detail: `随机状态 ${c.accompany_status}${c.accompany_person ? ` · ${c.accompany_person}` : ''}` };
      const ok = ['已确认', '已起飞', '已到达', '不需要'].includes(c.airline_confirmed);
      const f = c.flights.find((x) => x.status === 'active');
      return { label: ok ? '已完成' : c.airline_confirmed === '未订' ? '未开始' : '进行中', detail: `航司状态 ${c.airline_confirmed}${f ? ` · ${f.flight_no}` : ''}` };
    }
    case 'payment': {
      const ok = ['已收齐全部尾款', '不适用（随机全款）'].includes(c.final_payment_status);
      return { label: ok ? '已完成' : c.deposit_amount ? '进行中' : '未开始', detail: `${c.final_payment_status} · 定金 ${c.deposit_amount} ${c.currency}` };
    }
    case 'log':
      return { label: '进行中', detail: '销售交接 · 内部备注 · 操作日志' };
    case 'driver': {
      const ts = tasks.filter((t) => t.case_id === c.id && isDriverTask(t.type));
      const done = ts.filter((t) => t.status === '已完成').length;
      if (!ts.length) return { label: c.driver_needed === '不需要' ? '已完成' : '未开始', detail: c.driver_needed === '不需要' ? '不需要司机' : '尚未排司机' };
      return { label: done === ts.length ? '已完成' : '进行中', detail: `${done}/${ts.length} 个司机任务完成` };
    }
    case 'foster': {
      if (!c.foster_start) return { label: stepDone(['home']) ? '已完成' : '未开始', detail: '无寄养' };
      return { label: stepDone(['driver_airport']) ? '已完成' : '进行中', detail: `寄养 ${c.foster_start} ~ ${c.foster_end}` };
    }
  }
}
