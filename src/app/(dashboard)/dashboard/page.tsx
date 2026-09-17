'use client';

import { useMemo, useState } from 'react';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { visibleCases } from '@/lib/permissions';
import { BUCKETS, bucketize } from '@/lib/buckets';
import { BucketSection } from '@/components/dashboard/BucketSection';
import { FlightTable } from '@/components/dashboard/FlightTable';
import { Filters, applyFilter, emptyFilter, type FilterState } from '@/components/dashboard/Filters';
import { NewCaseDialog } from '@/components/case/NewCaseDialog';
import { CreateTaskDialog } from '@/components/case/CreateTaskDialog';

export default function DashboardPage() {
  const user = useCurrentUser();
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const [filter, setFilter] = useState<FilterState>(emptyFilter);

  const visible = useMemo(() => (user ? applyFilter(visibleCases(cases, tasks, user), filter) : []), [cases, tasks, user, filter]);
  const buckets = useMemo(() => bucketize(visible, today), [visible, today]);
  if (!user) return null;
  const isAdmin = user.role === 'admin';

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* 筛选 + 动作 */}
      <div className="flex flex-wrap items-center gap-3">
        <Filters value={filter} onChange={setFilter} hideAssignee={!isAdmin} />
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isAdmin ? '全部 Case' : '只看我负责的 Case'} · {visible.length} 个进行中
          {(isAdmin || user.role.startsWith('ops')) && <CreateTaskDialog user={user} variant="outline" />}
          {(isAdmin || user.role === 'ops_docs') && <NewCaseDialog user={user} />}
        </div>
      </div>

      {/* 桶概览：点击跳到对应分组 */}
      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((b) => (
          <a key={b.key} href={`#bucket-${b.key}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs ring-1 ring-foreground/10 transition-colors hover:bg-muted">
            <span className="size-2 rounded-full" style={{ background: b.color }} />
            {b.label}
            <span className="font-semibold">{buckets[b.key].length}</span>
          </a>
        ))}
      </div>

      <FlightTable cases={visible} />

      {BUCKETS.map((b) => <BucketSection key={b.key} bucket={b} cases={buckets[b.key]} />)}
    </div>
  );
}
