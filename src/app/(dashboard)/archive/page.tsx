'use client';

import { useMemo, useState } from 'react';
import { Archive, Search } from 'lucide-react';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { scopedCases } from '@/lib/permissions';
import { Input } from '@/components/ui/input';
import { CaseList, matchCase } from '@/components/dashboard/CaseList';

/** 归档：所有航班已确认且已到家的宠物自动归档；可搜索 */
export default function ArchivePage() {
  const user = useCurrentUser();
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    if (!user) return [];
    const kw = q.trim().toLowerCase();
    return scopedCases(cases, tasks, user).filter((c) => c.archived && matchCase(c, kw)).sort((a, b) => b.departure_date.localeCompare(a.departure_date));
  }, [cases, tasks, user, q]);
  if (!user) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Archive className="size-4" /> 已归档 Case · {list.length} 个 · 到家后自动归档</span>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜 宠物名 / File No / 芯片号" className="w-64 bg-white pl-8" />
        </div>
      </div>
      <CaseList cases={list} user={user} opts={{ showType: true, archive: true, showPayment: user.role === 'finance' }} />
    </div>
  );
}
