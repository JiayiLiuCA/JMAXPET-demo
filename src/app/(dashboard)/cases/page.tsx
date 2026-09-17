'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PRIORITIES, STAGES } from '@/data/options';
import { userById } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { visibleCases } from '@/lib/permissions';
import { fmtDate, relativeLabel } from '@/lib/dates';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/common/Field';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Filters, applyFilter, emptyFilter, type FilterState } from '@/components/dashboard/Filters';
import { NewCaseDialog } from '@/components/case/NewCaseDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CasesPage() {
  const user = useCurrentUser();
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('');
  const [stage, setStage] = useState('');
  const [filter, setFilter] = useState<FilterState>(emptyFilter);

  const list = useMemo(() => {
    if (!user) return [];
    const kw = q.trim().toLowerCase();
    return applyFilter(visibleCases(cases, tasks, user), filter)
      .filter((c) => !priority || c.priority === priority)
      .filter((c) => !stage || c.stage === stage)
      .filter((c) => !kw || [c.pet_name, c.file_no, c.owner_name, c.chip_no, ...c.flights.map((f) => f.awb), ...c.flights.map((f) => f.flight_no)].some((v) => v?.toLowerCase().includes(kw)))
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  }, [cases, tasks, user, q, priority, stage, filter]);
  if (!user) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜 宠物名 / File No / 主人 / 芯片 / AWB" className="w-72 bg-white pl-8" />
        </div>
        <SimpleSelect value={priority} onChange={setPriority} options={PRIORITIES} allowEmpty="全部优先级" className="w-32" />
        <SimpleSelect value={stage} onChange={setStage} options={STAGES} allowEmpty="全部阶段" className="w-28" />
        <Filters value={filter} onChange={setFilter} hideAssignee={user.role !== 'admin'} />
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {list.length} 个 Case
          {(user.role === 'admin' || user.role === 'ops_docs') && <NewCaseDialog user={user} />}
        </div>
      </div>
      <div className="rounded-xl bg-white ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File No</TableHead><TableHead>宠物</TableHead><TableHead>主人</TableHead><TableHead>路线</TableHead><TableHead>出发</TableHead><TableHead>阶段</TableHead><TableHead>下一步</TableHead><TableHead>优先级</TableHead><TableHead>航司</TableHead><TableHead>负责人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id} onClick={() => openCase(c.id)} className="cursor-pointer">
                <TableCell className="font-mono text-xs">{c.file_no}</TableCell>
                <TableCell><span className="mr-1">{petEmojiOf(c)}</span><span className="font-medium">{c.pet_name}</span> <span className="text-xs text-muted-foreground">{c.breed}</span></TableCell>
                <TableCell>{user.role === 'booking' ? <span className="text-muted-foreground">***</span> : c.owner_name}</TableCell>
                <TableCell className="text-xs">{c.route}</TableCell>
                <TableCell><div>{fmtDate(c.departure_date)}</div><div className="text-xs text-muted-foreground">{relativeLabel(c.departure_date, today)}</div></TableCell>
                <TableCell><StatusBadge value={c.stage} kind="stage" /></TableCell>
                <TableCell><Tag tone="info">{c.next_step}</Tag>{c.waiting && <Tag tone="accent" className="ml-1">等{c.waiting}</Tag>}</TableCell>
                <TableCell><StatusBadge value={c.priority} kind="priority" /></TableCell>
                <TableCell><StatusBadge value={c.airline_confirmed} kind="airline" /></TableCell>
                <TableCell><div className="flex -space-x-1.5"><UserAvatar user={userById(c.ops_docs_id)} size="sm" /><UserAvatar user={userById(c.ops_logistics_id)} size="sm" /><UserAvatar user={userById(c.booking_id)} size="sm" /></div></TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">没有匹配的 Case</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
