'use client';

import { Check, AlertTriangle, CircleDot, FileWarning, MousePointerClick } from 'lucide-react';
import type { Case, CaseStep, SectionKey, User } from '@/types';
import { roles, SECTION_META } from '@/data/roles';
import { useAppStore } from '@/store/useAppStore';
import { STEP_STATUS_COLOR } from '@/lib/buckets';
import { fmtDate, relativeLabel } from '@/lib/dates';
import { stepProgress } from '@/lib/workflow';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';

/** workflow 步骤 → 页面分区 */
export function stepSection(key: string): SectionKey {
  if (key === 'booking' || key === 'flight_track') return 'flight';
  if (key === 'final_payment') return 'payment';
  if (key === 'archive') return 'log';
  if (['driver_airport', 'remind_checkin', 'customs', 'cfia_arrival', 'quarantine_au', 'home'].includes(key)) return 'driver';
  return 'docs';
}

/** 滚动到分区并短暂高亮 */
export function scrollToSection(section: SectionKey) {
  const el = document.getElementById(`sec-${section}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.classList.add('ring-2', 'ring-primary/50');
  window.setTimeout(() => el.classList.remove('ring-2', 'ring-primary/50'), 1600);
}

export function WorkflowProgress({ c, user }: { c: Case; user: User }) {
  const today = useAppStore((s) => s.today);
  const completeCaseStep = useAppStore((s) => s.completeCaseStep);
  const tpl = useAppStore((s) => s.workflows.find((w) => w.id === c.template_id));
  const { done, total, pct } = stepProgress(c.timeline);
  const current = c.timeline.find((s) => s.key === c.current_step_key);
  const canComplete = (st: CaseStep) => st.status !== '完成' && (user.role === 'admin' || user.role === st.owner_role);
  const sectionLabel = (key: string) => SECTION_META.find((s) => s.key === stepSection(key))!;

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-foreground/10">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Workflow</span>
        <span>{tpl?.name}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><MousePointerClick className="size-3" /> 点步骤跳到对应分区</span>
        <span className="ml-auto">{done}/{total} 步 · {pct}%</span>
      </div>
      <div className="thin-scroll overflow-x-auto pb-1">
        <ol className="flex min-w-max items-start">
          {c.timeline.map((st, i) => {
            const color = STEP_STATUS_COLOR[st.status];
            const isCur = st.key === c.current_step_key;
            const target = sectionLabel(st.key);
            return (
              <li key={st.key} className="relative flex w-[5.75rem] flex-col items-center">
                {i < c.timeline.length - 1 && (
                  <span className="absolute top-[0.7rem] left-1/2 h-0.5 w-full" style={{ background: st.status === '完成' ? STEP_STATUS_COLOR['完成'] : '#e2e2e2' }} />
                )}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => scrollToSection(stepSection(st.key))}
                        className={cn('group/step relative z-10 flex flex-col items-center outline-none', 'cursor-pointer')}
                      />
                    }
                  >
                    <span
                      className={cn('flex size-6 items-center justify-center rounded-full ring-2 ring-white transition-transform group-hover/step:scale-110', isCur && 'ring-4 ring-accent-2')}
                      style={{ background: color, color: st.status === '未开始' ? '#8f8f8f' : '#fff' }}
                    >
                      {st.status === '完成' ? <Check className="size-3.5" /> : st.status === '延误' ? <AlertTriangle className="size-3" /> : st.status === '进行中' ? <CircleDot className="size-3.5" /> : <span className="text-[0.65rem]">{i + 1}</span>}
                    </span>
                    <span className={cn('mt-1.5 px-1 text-center text-[0.7rem] leading-tight group-hover/step:underline', isCur ? 'font-semibold text-foreground' : 'text-[#595959]')}>{st.label}</span>
                    <span className={cn('mt-0.5 text-[0.65rem]', st.status === '延误' ? 'text-destructive' : 'text-muted-foreground')}>{fmtDate(st.planned_date)}</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[16rem]">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 font-medium">{st.label} <StatusBadge value={st.status} kind="step" /></div>
                      <div className="text-white/75">计划 {fmtDate(st.planned_date)}（{relativeLabel(st.planned_date, today)}） · {st.offset_rule}</div>
                      <div className="text-white/75">负责人 {roles[st.owner_role].label}</div>
                      {st.missing_docs.length > 0 && <div className="flex flex-wrap gap-1">{st.missing_docs.map((d) => <Tag key={d} tone="warn"><FileWarning className="mr-0.5 size-3" />{d}</Tag>)}</div>}
                      <div className="text-white/75">点击跳到 {target.index} {target.label}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ol>
      </div>
      {current && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs">
          <span className="text-muted-foreground">当前步骤</span>
          <span className="text-sm font-medium text-foreground">{current.label}</span>
          <StatusBadge value={current.status} kind="step" />
          <span className="text-muted-foreground">计划 {fmtDate(current.planned_date)}（{relativeLabel(current.planned_date, today)}）</span>
          <span className="text-muted-foreground">负责人 {roles[current.owner_role].label}</span>
          {current.missing_docs.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">缺</span>
              {current.missing_docs.map((d) => <Tag key={d} tone="warn"><FileWarning className="mr-0.5 size-3" />{d}</Tag>)}
            </span>
          )}
          {current.description && <span className="basis-full text-[#595959]">{current.description}</span>}
          <span className="ml-auto flex items-center gap-1.5">
            <Button size="xs" variant="ghost" onClick={() => scrollToSection(stepSection(current.key))}>去 {sectionLabel(current.key).index} 分区</Button>
            {canComplete(current) && <Button size="xs" onClick={() => completeCaseStep(c.id, current.key, user.id)}><Check /> 标记完成</Button>}
          </span>
        </div>
      )}
    </div>
  );
}
