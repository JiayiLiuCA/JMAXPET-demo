'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, CalendarDays } from 'lucide-react';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { visibleCases } from '@/lib/permissions';
import { BUCKET_DEFS, ROLE_BUCKETS, computeBuckets, type BucketKey } from '@/lib/buckets';
import { addDays, fmtMD, weekRange } from '@/lib/dates';
import { BucketSection } from '@/components/dashboard/BucketSection';
import { FlightTable } from '@/components/dashboard/FlightTable';
import { Filters, applyFilter, emptyFilter, type FilterState } from '@/components/dashboard/Filters';
import { NewCaseDialog } from '@/components/case/NewCaseDialog';
import { CreateTaskDialog } from '@/components/case/CreateTaskDialog';

/** 今日总控：近 7 天待办 + 近 3 周待办（本周 / 下周 / 下下周），桶按角色配置 */
export default function DashboardPage() {
  const user = useCurrentUser();
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const [filter, setFilter] = useState<FilterState>(emptyFilter);

  const keys = useMemo<BucketKey[]>(() => (user ? ROLE_BUCKETS[user.role] ?? [] : []), [user]);
  const visible = useMemo(() => (user ? applyFilter(visibleCases(cases, tasks, user), filter) : []), [cases, tasks, user, filter]);
  const buckets = useMemo(() => computeBuckets(visible, tasks, today, keys), [visible, tasks, today, keys]);
  if (!user) return null;
  const isAdmin = user.role === 'admin';
  const seven = keys.filter((k) => BUCKET_DEFS[k].window === '7d');
  const weeks = keys.filter((k) => BUCKET_DEFS[k].window === '3w');
  const weekSub: Partial<Record<BucketKey, string>> = { week0: weekRange(today, 0).label, week1: weekRange(today, 1).label, week2: weekRange(today, 2).label };
  const canCreate = isAdmin || user.role === 'ops_docs';

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Filters value={filter} onChange={setFilter} hideAssignee={!isAdmin} />
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isAdmin ? '全部 Case' : user.role === 'ops_post' ? `只看 ${(user.regions ?? []).join(' / ')} 入境的 Case` : '只看我负责的 Case'} · {visible.length} 个进行中
          {canCreate && <CreateTaskDialog user={user} variant="outline" />}
          {canCreate && <NewCaseDialog user={user} />}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {keys.map((k) => (
          <a key={k} href={`#bucket-${k}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs ring-1 ring-foreground/10 transition-colors hover:bg-muted">
            <span className="size-2 rounded-full" style={{ background: BUCKET_DEFS[k].color }} />
            {BUCKET_DEFS[k].label}
            <span className="font-semibold">{buckets[k].length}</span>
          </a>
        ))}
      </div>

      <FlightTable cases={visible} />

      <div className="flex items-center gap-2 pt-2 text-sm font-semibold text-foreground">
        <CalendarDays className="size-4 text-primary" /> 近 7 天待办
        <span className="text-xs font-normal text-muted-foreground">{fmtMD(today)} – {fmtMD(addDays(today, 7))}</span>
      </div>
      {seven.map((k) => <BucketSection key={k} bucket={BUCKET_DEFS[k]} items={buckets[k]} />)}

      <div className="flex items-center gap-2 pt-2 text-sm font-semibold text-foreground">
        <CalendarRange className="size-4 text-primary" /> 近 3 周待办
        <span className="text-xs font-normal text-muted-foreground">按实际星期（周一 ~ 周日）</span>
      </div>
      {weeks.map((k) => <BucketSection key={k} bucket={BUCKET_DEFS[k]} items={buckets[k]} subtitle={weekSub[k]} />)}
    </div>
  );
}
