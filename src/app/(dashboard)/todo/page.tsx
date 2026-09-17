'use client';

import { useMemo, useState } from 'react';
import { PlaneTakeoff, FolderOpen, Check } from 'lucide-react';
import type { Task, User } from '@/types';
import { users, userById } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { BOOKING_PENDING, visibleCases } from '@/lib/permissions';
import { diffDays, fmtDate, fmtDateFull, relativeLabel } from '@/lib/dates';
import { DriverTaskCard } from '@/components/tasks/DriverTaskCard';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { SimpleSelect } from '@/components/common/Field';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/case/CreateTaskDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function TodoPage() {
  const user = useCurrentUser();
  if (!user) return null;
  if (user.role === 'driver') return <DriverTodo user={user} />;
  if (user.role === 'booking') return <BookingTodo user={user} />;
  return <OpsTodo user={user} />;
}

/* ---------------- 司机：手机端 ---------------- */
function DriverTodo({ user }: { user: User }) {
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const mine = useMemo(() => tasks.filter((t) => t.assignee_id === user.id).sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start)), [tasks, user.id]);
  const groups: { label: string; list: Task[] }[] = [
    { label: '今天', list: mine.filter((t) => diffDays(today, t.date) === 0) },
    { label: '明天', list: mine.filter((t) => diffDays(today, t.date) === 1) },
    { label: '之后', list: mine.filter((t) => diffDays(today, t.date) > 1) },
    { label: '过去', list: mine.filter((t) => diffDays(today, t.date) < 0).reverse() },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserAvatar user={user} />
        <div>
          <div className="text-base font-semibold">{user.name}，你好</div>
          <div className="text-xs text-muted-foreground">{fmtDateFull(today)} · 今天 {groups[0].list.filter((t) => t.status !== '已完成').length} 个任务待做</div>
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
            {g.list.length === 0 && <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">没有任务</div>}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------------- 订舱：只看被指派的订舱任务 ---------------- */
function BookingTodo({ user }: { user: User }) {
  const cases = useAppStore((s) => s.cases);
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const mine = useMemo(() => cases.filter((c) => !c.archived && c.booking_id === user.id), [cases, user.id]);
  const pending = mine.filter((c) => (BOOKING_PENDING as readonly string[]).includes(c.airline_confirmed)).sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  const done = mine.filter((c) => !(BOOKING_PENDING as readonly string[]).includes(c.airline_confirmed)).sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  const Row = ({ c }: { c: (typeof mine)[number] }) => (
    <button onClick={() => openCase(c.id)} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-foreground/10 transition-all hover:shadow-md">
      <span className="text-xl">{petEmojiOf(c)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{c.pet_name}</span>
          <span className="font-mono text-xs text-muted-foreground">{c.file_no}</span>
          <StatusBadge value={c.airline_confirmed} kind="airline" />
          {c.risk_tags.includes('时间') && <Tag tone="danger">风险 · 时间</Tag>}
        </div>
        <div className="mt-0.5 text-xs text-[#595959]">{c.route} · {fmtDate(c.departure_date)} 出发（{relativeLabel(c.departure_date, today)}） · {c.breed} {c.weight} kg · {c.crate_no}</div>
        {c.notes_extra && <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.notes_extra}</div>}
      </div>
      <FolderOpen className="size-4 text-muted-foreground" />
    </button>
  );
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><PlaneTakeoff className="size-4 text-primary" /> 待处理订舱 <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{pending.length}</span></h2>
        <div className="space-y-2">{pending.map((c) => <Row key={c.id} c={c} />)}</div>
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Check className="size-4" /> 已确认 / 已飞 <span className="rounded-full bg-muted px-1.5 text-xs font-normal">{done.length}</span></h2>
        <div className="space-y-2 opacity-80">{done.map((c) => <Row key={c.id} c={c} />)}</div>
      </section>
    </div>
  );
}

/* ---------------- 操作员 / 管理员：任务列表 ---------------- */
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{isAdmin ? '全部任务' : '我的任务 + 我负责 Case 的任务'}</span>
        {isAdmin && <SimpleSelect value={assignee} onChange={setAssignee} options={users.map((u) => ({ value: u.id, label: u.name }))} allowEmpty="全部负责人" className="w-32" />}
        <Button size="xs" variant={showDone ? 'secondary' : 'ghost'} onClick={() => setShowDone((v) => !v)}>{showDone ? '隐藏已完成' : '显示已完成'}</Button>
        <div className="ml-auto"><CreateTaskDialog user={user} /></div>
      </div>
      <div className="rounded-xl bg-white ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow><TableHead>日期</TableHead><TableHead>时间</TableHead><TableHead>类型</TableHead><TableHead>宠物 / Case</TableHead><TableHead>提货 → 目的</TableHead><TableHead>负责人</TableHead><TableHead>状态</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {list.map((t) => {
              const c = cases.find((x) => x.id === t.case_id);
              const d = diffDays(today, t.date);
              return (
                <TableRow key={t.id} className={cn(d === 0 && 'bg-warning/10')}>
                  <TableCell><div>{fmtDate(t.date)}</div><div className={cn('text-xs', d < 0 ? 'text-destructive' : 'text-muted-foreground')}>{relativeLabel(t.date, today)}</div></TableCell>
                  <TableCell className="font-mono text-xs">{t.time_start}–{t.time_end}</TableCell>
                  <TableCell><Tag tone="info">{t.type}</Tag></TableCell>
                  <TableCell>
                    {c && <button onClick={() => openCase(c.id)} className="text-left hover:underline">{petEmojiOf(c)} {c.pet_name} <span className="font-mono text-xs text-muted-foreground">{c.file_no}</span></button>}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-[#595959]" title={`${t.pickup_addr} → ${t.dest_addr}`}>{t.pickup_addr ? `${t.pickup_addr} → ${t.dest_addr}` : t.notes || '—'}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1.5"><UserAvatar user={userById(t.assignee_id)} size="sm" />{userById(t.assignee_id)?.name}</span></TableCell>
                  <TableCell><StatusBadge value={t.status} kind="task" /></TableCell>
                  <TableCell className="text-right">
                    {t.status !== '已完成' && (t.assignee_id === user.id || isAdmin) && <Button size="xs" variant="outline" onClick={() => updateTaskStatus(t.id, '已完成', user.id)}><Check /> 完成</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
            {list.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">没有任务</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
