import { Lock, Pencil, Eye } from 'lucide-react';
import type { Case, SectionKey, Task } from '@/types';
import { SECTION_META } from '@/data/roles';
import { sectionOwner, sectionProgress } from '@/lib/permissions';
import { UserAvatar } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';

export function SectionCard({ section, canEdit, children, actions, className }: { section: SectionKey; canEdit: boolean; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  const meta = SECTION_META.find((s) => s.key === section)!;
  return (
    <section id={`sec-${section}`} className={cn('rounded-xl bg-white p-4 ring-1 ring-foreground/10', className)}>
      <header className="mb-3 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{meta.index}</span>
        <h3 className="font-heading text-sm font-semibold text-foreground">{meta.label}</h3>
        <span className={cn('ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.65rem]', canEdit ? 'bg-success/25 text-[#2f5a3c]' : 'bg-muted text-muted-foreground')}>
          {canEdit ? <Pencil className="size-2.5" /> : <Eye className="size-2.5" />}
          {canEdit ? '可编辑' : '只读'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">{actions}</div>
      </header>
      {children}
    </section>
  );
}

/** 无权限分区：灰色卡片，只显示负责人与进度 */
export function LockedSection({ section, c, tasks, className }: { section: SectionKey; c: Case; tasks: Task[]; className?: string }) {
  const meta = SECTION_META.find((s) => s.key === section)!;
  const owner = sectionOwner(c, section);
  const p = sectionProgress(c, tasks, section);
  const tone = p.label === '已完成' ? 'bg-success/25 text-[#2f5a3c]' : p.label === '进行中' ? 'bg-warning/40 text-[#6b4f12]' : 'bg-muted text-muted-foreground';
  return (
    <section id={`sec-${section}`} className={cn('rounded-xl border border-dashed border-border bg-muted/60 p-4 transition-shadow', className)}>
      <header className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{meta.index}</span>
        <h3 className="font-heading text-sm font-medium text-muted-foreground">{meta.label}</h3>
        <Lock className="size-3.5 text-muted-foreground" />
      </header>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[#595959]">
        <span className="inline-flex items-center gap-1.5">
          该分区由 <UserAvatar user={owner} size="sm" /> <span className="font-medium text-foreground">{owner?.name ?? '—'}</span> 处理
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="inline-flex items-center gap-1.5">
          当前进度：<span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tone)}>{p.label}</span>
        </span>
        <span className="text-xs text-muted-foreground">{p.detail}</span>
      </div>
    </section>
  );
}
