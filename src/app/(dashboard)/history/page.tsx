'use client';

import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { fmtDateFull, fmtDateTime } from '@/lib/dates';
import { Input } from '@/components/ui/input';
import { DriverTaskCard } from '@/components/tasks/DriverTaskCard';

/** 司机历史任务：已完成的自动进入；可按日期 / 宠物名搜索；不能修改 */
export default function HistoryPage() {
  const user = useCurrentUser();
  const tasks = useAppStore((s) => s.tasks);
  const cases = useAppStore((s) => s.cases);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    if (!user) return [];
    const kw = q.trim().toLowerCase();
    return tasks
      .filter((t) => t.assignee_id === user.id && t.status === '已完成')
      .filter((t) => { const c = cases.find((x) => x.id === t.case_id); return !kw || t.date.includes(kw) || c?.pet_name.toLowerCase().includes(kw); })
      .sort((a, b) => b.date.localeCompare(a.date) || b.time_start.localeCompare(a.time_start));
  }, [tasks, cases, user, q]);
  if (!user) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><History className="size-4" /> 已完成 {list.length} 个 · 发现填错请联系操作部管理员修改</div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜日期（2026-09-16）或宠物名" className="bg-white pl-8" />
      </div>
      {list.map((t) => (
        <div key={t.id}>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>{fmtDateFull(t.date)}</span>{t.completed_at && <span>完成于 {fmtDateTime(t.completed_at)}</span>}</div>
          <DriverTaskCard t={t} user={user} readOnly />
        </div>
      ))}
      {list.length === 0 && <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">没有历史任务</div>}
    </div>
  );
}
