'use client';

import { useMemo, useState } from 'react';
import { PlaneTakeoff, FolderOpen, Check, Home, Wallet, UserRound } from 'lucide-react';
import type { Case, Task, User } from '@/types';
import { users, userById } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { AIRPORT_CITY } from '@/data/options';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { BOOKING_PENDING, visibleCases, isDriverTask } from '@/lib/permissions';
import { arrivalDate } from '@/lib/buckets';
import { stageOf } from '@/lib/workflow';
import { diffDays, fmtDateFull, fmtMDW, relativeLabel, weekIndex, weekLabel, weekRange } from '@/lib/dates';
import { DriverTaskCard } from '@/components/tasks/DriverTaskCard';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { SimpleSelect } from '@/components/common/Field';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/case/CreateTaskDialog';
import { EditTaskDialog } from '@/components/case/EditTaskDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function TodoPage() {
  const user = useCurrentUser();
  if (!user) return null;
  switch (user.role) {
    case 'driver': return <DriverTodo user={user} />;
    case 'booking_cargo': return <BookingTodo user={user} />;
    case 'booking_accompany': return <AccompanyTodo user={user} />;
    case 'ops_post': return <PostTodo user={user} />;
    case 'finance': return <FinanceTodo />;
    default: return <OpsTodo user={user} />;
  }
}

