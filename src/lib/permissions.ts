import type { Case, PageKey, PermissionMatrix, RoleKey, SectionKey, SectionPerm, Task, User } from '@/types';
import { roles, SECTION_META } from '@/data/roles';
import { users } from '@/data/users';

export const roleOf = (user: User) => roles[user.role];

export const canViewPage = (user: User | undefined, page: PageKey) => !!user && roles[user.role].pages.includes(page);

export const sectionPerm = (matrix: PermissionMatrix, role: RoleKey, section: SectionKey): SectionPerm => matrix[role]?.[section] ?? { view: false, edit: false };

/** 需要订舱动作的状态 */
export const BOOKING_PENDING = ['未订', '查询中', '待确认', '已改期', '已取消'] as const;

/** 当前用户可见的 Case（不含归档） */
export function visibleCases(cases: Case[], tasks: Task[], user: User): Case[] {
  const scope = roles[user.role].scope;
  const active = cases.filter((c) => !c.archived);
  switch (scope) {
    case 'all':
      return active;
    case 'assigned':
      return active.filter((c) => c.ops_docs_id === user.id || c.ops_logistics_id === user.id);
    case 'booking':
      return active.filter((c) => c.booking_id === user.id);
    case 'driver': {
      const ids = new Set(tasks.filter((t) => t.assignee_id === user.id).map((t) => t.case_id));
      return active.filter((c) => ids.has(c.id));
    }
  }
}

/** 能否打开 Case 详情页 */
export function canOpenCase(c: Case, cases: Case[], tasks: Task[], user: User) {
  if (user.role === 'driver') return false;
  if (c.archived) return roles[user.role].scope === 'all' || c.ops_docs_id === user.id || c.ops_logistics_id === user.id || c.booking_id === user.id;
  return visibleCases(cases, tasks, user).some((x) => x.id === c.id);
}

/** 分区负责人 */
export function sectionOwner(c: Case, section: SectionKey): User | undefined {
  const meta = SECTION_META.find((s) => s.key === section);
  switch (meta?.owner) {
    case 'ops_docs': return users.find((u) => u.id === c.ops_docs_id);
    case 'ops_logistics': return users.find((u) => u.id === c.ops_logistics_id);
    case 'booking': return users.find((u) => u.id === c.booking_id);
    default: return users.find((u) => u.role === 'admin');
  }
}

export type Progress = { label: '已完成' | '进行中' | '未开始'; detail: string };

/** 无权限时展示的进度摘要 */
export function sectionProgress(c: Case, tasks: Task[], section: SectionKey): Progress {
  const stepDone = (keys: string[]) => c.timeline.filter((s) => keys.includes(s.key)).every((s) => s.status === '完成');
  const stepAny = (keys: string[]) => c.timeline.some((s) => keys.includes(s.key) && s.status !== '未开始');
  switch (section) {
    case 'pet':
      return { label: c.chip_no ? '已完成' : '进行中', detail: c.foster_start ? `寄养 ${c.foster_start} ~ ${c.foster_end}` : '基础信息已录入' };
    case 'owner':
      return { label: c.passport_no ? '已完成' : '进行中', detail: '护照 / 联系方式已录入' };
    case 'route':
      return { label: '已完成', detail: c.route };
    case 'handover':
      return { label: '已完成', detail: '销售交接已完成' };
    case 'docs': {
      const docKeys = ['chip', 'rabies', 'wait21', 'favn', 'serum', 'permit', 'cdc_form', 'hospital', 'cfia', 'usda', 'health_cert', 'cn_quarantine', 'rnatt', 'rnatt_wait', 'airline_policy'];
      const steps = c.timeline.filter((s) => docKeys.includes(s.key));
      const done = steps.filter((s) => s.status === '完成').length;
      const cur = steps.find((s) => s.status !== '完成');
      return { label: done === steps.length ? '已完成' : done ? '进行中' : '未开始', detail: `${done}/${steps.length} 步 · 文件状态 ${c.files_status}${cur ? ` · 当前：${cur.label}` : ''}` };
    }
    case 'flight': {
      const ok = ['已确认', '已起飞', '已到达', '不需要'].includes(c.airline_confirmed);
      return { label: ok ? '已完成' : ['未订'].includes(c.airline_confirmed) ? '未开始' : '进行中', detail: `航司状态 ${c.airline_confirmed}${c.flights[0] ? ` · ${c.flights[0].flight_no}` : ''}` };
    }
    case 'payment': {
      const ok = c.final_payment_status === '全部尾款已收齐';
      return { label: ok ? '已完成' : c.payment_status === '必填费用未收' ? '未开始' : '进行中', detail: `${c.payment_status} · ${c.final_payment_status}` };
    }
    case 'log':
      return { label: '进行中', detail: '操作日志' };
    case 'driver': {
      const ts = tasks.filter((t) => t.case_id === c.id && ['接宠', '送机', '送医院', '送 CFIA', '采血'].includes(t.type));
      const done = ts.filter((t) => t.status === '已完成').length;
      if (!ts.length) return { label: c.driver_needed === '不需要' ? '已完成' : '未开始', detail: c.driver_needed === '不需要' ? '不需要司机' : '尚未排司机' };
      return { label: done === ts.length ? '已完成' : '进行中', detail: `${done}/${ts.length} 个司机任务完成` };
    }
    case 'foster': {
      if (!c.foster_start) return { label: stepDone(['home']) ? '已完成' : '未开始', detail: '无寄养' };
      const inFoster = stepAny(['driver_airport']) && !stepDone(['driver_airport']);
      return { label: stepDone(['driver_airport']) ? '已完成' : '进行中', detail: `寄养 ${c.foster_start} ~ ${c.foster_end}${inFoster ? ' · 在寄养中' : ''}` };
    }
  }
}
