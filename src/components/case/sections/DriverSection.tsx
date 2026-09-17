'use client';

import { useMemo } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import type { Case } from '@/types';
import { DRIVER_NEEDED } from '@/data/options';
import { userById } from '@/data/users';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate, relativeLabel } from '@/lib/dates';
import { SelectField, TextAreaField } from '@/components/common/Field';
import { StatusBadge } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateTaskDialog } from '@/components/case/CreateTaskDialog';
import type { SectionProps } from '@/components/case/types';

export function DriverSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const toggleTaskConfirm = useAppStore((s) => s.toggleTaskConfirm);
  const today = useAppStore((s) => s.today);
  const allTasks = useAppStore((s) => s.tasks);
  const tasks = useMemo(() => allTasks.filter((t) => t.case_id === c.id).sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start)), [allTasks, c.id]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField label="司机需求 driver_needed" value={c.driver_needed} editable={canEdit} options={DRIVER_NEEDED} onChange={(v) => updateCase(c.id, { driver_needed: v as Case['driver_needed'] }, user.id)} className="w-32" />
        {canEdit && <div className="ml-auto"><CreateTaskDialog caseId={c.id} user={user} /></div>}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr><th className="px-2 py-1.5 text-left font-medium">日期 / 时间</th><th className="px-2 py-1.5 text-left font-medium">类型</th><th className="px-2 py-1.5 text-left font-medium">提货 → 目的</th><th className="px-2 py-1.5 text-left font-medium">司机</th><th className="px-2 py-1.5 text-left font-medium">主人确认</th><th className="px-2 py-1.5 text-left font-medium">司机确认</th><th className="px-2 py-1.5 text-left font-medium">状态</th></tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <div>{fmtDate(t.date)} <span className="text-xs text-muted-foreground">{relativeLabel(t.date, today)}</span></div>
                  <div className="text-xs text-muted-foreground">{t.time_start}–{t.time_end}</div>
                </td>
                <td className="px-2 py-1.5">{t.type}</td>
                <td className="px-2 py-1.5 text-xs">
                  {t.pickup_addr ? (
                    <div className="flex items-center gap-1"><MapPin className="size-3 shrink-0 text-muted-foreground" />{t.pickup_addr}<ArrowRight className="size-3 shrink-0 text-muted-foreground" />{t.dest_addr}</div>
                  ) : <span className="text-muted-foreground">—</span>}
                  {t.notes && <div className="mt-0.5 text-muted-foreground">{t.notes}</div>}
                </td>
                <td className="px-2 py-1.5"><span className="inline-flex items-center gap-1.5"><UserAvatar user={userById(t.assignee_id)} size="sm" />{userById(t.assignee_id)?.name}</span></td>
                <td className="px-2 py-1.5"><Checkbox checked={t.owner_confirmed} disabled={!canEdit} onCheckedChange={() => toggleTaskConfirm(t.id, 'owner_confirmed')} /></td>
                <td className="px-2 py-1.5"><Checkbox checked={t.driver_confirmed} disabled={!canEdit} onCheckedChange={() => toggleTaskConfirm(t.id, 'driver_confirmed')} /></td>
                <td className="px-2 py-1.5"><StatusBadge value={t.status} kind="task" /></td>
              </tr>
            ))}
            {tasks.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">尚未创建任务</td></tr>}
          </tbody>
        </table>
      </div>
      <TextAreaField label="接宠日志 pickup_log" value={c.pickup_log} editable={canEdit} rows={2} onChange={(v) => updateCase(c.id, { pickup_log: v }, user.id)} />
      {c.arrival_log && <TextAreaField label="到达日志 arrival_log" value={c.arrival_log} editable={canEdit} rows={2} onChange={(v) => updateCase(c.id, { arrival_log: v }, user.id)} />}
    </div>
  );
}
