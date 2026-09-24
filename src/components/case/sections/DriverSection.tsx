'use client';

import { useMemo } from 'react';
import { MapPin, ArrowRight, Phone, Home } from 'lucide-react';
import type { Case } from '@/types';
import { DRIVER_NEEDED } from '@/data/options';
import { userById } from '@/data/users';
import { useAppStore } from '@/store/useAppStore';
import { fmtMDW, relativeLabel } from '@/lib/dates';
import { SelectField, TextAreaField } from '@/components/common/Field';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/case/CreateTaskDialog';
import { EditTaskDialog } from '@/components/case/EditTaskDialog';
import type { SectionProps } from '@/components/case/types';

/** 司机安排：创建任务后自动出现在待办和司机页；后段在这里勾护照已寄 / 文件转交 / 点已到家 */
export function DriverSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const markArrivedHome = useAppStore((s) => s.markArrivedHome);
  const today = useAppStore((s) => s.today);
  const allTasks = useAppStore((s) => s.tasks);
  const tasks = useMemo(() => allTasks.filter((t) => t.case_id === c.id).sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start)), [allTasks, c.id]);
  const isOps = user.role === 'admin' || user.role === 'ops_docs';
  const isPost = user.role === 'admin' || user.role === 'ops_post';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField label="司机需求" value={c.driver_needed} editable={canEdit && isOps} options={DRIVER_NEEDED} onChange={(v) => updateCase(c.id, { driver_needed: v as Case['driver_needed'] }, user.id)} className="w-32" />
        {canEdit && isOps && !c.archived && <div className="ml-auto"><CreateTaskDialog caseId={c.id} user={user} /></div>}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr><th className="px-2 py-1.5 text-left font-medium">日期 / 时间</th><th className="px-2 py-1.5 text-left font-medium">类型</th><th className="px-2 py-1.5 text-left font-medium">提货 → 目的（电话）</th><th className="px-2 py-1.5 text-left font-medium">详情</th><th className="px-2 py-1.5 text-left font-medium">负责人</th><th className="px-2 py-1.5 text-left font-medium">状态</th><th className="px-2 py-1.5" /></tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t align-top">
                <td className="px-2 py-1.5 whitespace-nowrap"><div>{fmtMDW(t.date)} <span className="text-xs text-muted-foreground">{relativeLabel(t.date, today)}</span></div><div className="text-xs text-muted-foreground">{t.time_start}{t.time_end ? `–${t.time_end}` : ''}</div></td>
                <td className="px-2 py-1.5"><StatusBadge value={t.type} kind="taskType" /></td>
                <td className="px-2 py-1.5 text-xs">
                  {t.pickup_addr ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1"><MapPin className="size-3 shrink-0 text-muted-foreground" />{t.pickup_addr}{t.pickup_phone && <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Phone className="size-3" />{t.pickup_phone}</span>}</div>
                      <div className="flex items-center gap-1"><ArrowRight className="size-3 shrink-0 text-muted-foreground" />{t.dest_addr}{t.dest_phone && <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Phone className="size-3" />{t.dest_phone}</span>}</div>
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-1.5 text-xs text-[#595959]">{t.notes || '—'}{!t.change_acked && t.change_note && <div><Tag tone="danger">司机未确认变动</Tag> <span className="text-muted-foreground">{t.change_note}</span></div>}</td>
                <td className="px-2 py-1.5"><span className="inline-flex items-center gap-1.5"><UserAvatar user={userById(t.assignee_id)} size="sm" />{userById(t.assignee_id)?.name}</span></td>
                <td className="px-2 py-1.5"><StatusBadge value={t.status} kind="task" />{t.decline_reason && <div className="text-[0.65rem] text-destructive">{t.decline_reason}</div>}{t.exception_reason && <div className="text-[0.65rem] text-destructive">{t.exception_reason}{t.exception_note ? ` · ${t.exception_note}` : ''}</div>}</td>
                <td className="px-2 py-1.5 text-right">{canEdit && isOps && t.status !== '已完成' && !c.archived && <EditTaskDialog t={t} user={user} />}</td>
              </tr>
            ))}
            {tasks.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">尚未创建任务</td></tr>}
          </tbody>
        </table>
      </div>
      <TextAreaField label="接宠日志" value={c.pickup_log} editable={canEdit && isOps} rows={2} onChange={(v) => updateCase(c.id, { pickup_log: v }, user.id)} />
      {c.case_type !== '仅代办文件' && (
        <div className="flex flex-wrap items-center gap-4 border-t pt-3 text-sm">
          <span className="text-[0.7rem] tracking-wide text-muted-foreground">后段</span>
          <label className="inline-flex items-center gap-2"><Checkbox checked={c.passport_sent} disabled={!(canEdit && isPost) || c.archived} onCheckedChange={(v) => updateCase(c.id, { passport_sent: !!v }, user.id)} />护照 / 清关文件已寄</label>
          <label className="inline-flex items-center gap-2"><Checkbox checked={c.docs_handed_to_owner} disabled={!(canEdit && (isPost || isOps)) || c.archived} onCheckedChange={(v) => updateCase(c.id, { docs_handed_to_owner: !!v }, user.id)} />文件已转交主人</label>
          <TextAreaField label="到达 / 清关日志" value={c.arrival_log} editable={canEdit && isPost} rows={1} className="min-w-64 flex-1" onChange={(v) => updateCase(c.id, { arrival_log: v }, user.id)} />
          {canEdit && isPost && !c.arrived_home && !c.archived && <Button size="sm" onClick={() => markArrivedHome(c.id, user.id)}><Home /> 确认已到家</Button>}
          {c.arrived_home && <Tag tone="ok">已到家 {fmtMDW(c.home_date)}</Tag>}
        </div>
      )}
    </div>
  );
}
