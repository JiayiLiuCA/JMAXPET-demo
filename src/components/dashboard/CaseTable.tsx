'use client';

import type { Case } from '@/types';
import type { BucketItem } from '@/lib/buckets';
import { userById } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { useAppStore } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { fmtMDW, relativeLabel } from '@/lib/dates';
import { nextStepLabel, stageOf } from '@/lib/workflow';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** 今日总控每个桶下面的紧凑表格；点行进入 Case */
export function CaseTable({ items, canOpen = true }: { items: BucketItem[]; canOpen?: boolean }) {
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  return (
    <Table>
      <TableHeader>
        <TableRow className="text-xs text-muted-foreground hover:bg-transparent">
          <TableHead className="h-8">日期 / 星期</TableHead>
          <TableHead className="h-8">宠物</TableHead>
          <TableHead className="h-8">File No</TableHead>
          <TableHead className="h-8">类型</TableHead>
          <TableHead className="h-8">路线</TableHead>
          <TableHead className="h-8">事项</TableHead>
          <TableHead className="h-8">阶段 / 下一步</TableHead>
          <TableHead className="h-8">航司</TableHead>
          <TableHead className="h-8">负责人</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => {
          const c = it.c;
          const late = it.when && it.when < today;
          return (
            <TableRow key={`${c.id}-${it.task?.id ?? it.when}`} onClick={() => canOpen && openCase(c.id)} className={cn(canOpen && 'cursor-pointer')}>
              <TableCell>
                <div className={cn('text-sm', late && 'font-medium text-destructive')}>{fmtMDW(it.when)}</div>
                <div className="text-[0.7rem] text-muted-foreground">{relativeLabel(it.when, today)}</div>
              </TableCell>
              <TableCell>
                <span className="mr-1.5">{petEmojiOf(c)}</span>
                <span className="font-medium">{c.pet_name}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{c.breed}</span>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{c.file_no}</TableCell>
              <TableCell><StatusBadge value={c.case_type} kind="caseType" /></TableCell>
              <TableCell className="text-xs">{c.origin} → {c.entry_airport}{c.final_dest && c.final_dest !== c.entry_airport ? <span className="text-muted-foreground"> · {c.final_dest}</span> : null}</TableCell>
              <TableCell className="max-w-[16rem] text-xs text-[#595959]">
                {it.task ? <Tag tone="info" className="mr-1">{it.task.type}</Tag> : null}
                {it.note}
                {c.waiting && <Tag tone="accent" className="ml-1">等{c.waiting}</Tag>}
                {c.risk_tags.map((r) => <Tag key={r} tone="danger" className="ml-1">{r}</Tag>)}
              </TableCell>
              <TableCell><StatusBadge value={stageOf(c)} kind="stage" /><span className="ml-1 text-xs text-muted-foreground">{nextStepLabel(c)}</span></TableCell>
              <TableCell>{c.case_type === '随机' ? <StatusBadge value={c.accompany_status} kind="accompany" /> : <StatusBadge value={c.airline_confirmed} kind="airline" />}</TableCell>
              <TableCell>
                <div className="flex -space-x-1.5">
                  <UserAvatar user={userById(c.ops_docs_id)} size="sm" tip={`前期文件 · ${userById(c.ops_docs_id)?.name}`} />
                  {c.booking_id && <UserAvatar user={userById(c.booking_id)} size="sm" tip={`订舱 · ${userById(c.booking_id)?.name}`} />}
                  <UserAvatar user={userById(c.ops_post_id)} size="sm" tip={`后段 · ${userById(c.ops_post_id)?.name}`} />
                  {it.task && <UserAvatar user={userById(it.task.assignee_id)} size="sm" tip={`任务 · ${userById(it.task.assignee_id)?.name}`} />}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export const caseTitle = (c: Case) => `${petEmojiOf(c)} ${c.pet_name}`;
