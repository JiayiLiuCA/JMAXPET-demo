'use client';

import { useMemo, useState } from 'react';
import { Search, UserRound, UserRoundX } from 'lucide-react';
import { STAGES } from '@/data/options';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { visibleCases } from '@/lib/permissions';
import { stageOf } from '@/lib/workflow';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/common/Field';
import { Filters, applyFilter, emptyFilter, type FilterState } from '@/components/dashboard/Filters';
import { NewCaseDialog } from '@/components/case/NewCaseDialog';
import { CaseList, matchCase } from '@/components/dashboard/CaseList';

/** 随机 Case 列表：分"需要随机人 / 不需要随机人"两大区 */
export default function AccompanyPage() {
  const user = useCurrentUser();
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [filter, setFilter] = useState<FilterState>(emptyFilter);

  const list = useMemo(() => {
    if (!user) return [];
    const kw = q.trim().toLowerCase();
    return applyFilter(visibleCases(cases, tasks, user), filter)
      .filter((c) => c.case_type === '随机')
      .filter((c) => !stage || stageOf(c) === stage)
      .filter((c) => matchCase(c, kw))
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  }, [cases, tasks, user, q, stage, filter]);
  if (!user) return null;
  const need = list.filter((c) => c.accompany_needed);
  const noNeed = list.filter((c) => !c.accompany_needed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜 宠物名 / File No / 芯片号" className="w-64 bg-white pl-8" />
        </div>
        <SimpleSelect value={stage} onChange={setStage} options={STAGES} allowEmpty="全部阶段" className="w-32" />
        <Filters value={filter} onChange={setFilter} hideAssignee={!['admin', 'finance', 'ops_post'].includes(user.role)} />
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {list.length} 个随机 Case
          {(user.role === 'admin' || user.role === 'ops_docs') && <NewCaseDialog user={user} defaultType="随机" />}
        </div>
      </div>
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><UserRound className="size-4 text-primary" /> 需要随机人 <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{need.length}</span><span className="text-xs font-normal text-muted-foreground">主人不同机，需要帮客人找随机人</span></h2>
        <CaseList cases={need} user={user} opts={{ accompany: true }} />
      </section>
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><UserRoundX className="size-4 text-muted-foreground" /> 不需要随机人 <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{noNeed.length}</span><span className="text-xs font-normal text-muted-foreground">主人随行同机，只需向航司加宠物位置</span></h2>
        <CaseList cases={noNeed} user={user} opts={{ accompany: true }} />
      </section>
    </div>
  );
}
