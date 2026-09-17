'use client';

import { useMemo } from 'react';
import { Archive } from 'lucide-react';
import { userById } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { fmtDate } from '@/lib/dates';
import { StatusBadge } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ArchivePage() {
  const user = useCurrentUser();
  const cases = useAppStore((s) => s.cases);
  const openCase = useOpenCase();
  const list = useMemo(() => cases.filter((c) => c.archived && (user?.role === 'admin' || c.ops_docs_id === user?.id || c.ops_logistics_id === user?.id)).sort((a, b) => b.departure_date.localeCompare(a.departure_date)), [cases, user]);
  if (!user) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Archive className="size-4" /> 已完成 Case · {list.length} 个</div>
      <div className="rounded-xl bg-white ring-1 ring-foreground/10">
        <Table>
          <TableHeader><TableRow><TableHead>File No</TableHead><TableHead>宠物</TableHead><TableHead>主人</TableHead><TableHead>路线</TableHead><TableHead>出发</TableHead><TableHead>航班 / AWB</TableHead><TableHead>状态</TableHead><TableHead>负责人</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id} onClick={() => openCase(c.id)} className="cursor-pointer">
                <TableCell className="font-mono text-xs">{c.file_no}</TableCell>
                <TableCell>{petEmojiOf(c)} <span className="font-medium">{c.pet_name}</span> <span className="text-xs text-muted-foreground">{c.breed}</span></TableCell>
                <TableCell>{c.owner_name}</TableCell>
                <TableCell className="text-xs">{c.route}</TableCell>
                <TableCell>{fmtDate(c.departure_date)}</TableCell>
                <TableCell className="font-mono text-xs">{c.flights[0]?.flight_no} · {c.flights[0]?.awb}</TableCell>
                <TableCell><StatusBadge value={c.status} color="#7fa88b" /></TableCell>
                <TableCell><div className="flex -space-x-1.5"><UserAvatar user={userById(c.ops_docs_id)} size="sm" /><UserAvatar user={userById(c.ops_logistics_id)} size="sm" /></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