/* ---------------- 司机：今日任务（手机端） ---------------- */
function DriverTodo({ user }: { user: User }) {
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const mine = useMemo(() => tasks.filter((t) => t.assignee_id === user.id && t.status !== '已完成').sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start)), [tasks, user.id]);
  const groups: { label: string; list: Task[] }[] = [
    { label: '今天', list: mine.filter((t) => diffDays(today, t.date) === 0) },
    { label: '明天', list: mine.filter((t) => diffDays(today, t.date) === 1) },
    { label: '之后', list: mine.filter((t) => diffDays(today, t.date) > 1) },
    { label: '过期未完成', list: mine.filter((t) => diffDays(today, t.date) < 0).reverse() },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserAvatar user={user} />
        <div>
          <div className="text-base font-semibold">{user.name}，你好</div>
          <div className="text-xs text-muted-foreground">{fmtDateFull(today)} · 今天 {groups[0].list.length} 个任务</div>
        </div>
      </div>
      {groups.map((g) => (
        <section key={g.label}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">{g.label}<span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{g.list.length}</span></h2>
          <div className="space-y-3">
            {g.list.map((t) => (
              <div key={t.id}>
                {g.label !== '今天' && <div className="mb-1 text-xs text-muted-foreground">{fmtDateFull(t.date)}（{relativeLabel(t.date, today)}）</div>}
                <DriverTaskCard t={t} user={user} />
              </div>
            ))}
            {g.list.length === 0 && g.label !== '过期未完成' && <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">没有任务</div>}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------------- 托运订舱：待处理订舱 / 已确认待出发 / 已到达 ---------------- */
function BookingRow({ c, extra }: { c: Case; extra?: React.ReactNode }) {
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const notes = useAppStore((s) => s.notes);
  const lastNote = notes.filter((n) => n.case_id === c.id).slice(-1)[0];
  return (
    <button onClick={() => openCase(c.id)} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-foreground/10 transition-all hover:shadow-md">
      <span className="text-xl">{petEmojiOf(c)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{c.pet_name}</span>
          <span className="font-mono text-xs text-muted-foreground">{c.file_no}</span>
          {extra}
          {c.risk_tags.includes('时间') && <Tag tone="danger">风险 · 时间</Tag>}
        </div>
        <div className="mt-0.5 text-xs text-[#595959]">{c.route} · {fmtMDW(c.departure_date)} 出发（{relativeLabel(c.departure_date, today)}{c.departure_confirmed ? '' : '，预计'}） · {c.breed} {c.weight} kg · {c.crate_size || '箱体未定'}</div>
        {(c.pet_notes || lastNote) && <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.pet_notes || lastNote?.text}</div>}
      </div>
      <FolderOpen className="size-4 text-muted-foreground" />
    </button>
  );
}

function BookingTodo({ user }: { user: User }) {
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const mine = useMemo(() => visibleCases(cases, tasks, user).sort((a, b) => a.departure_date.localeCompare(b.departure_date)), [cases, tasks, user]);
  const pending = mine.filter((c) => (BOOKING_PENDING as readonly string[]).includes(c.airline_confirmed));
  const confirmed = mine.filter((c) => c.airline_confirmed === '已确认' || c.airline_confirmed === '已起飞');
  const arrived = cases.filter((c) => c.case_type === '托运' && c.booking_id === user.id && (c.airline_confirmed === '已到达' || c.archived) && diffDays(c.departure_date, today) <= 30).sort((a, b) => b.departure_date.localeCompare(a.departure_date));
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><PlaneTakeoff className="size-4 text-primary" /> 待处理订舱 <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{pending.length}</span><span className="text-xs font-normal text-muted-foreground">前期文件办完后自动转过来，按出发时间排序</span></h2>
        <div className="space-y-2">{pending.map((c) => <BookingRow key={c.id} c={c} extra={<StatusBadge value={c.airline_confirmed} kind="airline" />} />)}{pending.length === 0 && <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">没有待处理订舱</div>}</div>
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Check className="size-4 text-success" /> 已确认 / 待出发 <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{confirmed.length}</span></h2>
        <div className="space-y-2">{confirmed.map((c) => <BookingRow key={c.id} c={c} extra={<StatusBadge value={c.airline_confirmed} kind="airline" />} />)}</div>
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Home className="size-4" /> 已到达 <span className="rounded-full bg-muted px-1.5 text-xs font-normal">{arrived.length}</span><span className="text-xs font-normal">到达后保留 1 个月再归档</span></h2>
        <div className="space-y-2 opacity-80">{arrived.map((c) => <BookingRow key={c.id} c={c} extra={<StatusBadge value="已到达" kind="airline" />} />)}</div>
      </section>
    </div>
  );
}

/* ---------------- 随机订舱：未确认 / 已确认 ---------------- */
function AccompanyTodo({ user }: { user: User }) {
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const mine = useMemo(() => visibleCases(cases, tasks, user).sort((a, b) => a.departure_date.localeCompare(b.departure_date)), [cases, tasks, user]);
  const pending = mine.filter((c) => c.accompany_status !== '已添加宠物位置');
  const done = mine.filter((c) => c.accompany_status === '已添加宠物位置');
  const row = (c: Case) => <BookingRow key={c.id} c={c} extra={<><StatusBadge value={c.accompany_status} kind="accompany" /><Tag tone={c.accompany_needed ? 'warn' : 'neutral'}>{c.accompany_needed ? '需找随机人' : '主人随行'}</Tag>{c.cabin && <Tag tone="info">{c.cabin}</Tag>}</>} />;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><UserRound className="size-4 text-primary" /> 未确认 <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{pending.length}</span><span className="text-xs font-normal text-muted-foreground">找随机人、加宠物位置；备注至少每两天更新</span></h2>
        <div className="space-y-2">{pending.map(row)}{pending.length === 0 && <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">没有待处理</div>}</div>
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Check className="size-4" /> 已确认 <span className="rounded-full bg-muted px-1.5 text-xs font-normal">{done.length}</span></h2>
        <div className="space-y-2 opacity-80">{done.map(row)}</div>
      </section>
    </div>
  );
}

/* ---------------- 后段操作：出发 / 落地 / 入境口岸 / 已到家 ---------------- */
function PostTodo({ user }: { user: User }) {
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const markArrivedHome = useAppStore((s) => s.markArrivedHome);
  const list = useMemo(() => visibleCases(cases, tasks, user).filter((c) => c.case_type !== '仅代办文件' && !c.arrived_home && weekIndex(today, c.departure_date) <= 2).sort((a, b) => a.departure_date.localeCompare(b.departure_date)), [cases, tasks, user, today]);
  const groups = [-1, 0, 1, 2].map((i) => ({ i, list: list.filter((c) => (i === -1 ? weekIndex(today, c.departure_date) < 0 : weekIndex(today, c.departure_date) === i)) }));
  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">只看 {(user.regions ?? []).join(' / ')} 入境的 Case · 落地时间为当地时间 · 到家后点「已到家」，所有航班已确认的会自动归档</div>
      {groups.map((g) => (
        <section key={g.i} className="overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
          <header className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-sm font-semibold">{g.i === -1 ? '已出发 / 在途' : `${weekLabel(g.i)}出发`}<span className="text-xs font-normal text-muted-foreground">{g.i === -1 ? '' : weekRange(today, g.i).label}</span><span className="rounded-full bg-white px-1.5 text-xs font-normal text-muted-foreground ring-1 ring-foreground/10">{g.list.length}</span></header>
          <Table>
            <TableHeader><TableRow className="text-xs hover:bg-transparent"><TableHead className="h-8">出发日期 / 星期</TableHead><TableHead className="h-8">落地日期 / 星期（local）</TableHead><TableHead className="h-8">入境口岸</TableHead><TableHead className="h-8">宠物 / Case</TableHead><TableHead className="h-8">阶段</TableHead><TableHead className="h-8">尾款</TableHead><TableHead className="h-8">备注</TableHead><TableHead className="h-8" /></TableRow></TableHeader>
            <TableBody>
              {g.list.map((c) => {
                const arr = arrivalDate(c);
                const landed = diffDays(today, arr) <= 0 && stageOf(c) !== '办理文件';
                return (
                  <TableRow key={c.id} className={cn(landed && 'bg-warning/10')}>
                    <TableCell>{fmtMDW(c.departure_date)}<div className="text-[0.7rem] text-muted-foreground">{relativeLabel(c.departure_date, today)}</div></TableCell>
                    <TableCell>{fmtMDW(arr)}<div className="text-[0.7rem] text-muted-foreground">{c.flights.find((f) => f.status === 'active')?.arr_time.slice(11, 16) ?? ''}</div></TableCell>
                    <TableCell>{c.entry_airport} {AIRPORT_CITY[c.entry_airport]}<div className="text-[0.7rem] text-muted-foreground">最终 {c.final_dest}</div></TableCell>
                    <TableCell><button onClick={() => openCase(c.id)} className="text-left hover:underline">{petEmojiOf(c)} {c.pet_name} <span className="font-mono text-xs text-muted-foreground">{c.file_no}</span></button><div className="text-[0.7rem] text-muted-foreground">{c.case_type} · {c.service_scope}</div></TableCell>
                    <TableCell><StatusBadge value={stageOf(c)} kind="stage" /></TableCell>
                    <TableCell className="text-xs">{c.final_payment_status}</TableCell>
                    <TableCell className="max-w-[16rem] truncate text-xs text-[#595959]">{c.arrival_log || c.pet_notes || '—'}{!c.passport_sent && c.case_type === '托运' && <Tag tone="warn" className="ml-1">护照未寄</Tag>}</TableCell>
                    <TableCell className="text-right">{landed && <Button size="xs" onClick={() => markArrivedHome(c.id, user.id)}><Home /> 已到家</Button>}</TableCell>
                  </TableRow>
                );
              })}
              {g.list.length === 0 && <TableRow><TableCell colSpan={8} className="py-4 text-center text-muted-foreground">暂无</TableCell></TableRow>}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}

/* ---------------- 财务（只读）：需收款 ---------------- */
function FinanceTodo() {
  const cases = useAppStore((s) => s.cases);
  const fees = useAppStore((s) => s.fees);
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const [assignee, setAssignee] = useState('');
  type Item = { c: Case; when: string; type: string; detail: string; amount: number; currency: string; status: string };
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    cases.filter((c) => !c.archived && c.status === '进行中' && (!assignee || [c.ops_docs_id, c.ops_post_id, c.sales_id].includes(assignee))).forEach((c) => {
      const pay = c.timeline.find((t) => t.key === 'final_payment');
      if (pay && pay.status !== '完成' && !['已收齐全部尾款', '不适用（随机全款）'].includes(c.final_payment_status)) out.push({ c, when: pay.planned_date, type: '收尾款', detail: `${c.final_payment_point}收 · ${c.final_payment_status}`, amount: c.final_amount, currency: c.currency, status: c.final_payment_status });
      if (!c.deposit_amount && c.order_amount) out.push({ c, when: c.created_at, type: '收定金', detail: '定金未付，未排资源', amount: c.order_amount, currency: c.currency, status: '未收' });
      fees.filter((f) => f.case_id === c.id && f.bearer === '客人承担').forEach((f) => out.push({ c, when: f.date, type: '额外费用', detail: f.desc, amount: f.amount, currency: f.currency, status: '待向客人收' }));
    });
    return out.sort((a, b) => a.when.localeCompare(b.when));
  }, [cases, fees, assignee]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-sm font-semibold"><Wallet className="size-4 text-primary" /> 需收款</span>
        <span className="text-xs text-muted-foreground">一期只读：由操作部改尾款状态 / 添加客人承担的额外费用自动生成，记账在 invoice 软件</span>
        <SimpleSelect value={assignee} onChange={setAssignee} options={users.filter((u) => ['ops_docs', 'ops_post', 'sales'].includes(u.role)).map((u) => ({ value: u.id, label: u.name }))} allowEmpty="全部负责人" className="ml-auto w-32" />
      </div>
      <div className="rounded-xl bg-white ring-1 ring-foreground/10">
        <Table>
          <TableHeader><TableRow><TableHead>日期 / 星期</TableHead><TableHead>类型</TableHead><TableHead>宠物 / Case</TableHead><TableHead>File No</TableHead><TableHead>详情</TableHead><TableHead className="text-right">应收</TableHead><TableHead>币种</TableHead><TableHead>状态</TableHead><TableHead>负责人</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((it, i) => (
              <TableRow key={i} onClick={() => openCase(it.c.id)} className="cursor-pointer">
                <TableCell className={cn(it.when < today && 'text-destructive')}>{fmtMDW(it.when)}</TableCell>
                <TableCell><Tag tone={it.type === '额外费用' ? 'accent' : 'info'}>{it.type}</Tag></TableCell>
                <TableCell>{petEmojiOf(it.c)} {it.c.pet_name}</TableCell>
                <TableCell className="font-mono text-xs">{it.c.file_no}</TableCell>
                <TableCell className="text-xs text-[#595959]">{it.detail}</TableCell>
                <TableCell className="text-right font-mono">{it.amount.toLocaleString()}</TableCell>
                <TableCell>{it.currency}</TableCell>
                <TableCell className="text-xs">{it.status}</TableCell>
                <TableCell><div className="flex -space-x-1.5"><UserAvatar user={userById(it.c.ops_post_id)} size="sm" /><UserAvatar user={userById(it.c.sales_id)} size="sm" /></div></TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">没有需要收款的事项</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ---------------- 操作员 / 管理员：按周分区的任务列表 ---------------- */
function OpsTodo({ user }: { user: User }) {
  const tasks = useAppStore((s) => s.tasks);
  const cases = useAppStore((s) => s.cases);
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const updateTaskStatus = useAppStore((s) => s.updateTaskStatus);
  const isAdmin = user.role === 'admin';
  const [assignee, setAssignee] = useState('');
  const [showDone, setShowDone] = useState(false);
  const myCases = useMemo(() => new Set(visibleCases(cases, tasks, user).map((c) => c.id)), [cases, tasks, user]);
  const list = useMemo(() => tasks
    .filter((t) => (isAdmin ? true : t.assignee_id === user.id || myCases.has(t.case_id)))
    .filter((t) => !assignee || t.assignee_id === assignee)
    .filter((t) => showDone || t.status !== '已完成')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start)), [tasks, isAdmin, user.id, myCases, assignee, showDone]);
  const groups = [-1, 0, 1, 2, 3].map((i) => ({ i, label: i === -1 ? '过去' : i === 3 ? '3 周后' : weekLabel(i), range: i >= 0 && i <= 2 ? weekRange(today, i).label : '', list: list.filter((t) => { const w = weekIndex(today, t.date); return i === -1 ? w < 0 : i === 3 ? w > 2 : w === i; }) }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{isAdmin ? '全部任务' : '我的任务 + 我负责 Case 的任务'} · 按周分区，按时间排序 · 司机类任务的状态跟司机页面联动</span>
        <SimpleSelect value={assignee} onChange={setAssignee} options={users.filter((u) => ['driver', 'ops_docs', 'ops_post', 'admin'].includes(u.role)).map((u) => ({ value: u.id, label: u.name }))} allowEmpty="全部负责人" className="w-32" />
        <Button size="xs" variant={showDone ? 'secondary' : 'ghost'} onClick={() => setShowDone((v) => !v)}>{showDone ? '隐藏已完成' : '显示已完成'}</Button>
        <div className="ml-auto"><CreateTaskDialog user={user} /></div>
      </div>
      {groups.map((g) => (g.list.length === 0 && g.i === -1 ? null : (
        <section key={g.i} className="overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
          <header className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-sm font-semibold">{g.label}<span className="text-xs font-normal text-muted-foreground">{g.range}</span><span className="rounded-full bg-white px-1.5 text-xs font-normal text-muted-foreground ring-1 ring-foreground/10">{g.list.length}</span></header>
          <Table>
            <TableHeader>
              <TableRow className="text-xs hover:bg-transparent"><TableHead className="h-8">日期 / 星期</TableHead><TableHead className="h-8">时间</TableHead><TableHead className="h-8">类型</TableHead><TableHead className="h-8">宠物 / Case</TableHead><TableHead className="h-8">详情</TableHead><TableHead className="h-8">负责人</TableHead><TableHead className="h-8">状态</TableHead><TableHead className="h-8" /></TableRow>
            </TableHeader>
            <TableBody>
              {g.list.map((t) => {
                const c = cases.find((x) => x.id === t.case_id);
                const d = diffDays(today, t.date);
                const driver = isDriverTask(t.type);
                const canEdit = isAdmin || (c && c.ops_docs_id === user.id) || t.created_by === user.id;
                return (
                  <TableRow key={t.id} className={cn(d === 0 && 'bg-warning/10')}>
                    <TableCell><div>{fmtMDW(t.date)}</div><div className={cn('text-xs', d < 0 ? 'text-destructive' : 'text-muted-foreground')}>{relativeLabel(t.date, today)}</div></TableCell>
                    <TableCell className="font-mono text-xs">{t.time_start}{t.time_end ? `–${t.time_end}` : ''}</TableCell>
                    <TableCell><StatusBadge value={t.type} kind="taskType" /><div className="text-[0.65rem] text-muted-foreground">{driver ? '司机' : '操作'}</div></TableCell>
                    <TableCell>{c && <button onClick={() => openCase(c.id)} className="text-left hover:underline">{petEmojiOf(c)} {c.pet_name} <span className="font-mono text-xs text-muted-foreground">{c.file_no}</span></button>}</TableCell>
                    <TableCell className="max-w-[20rem] text-xs text-[#595959]">
                      <div className="truncate" title={`${t.pickup_addr} → ${t.dest_addr}`}>{t.pickup_addr ? `${c?.origin ?? ''} ${t.pickup_addr} → ${t.dest_addr}` : ''}</div>
                      {t.notes && <div className="truncate text-muted-foreground">{t.notes}</div>}
                      {!t.change_acked && t.change_note && <Tag tone="danger">司机未确认变动</Tag>}
                    </TableCell>
                    <TableCell><span className="inline-flex items-center gap-1.5"><UserAvatar user={userById(t.assignee_id)} size="sm" />{userById(t.assignee_id)?.name}</span></TableCell>
                    <TableCell><StatusBadge value={t.status} kind="task" />{t.status === '无法确认' && <div className="text-[0.65rem] text-destructive">{t.decline_reason}</div>}{t.status === '异常' && <div className="text-[0.65rem] text-destructive">{t.exception_reason}</div>}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {canEdit && t.status !== '已完成' && <EditTaskDialog t={t} user={user} />}
                      {!driver && t.status !== '已完成' && (t.assignee_id === user.id || isAdmin) && <Button size="xs" variant="outline" className="ml-1" onClick={() => updateTaskStatus(t.id, '已完成', user.id)}><Check /> 完成</Button>}
                      {driver && t.status !== '已完成' && isAdmin && <Button size="xs" variant="ghost" className="ml-1" onClick={() => updateTaskStatus(t.id, '已完成', user.id)}>代司机完成</Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {g.list.length === 0 && <TableRow><TableCell colSpan={8} className="py-4 text-center text-muted-foreground">没有任务</TableCell></TableRow>}
            </TableBody>
          </Table>
        </section>
      )))}
    </div>
  );
}
