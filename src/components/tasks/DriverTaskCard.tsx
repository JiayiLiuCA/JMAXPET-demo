'use client';

import { MapPin, ArrowDown, Phone, AlertTriangle, Check } from 'lucide-react';
import type { Task, TaskStatus, User } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { petEmojiOf } from '@/data/cases';
import { TASK_STATUS_COLOR } from '@/lib/buckets';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FLOW: Record<string, TaskStatus[]> = {
  送医院: ['待开始', '已出发', '已接到', '已到医院', '已完成'],
  采血: ['待开始', '已出发', '已接到', '已到医院', '已完成'],
  default: ['待开始', '已出发', '已接到', '已完成'],
};

/** 司机手机端任务卡片：大按钮、单列 */
export function DriverTaskCard({ t, user }: { t: Task; user: User }) {
  const c = useAppStore((s) => s.cases.find((x) => x.id === t.case_id));
  const updateTaskStatus = useAppStore((s) => s.updateTaskStatus);
  const flow = FLOW[t.type] ?? FLOW.default;
  const idx = flow.indexOf(t.status);
  const next = t.status === '异常' ? null : flow[idx + 1];
  const done = t.status === '已完成';
  return (
    <div className={cn('rounded-2xl bg-white p-4 ring-1 ring-foreground/10', done && 'opacity-70', t.status === '异常' && 'ring-2 ring-destructive/40')}>
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2.5 py-1 text-sm font-semibold text-white" style={{ background: TASK_STATUS_COLOR[t.status] === '#8f8f8f' ? '#2b5672' : TASK_STATUS_COLOR[t.status] }}>{t.type}</span>
        <span className="text-lg font-semibold">{t.time_start}–{t.time_end}</span>
        <StatusBadge value={t.status} kind="task" className="ml-auto" />
      </div>
      {c && (
        <div className="mt-2 flex items-center gap-2 text-base">
          <span className="text-xl">{petEmojiOf(c)}</span>
          <span className="font-medium">{c.pet_name}</span>
          <span className="text-sm text-muted-foreground">{c.breed} · {c.weight} kg · {c.crate_no.split(' ')[1] ?? ''}</span>
        </div>
      )}
      {t.pickup_addr && (
        <div className="mt-3 space-y-1 rounded-xl bg-muted/70 p-3 text-sm">
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span>{t.pickup_addr}</span></div>
          <div className="pl-1 text-muted-foreground"><ArrowDown className="size-4" /></div>
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-danger" /><span>{t.dest_addr}</span></div>
        </div>
      )}
      {t.notes && <div className="mt-2 text-sm text-[#595959]">📝 {t.notes}</div>}
      <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        <span>主人确认 {t.owner_confirmed ? '✅' : '⏳'}</span>
        <span>司机确认 {t.driver_confirmed ? '✅' : '⏳'}</span>
        {c && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{c.owner_phone_intl}</span>}
      </div>
      {/* 流程指示 */}
      <div className="mt-3 flex items-center gap-1">
        {flow.map((s, i) => (
          <span key={s} className={cn('h-1.5 flex-1 rounded-full', i <= idx && t.status !== '异常' ? 'bg-primary' : 'bg-border')} title={s} />
        ))}
      </div>
      {!done && t.status !== '异常' && (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          {next && (
            <Button size="lg" className="h-12 text-base" onClick={() => updateTaskStatus(t.id, next, user.id)}>
              <Check className="size-5" /> {next}
            </Button>
          )}
          <Button size="lg" variant="outline" className="h-12 border-destructive/40 text-base text-destructive" onClick={() => updateTaskStatus(t.id, '异常', user.id)}>
            <AlertTriangle className="size-5" /> 异常
          </Button>
        </div>
      )}
      {t.status === '异常' && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-destructive">已标记异常，运营会联系你</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => updateTaskStatus(t.id, '待开始', user.id)}>撤销</Button>
        </div>
      )}
    </div>
  );
}
