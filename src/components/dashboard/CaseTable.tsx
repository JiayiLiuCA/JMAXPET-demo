'use client';

import type { Case } from '@/types';
import { userById } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { useAppStore } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { diffDays, fmtDate, relativeLabel } from '@/lib/dates';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** 今日总控里每个桶下面的紧凑表格；点行进入 Case 子页面 */
export function CaseTable({ cases, compact }: { cases: Case[]; compact?: boolean }) {
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  return (
    <Table>
      <TableHeader>
        <TableRow className="text-xs text-muted-foreground hover:bg-transparent">
          <TableHead className="h-8">宠物</TableHead>
          <TableHead className="h-8">File No</TableHead>
          <TableHead className="h-8">路线</TableHead>
          <TableHead className="h-8">出发</TableHead>
          <TableHead className="h-8">阶段</TableHead>
          <TableHead className="h-8">下一步</TableHead>
          <TableHead className="h-8">截止</TableHead>
          {!compact && <TableHead className="h-8">等待 / 风险</TableHead>}
          <TableHead className="h-8">负责人</TableHead>
          <TableHead className="h-8">航司</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map((c) => {
          const dl = c.deadline ? diffDays(today, c.deadline) : null;
          return (
            <TableRow key={c.id} onClick={() => openCase(c.id)} className="cursor-pointer">
              <TableCell>
                <span className="mr-1.5">{petEmojiOf(c)}</span>
                <span className="font-medium">{c.pet_name}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{c.breed}</span>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{c.file_no}</TableCell>
              <TableCell className="text-xs">{c.origin} → {c.dest_region}{c.flights[0] ? <span className="text-muted-foreground"> · {c.flights[0].flight_no}</span> : null}</TableCell>
              <TableCell>
                <div className="text-sm">{fmtDate(c.departure_date)}</div>
                <div className="text-[11px] text-muted-foreground">{relativeLabel(c.departure_date, today)}</div>
              </TableCell>
              <TableCell><StatusBadge value={c.stage} kind="stage" /></TableCell>
              <TableCell><Tag tone="info">{c.next_step}</Tag></TableCell>
              <TableCell>
                {c.deadline ? (
                  <span className={cn('text-sm', dl! < 0 ? 'font-medium text-destructive' : dl === 0 ? 'font-medium text-[#6b4f12]' : '')}>
                    {fmtDate(c.deadline)}
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">{dl! < 0 ? `逾期 ${-dl!} 天` : dl === 0 ? '今天' : dl === 1 ? '明天' : `${dl} 天后`}</span>
                  </span>
                ) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              {!compact && (
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.waiting && <Tag tone="accent">等{c.waiting}</Tag>}
                    {c.risk_tags.map((r) => <Tag key={r} tone="danger">{r}</Tag>)}
                    {!c.waiting && !c.risk_tags.length && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
              )}
              <TableCell>
                <div className="flex -space-x-1.5">
                  <UserAvatar user={userById(c.ops_docs_id)} size="sm" tip={`前期文件 · ${userById(c.ops_docs_id)?.name}`} />
                  <UserAvatar user={userById(c.ops_logistics_id)} size="sm" tip={`接送寄养 · ${userById(c.ops_logistics_id)?.name}`} />
                </div>
              </TableCell>
              <TableCell><StatusBadge value={c.airline_confirmed} kind="airline" /></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
