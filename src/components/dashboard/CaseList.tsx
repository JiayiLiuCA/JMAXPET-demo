'use client';

import type { Case, User } from '@/types';
import { userById } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { useAppStore } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { fmtDate, relativeLabel } from '@/lib/dates';
import { nextStepLabel, stageOf } from '@/lib/workflow';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface CaseListOpts { accompany?: boolean; showDocsHanded?: boolean; showPayment?: boolean; showType?: boolean; archive?: boolean }

/** Case 列表表格（托运 / 随机 / 归档共用） */
export function CaseList({ cases, user, opts = {} }: { cases: Case[]; user: User; opts?: CaseListOpts }) {
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const hideOwner = user.role === 'booking_cargo' || user.role === 'booking_accompany';
  const cols = 9 + (opts.accompany ? 3 : 0) + (opts.showDocsHanded ? 1 : 0) + (opts.showPayment ? 1 : 0) + (opts.showType ? 1 : 0);
  return (
    <div className="rounded-xl bg-white ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File No</TableHead><TableHead>宠物</TableHead>{opts.showType && <TableHead>类型</TableHead>}<TableHead>主人</TableHead><TableHead>路线</TableHead><TableHead>{opts.archive ? '出发日期' : '出发日期'}</TableHead><TableHead>阶段</TableHead><TableHead>下一步</TableHead>
            {opts.accompany ? <><TableHead>随机状态</TableHead><TableHead>随机人</TableHead><TableHead>舱位</TableHead></> : <TableHead>航司</TableHead>}
            {opts.showDocsHanded && <TableHead>文件转交</TableHead>}
            {opts.showPayment && <TableHead>收款</TableHead>}
            <TableHead>负责人</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => (
            <TableRow key={c.id} onClick={() => openCase(c.id)} className="cursor-pointer">
              <TableCell className="font-mono text-xs">{c.file_no}</TableCell>
              <TableCell><span className="mr-1">{petEmojiOf(c)}</span><span className="font-medium">{c.pet_name}</span> <span className="text-xs text-muted-foreground">{c.breed}</span></TableCell>
              {opts.showType && <TableCell><StatusBadge value={c.case_type} kind="caseType" />{c.case_type === '托运' && <div className="text-[0.65rem] text-muted-foreground">{c.service_scope}</div>}</TableCell>}
              <TableCell>{hideOwner ? <span className="text-muted-foreground">***</span> : c.owner_name}</TableCell>
              <TableCell className="text-xs">{c.origin} → {c.entry_airport}{c.final_dest && c.final_dest !== (c.entry_airport) ? <span className="text-muted-foreground"> · {c.final_dest}</span> : null}<div className="text-[0.65rem] text-muted-foreground">{c.route.split(' · ')[1] ?? ''}</div></TableCell>
              <TableCell><div className={cn(!c.departure_confirmed && 'text-muted-foreground')}>{fmtDate(c.departure_date)}</div><div className="text-[0.65rem] text-muted-foreground">{c.departure_confirmed ? '实际' : '预计'} · {relativeLabel(c.departure_date, today)}</div></TableCell>
              <TableCell><StatusBadge value={stageOf(c)} kind="stage" /></TableCell>
              <TableCell><Tag tone="info">{nextStepLabel(c)}</Tag>{c.waiting && <Tag tone="accent" className="ml-1">等{c.waiting}</Tag>}{c.risk_tags.map((r) => <Tag key={r} tone="danger" className="ml-1">{r}</Tag>)}</TableCell>
              {opts.accompany ? (
                <>
                  <TableCell><StatusBadge value={c.accompany_status} kind="accompany" /></TableCell>
                  <TableCell className="text-xs">{c.accompany_needed ? c.accompany_person || <span className="text-destructive">待找</span> : <span className="text-muted-foreground">主人随行</span>}</TableCell>
                  <TableCell className="text-xs">{c.cabin || '—'}</TableCell>
                </>
              ) : <TableCell><StatusBadge value={c.airline_confirmed} kind="airline" /></TableCell>}
              {opts.showDocsHanded && <TableCell>{c.docs_handed_to_owner ? <Tag tone="ok">已转交</Tag> : <Tag tone="warn">未转交</Tag>}</TableCell>}
              {opts.showPayment && <TableCell className="text-xs">{c.final_payment_status}</TableCell>}
              <TableCell>
                <div className="flex -space-x-1.5">
                  <UserAvatar user={userById(c.ops_docs_id)} size="sm" tip={`前期文件 · ${userById(c.ops_docs_id)?.name}`} />
                  {c.booking_id && <UserAvatar user={userById(c.booking_id)} size="sm" tip={`订舱 · ${userById(c.booking_id)?.name}`} />}
                  <UserAvatar user={userById(c.ops_post_id)} size="sm" tip={`后段 · ${userById(c.ops_post_id)?.name}`} />
                  <UserAvatar user={userById(c.sales_id)} size="sm" tip={`销售 · ${userById(c.sales_id)?.name}`} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {cases.length === 0 && <TableRow><TableCell colSpan={cols} className="py-8 text-center text-muted-foreground">没有匹配的 Case</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

export const matchCase = (c: Case, kw: string) => !kw || [c.pet_name, c.file_no, c.owner_name, c.chip_no, c.chip_no.replace(/-/g, ''), ...c.flights.map((f) => f.awb), ...c.flights.map((f) => f.flight_no)].some((v) => v?.toLowerCase().includes(kw));
