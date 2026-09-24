'use client';

import { useMemo, useState } from 'react';
import { Siren, CheckCircle2, MessageSquareText, PlaneTakeoff, Truck, AlertTriangle, UserRound, Clock } from 'lucide-react';
import type { Alert, AlertKind } from '@/types';
import { users, userById, userName } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { fmtDateTime, fmtMDW, relativeLabel } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Tag } from '@/components/common/StatusBadge';
import { SimpleSelect } from '@/components/common/Field';
import { cn } from '@/lib/utils';

const KIND_META: Record<AlertKind, { label: string; icon: typeof Siren; color: string }> = {
  flight_change: { label: '航变（订舱）', icon: PlaneTakeoff, color: '#e03939' },
  ops_flight_change: { label: '航变（操作）', icon: PlaneTakeoff, color: '#a2675b' },
  task_change: { label: '司机任务变动', icon: Truck, color: '#d2ac72' },
  driver_exception: { label: '司机异常', icon: AlertTriangle, color: '#e03939' },
  driver_decline: { label: '司机无法确认', icon: Truck, color: '#e03939' },
  accompany_exception: { label: '随机异常', icon: UserRound, color: '#7a8fc9' },
};

/**
 * 紧急变动：航变、司机任务变动、司机异常全部同步到这里，相关人手动确认（二次弹窗），
 * 按宠物出发时间排序，确认后仍保留，直到宠物到家才消失。
 */
