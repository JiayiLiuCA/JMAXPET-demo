import { cn } from '@/lib/utils';
import { ACCOMPANY_STATUS_COLOR, AIRLINE_STATUS_COLOR, CASE_TYPE_COLOR, STAGE_COLOR, STEP_STATUS_COLOR, TASK_STATUS_COLOR, TASK_TYPE_COLOR } from '@/lib/buckets';

const MAPS = { airline: AIRLINE_STATUS_COLOR, accompany: ACCOMPANY_STATUS_COLOR, step: STEP_STATUS_COLOR, task: TASK_STATUS_COLOR, stage: STAGE_COLOR, caseType: CASE_TYPE_COLOR, taskType: TASK_TYPE_COLOR } as const;

export function StatusBadge({ value, kind, className, color }: { value: string; kind?: keyof typeof MAPS; className?: string; color?: string }) {
  const c = color ?? (kind ? MAPS[kind][value] : undefined) ?? '#8f8f8f';
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap', className)} style={{ background: `${c}22`, color: '#2b5672' }}>
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {value || '—'}
    </span>
  );
}

export function Tag({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'neutral' | 'info' | 'warn' | 'danger' | 'ok' | 'accent'; className?: string }) {
  const tones = {
    neutral: 'bg-muted text-[#595959]',
    info: 'bg-accent-2 text-foreground',
    warn: 'bg-warning/40 text-[#6b4f12]',
    danger: 'bg-destructive/10 text-destructive',
    ok: 'bg-success/25 text-[#2f5a3c]',
    accent: 'bg-accent text-foreground',
  };
  return <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap', tones[tone], className)}>{children}</span>;
}
