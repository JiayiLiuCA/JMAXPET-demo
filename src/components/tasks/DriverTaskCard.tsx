'use client';

import { useState } from 'react';
import { MapPin, ArrowDown, Phone, AlertTriangle, Check, Navigation, X, Eye } from 'lucide-react';
import type { Task, TaskStatus, User } from '@/types';
import { DECLINE_REASONS, EXCEPTION_REASONS } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { petEmojiOf } from '@/data/cases';
import { TASK_TYPE_COLOR } from '@/lib/buckets';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SimpleSelect } from '@/components/common/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** 不同类型的状态流；CFIA 盖章不需要"已接到" */
const FLOW: Record<string, TaskStatus[]> = {
  'CFIA 盖章': ['已确认', '已出发', '已完成'],
  default: ['已确认', '已出发', '已接到', '已完成'],
};
const NEXT_LABEL: Record<string, string> = { 已出发: '已出发', 已接到: '已接到宠物', 已完成: '已完成' };

const telHref = (p: string) => `tel:${p.replace(/[\s-]/g, '')}`;
const mapHref = (a: string) => `https://maps.google.com/?q=${encodeURIComponent(a)}`;

/** 司机手机端任务卡片：大按钮、单列；地址点导航、电话点拨打 */
export function DriverTaskCard({ t, user, readOnly }: { t: Task; user: User; readOnly?: boolean }) {
  const c = useAppStore((s) => s.cases.find((x) => x.id === t.case_id));
  const updateTaskStatus = useAppStore((s) => s.updateTaskStatus);
  const driverDecline = useAppStore((s) => s.driverDecline);
  const reportException = useAppStore((s) => s.reportException);
  const ackTaskChange = useAppStore((s) => s.ackTaskChange);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [excOpen, setExcOpen] = useState(false);
  const [reason, setReason] = useState<string>(DECLINE_REASONS[0]);
  const [excReason, setExcReason] = useState<string>(EXCEPTION_REASONS[0]);
  const [note, setNote] = useState('');

  const flow = FLOW[t.type] ?? FLOW.default;
  const idx = flow.indexOf(t.status);
  const next = idx >= 0 ? flow[idx + 1] : undefined;
  const done = t.status === '已完成';
  const color = TASK_TYPE_COLOR[t.type] ?? '#2b5672';

  return (
    <div className={cn('rounded-2xl bg-white p-4 ring-1 ring-foreground/10', done && 'opacity-75', t.status === '异常' && 'ring-2 ring-destructive/40', t.status === '无法确认' && 'ring-2 ring-warning')}>
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2.5 py-1 text-sm font-semibold text-white" style={{ background: color }}>{t.type}</span>
        <span className="text-lg font-semibold">{t.time_start}{t.time_end ? `–${t.time_end}` : ''}</span>
        <StatusBadge value={t.status} kind="task" className="ml-auto" />
      </div>
      {c && (
        <div className="mt-2 flex items-center gap-2 text-base">
          <span className="text-xl">{petEmojiOf(c)}</span>
          <span className="font-medium">{c.pet_name}</span>
          <span className="text-sm text-muted-foreground">{c.breed} · {c.weight} kg{c.crate_size ? ` · ${c.crate_size.split(' ')[1] ?? ''}` : ''}</span>
        </div>
      )}
      {!t.change_acked && t.change_note && (
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1"><span className="font-medium">任务有变动：</span>{t.change_note}</span>
          {!readOnly && <Button size="sm" variant="destructive" onClick={() => ackTaskChange(t.id, user.id)}><Eye /> 我已看到</Button>}
        </div>
      )}
      {t.pickup_addr && (
        <div className="mt-3 space-y-1 rounded-xl bg-muted/70 p-3 text-sm">
          <AddrLine addr={t.pickup_addr} phone={t.pickup_phone} tone="primary" />
          <div className="pl-1 text-muted-foreground"><ArrowDown className="size-4" /></div>
          <AddrLine addr={t.dest_addr} phone={t.dest_phone} tone="danger" />
        </div>
      )}
      {t.notes && <div className="mt-2 text-sm text-[#595959]">📝 {t.notes}</div>}
      {c?.owner_phone_intl && (
        <div className="mt-2 text-xs text-muted-foreground">
          主人 {c.owner_name} · <a href={telHref(c.owner_phone_intl)} className="inline-flex items-center gap-1 underline"><Phone className="size-3" />{c.owner_phone_intl}</a>
        </div>
      )}
      {t.status === '无法确认' && <div className="mt-2 text-sm text-[#6b4f12]">已提交无法确认：{t.decline_reason}，等运营重新安排</div>}
      {t.status === '异常' && <div className="mt-2 text-sm text-destructive">异常：{t.exception_reason}{t.exception_note ? ` · ${t.exception_note}` : ''}；运营会联系你</div>}

      {/* 流程指示 */}
      <div className="mt-3 flex items-center gap-1">
        {flow.map((s, i) => <span key={s} className={cn('h-1.5 flex-1 rounded-full', i <= idx ? 'bg-primary' : 'bg-border')} title={s} />)}
      </div>

      {!readOnly && t.status === '待确认' && (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <Button size="lg" className="h-12 text-base" onClick={() => updateTaskStatus(t.id, '已确认', user.id)}><Check className="size-5" /> 司机确认</Button>
          <Button size="lg" variant="outline" className="h-12 text-base" onClick={() => setDeclineOpen(true)}><X className="size-5" /> 无法确认</Button>
        </div>
      )}
      {!readOnly && idx >= 0 && !done && (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          {next && <Button size="lg" className="h-12 text-base" onClick={() => updateTaskStatus(t.id, next, user.id)}><Check className="size-5" /> {NEXT_LABEL[next] ?? next}</Button>}
          <Button size="lg" variant="outline" className="h-12 border-destructive/40 text-base text-destructive" onClick={() => setExcOpen(true)}><AlertTriangle className="size-5" /> 异常</Button>
        </div>
      )}
      {!readOnly && t.status === '异常' && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => updateTaskStatus(t.id, '已确认', user.id)}>异常已解决，继续任务</Button>
        </div>
      )}

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>无法确认这个任务</DialogTitle><DialogDescription>提交后会第一时间通知操作部管理员和负责该 Case 的操作员。</DialogDescription></DialogHeader>
          <SimpleSelect value={reason} onChange={setReason} options={DECLINE_REASONS} className="w-full" size="default" />
          <Textarea rows={2} placeholder="补充说明（可选）" value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={() => { driverDecline(t.id, note ? `${reason}：${note}` : reason, user.id); setDeclineOpen(false); setNote(''); }}>提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={excOpen} onOpenChange={setExcOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>上报异常</DialogTitle><DialogDescription>提交后第一时间短信 + 站内通知操作部管理员和负责该 Case 的操作员。</DialogDescription></DialogHeader>
          <SimpleSelect value={excReason} onChange={setExcReason} options={EXCEPTION_REASONS} className="w-full" size="default" />
          <Textarea rows={2} placeholder="具体情况，例如：DVP 堵车，预计迟到 20 分钟" value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={() => { reportException(t.id, excReason, note, user.id); setExcOpen(false); setNote(''); }}>提交异常</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddrLine({ addr, phone, tone }: { addr: string; phone: string; tone: 'primary' | 'danger' }) {
  return (
    <div className="flex items-start gap-2">
      <MapPin className={cn('mt-0.5 size-4 shrink-0', tone === 'primary' ? 'text-primary' : 'text-danger')} />
      <div className="min-w-0 flex-1">
        <a href={mapHref(addr)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-dotted">{addr}<Navigation className="size-3 text-muted-foreground" /></a>
        {phone && <a href={telHref(phone)} className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{phone}</a>}
      </div>
    </div>
  );
}