export default function AlertsPage() {
  const user = useCurrentUser();
  const alerts = useAppStore((s) => s.alerts);
  const cases = useAppStore((s) => s.cases);
  const sms = useAppStore((s) => s.sms);
  const [showConfirmed, setShowConfirmed] = useState(true);
  const [filterUser, setFilterUser] = useState('');

  const list = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.role === 'admin';
    return alerts
      .filter((a) => !a.resolved)
      .filter((a) => (isAdmin ? !filterUser || a.targets.includes(filterUser) : a.targets.includes(user.id)))
      .filter((a) => showConfirmed || !a.confirmations[user.id])
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date) || b.created_at.localeCompare(a.created_at));
  }, [alerts, user, showConfirmed, filterUser]);
  if (!user) return null;
  const isDriver = user.role === 'driver';
  const pending = list.filter((a) => !a.confirmations[user.id]).length;

  return (
    <div className={cn('space-y-3', !isDriver && 'mx-auto max-w-5xl')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm"><Siren className="size-4 text-destructive" /> <span className="font-semibold">{pending}</span> 条待确认</span>
        <span className="text-xs text-muted-foreground">按宠物出发时间排序 · 确认后仍保留，到家后自动消失</span>
        {user.role === 'admin' && <SimpleSelect value={filterUser} onChange={setFilterUser} options={users.filter((u) => u.role !== 'finance').map((u) => ({ value: u.id, label: u.name }))} allowEmpty="全部相关人" className="ml-auto w-32" />}
        <Button size="xs" variant={showConfirmed ? 'secondary' : 'ghost'} onClick={() => setShowConfirmed((v) => !v)}>{showConfirmed ? '隐藏我已确认的' : '显示我已确认的'}</Button>
      </div>
      {list.map((a) => <AlertCard key={a.id} a={a} userId={user.id} compact={isDriver} />)}
      {list.length === 0 && <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">没有紧急变动</div>}

      {user.role === 'admin' && (
        <section className="mt-6 overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
          <header className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-sm font-semibold"><MessageSquareText className="size-4 text-primary" /> 短信发送记录 <span className="text-xs font-normal text-muted-foreground">只在紧急事件时发给管理员 + 负责人 + 接单销售；未配置 Twilio 时为模拟发送</span></header>
          <ul className="divide-y">
            {sms.map((r) => {
              const c = cases.find((x) => x.id === alerts.find((al) => al.id === r.alert_id)?.case_id);
              return (
                <li key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5 text-sm">
                  <span className="w-28 shrink-0 text-xs text-muted-foreground">{fmtDateTime(r.at)}</span>
                  <Tag tone={r.status === 'sent' ? 'ok' : r.status === 'failed' ? 'danger' : 'neutral'}>{r.status === 'sent' ? '已发送' : r.status === 'failed' ? '失败' : '模拟'}</Tag>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[#595959]">{r.body}</span>
                    <span className="block text-xs text-muted-foreground">收件人：{r.to_user_ids.map((id) => `${userName(id)} ${userById(id)?.phone ?? ''}`).join('，')} · {r.detail}{c ? ` · ${c.file_no}` : ''}</span>
                  </span>
                </li>
              );
            })}
            {sms.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">还没有发过短信</li>}
          </ul>
        </section>
      )}
    </div>
  );
}

function AlertCard({ a, userId, compact }: { a: Alert; userId: string; compact?: boolean }) {
  const c = useAppStore((s) => s.cases.find((x) => x.id === a.case_id));
  const today = useAppStore((s) => s.today);
  const confirmAlert = useAppStore((s) => s.confirmAlert);
  const openCase = useOpenCase();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const meta = KIND_META[a.kind];
  const Icon = meta.icon;
  const mine = a.confirmations[userId];
  const isTarget = a.targets.includes(userId);
  const confirmedCount = a.targets.filter((t) => a.confirmations[t]).length;
  return (
    <div className={cn('rounded-xl bg-white p-4 ring-1 ring-foreground/10', !mine && isTarget && 'ring-2 ring-destructive/40')}>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${meta.color}22`, color: meta.color }}><Icon className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-sm font-semibold">{a.title}</span>
            <Tag tone="neutral">{meta.label}</Tag>
            {a.sms_status !== 'none' && <Tag tone={a.sms_status === 'sent' ? 'ok' : 'neutral'}><MessageSquareText className="mr-0.5 size-3" />短信{a.sms_status === 'sent' ? '已发' : a.sms_status === 'failed' ? '失败' : '已模拟'}</Tag>}
            {mine && <Tag tone="ok"><CheckCircle2 className="mr-0.5 size-3" />我已确认</Tag>}
          </div>
          <p className="mt-1 text-sm text-[#595959]">{a.detail}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {c && (
              <button onClick={() => !compact && openCase(c.id)} className={cn(!compact && 'hover:underline')}>{petEmojiOf(c)} {c.pet_name} <span className="font-mono">{c.file_no}</span></button>
            )}
            <span className="inline-flex items-center gap-1"><Clock className="size-3" />出发 {fmtMDW(a.departure_date)}（{relativeLabel(a.departure_date, today)}）</span>
            <span>{userName(a.created_by)} · {fmtDateTime(a.created_at)}</span>
          </div>
          {!compact && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">确认 {confirmedCount}/{a.targets.length}：</span>
              {a.targets.map((t) => (
                <span key={t} className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5', a.confirmations[t] ? 'bg-success/20 text-[#2f5a3c]' : 'bg-muted text-muted-foreground')}>
                  <UserAvatar user={userById(t)} size="sm" />{userName(t)}{a.confirmations[t] ? ' ✓' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
        {isTarget && !mine && <Button size={compact ? 'lg' : 'sm'} variant="destructive" onClick={() => setStep(1)}>我已确认</Button>}
      </div>

      <Dialog open={step > 0} onOpenChange={(o) => !o && setStep(0)}>
        <DialogContent className="sm:max-w-sm">
          {step === 1 ? (
            <>
              <DialogHeader><DialogTitle>确认已看见这条变动？</DialogTitle><DialogDescription>{a.kind === 'task_change' ? '确认你已经了解新的时间 / 地址。' : '确认你已经看见、了解，并且已经通知过客人。'}</DialogDescription></DialogHeader>
              <DialogFooter><Button variant="outline" onClick={() => setStep(0)}>还没有</Button><Button onClick={() => setStep(2)}>是的，我已看见</Button></DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle>再确认一次</DialogTitle><DialogDescription>是否已经做完该做的事情（改期 / 通知客人 / 重新安排）？确认后这条记录仍会保留，直到宠物到家。</DialogDescription></DialogHeader>
              <DialogFooter><Button variant="outline" onClick={() => setStep(0)}>还没做完</Button><Button variant="destructive" onClick={() => { confirmAlert(a.id, userId); setStep(0); }}>已做完，确认</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
