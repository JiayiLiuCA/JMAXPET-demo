'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plane, CalendarDays, Hash, Lock, UserRound } from 'lucide-react';
import type { Case, SectionKey, User } from '@/types';
import { PRIORITIES, STAGES, NEXT_STEPS, WAITINGS, RISK_TAGS } from '@/data/options';
import { SECTION_META, PAGE_META, roles } from '@/data/roles';
import { userById } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { canOpenCase, sectionPerm } from '@/lib/permissions';
import { fmtDate, fmtDateFull, relativeLabel } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { SimpleSelect } from '@/components/common/Field';
import { WorkflowProgress, scrollToSection } from '@/components/case/WorkflowProgress';
import { ImpactCard } from '@/components/case/ImpactCard';
import { LockedSection, SectionCard } from '@/components/case/SectionCard';
import { PetSection } from '@/components/case/sections/PetSection';
import { OwnerSection } from '@/components/case/sections/OwnerSection';
import { RouteSection } from '@/components/case/sections/RouteSection';
import { HandoverSection } from '@/components/case/sections/HandoverSection';
import { DocsSection } from '@/components/case/sections/DocsSection';
import { FlightSection } from '@/components/case/sections/FlightSection';
import { PaymentSection } from '@/components/case/sections/PaymentSection';
import { LogSection } from '@/components/case/sections/LogSection';
import { DriverSection } from '@/components/case/sections/DriverSection';
import { FosterSection } from '@/components/case/sections/FosterSection';
import { cn } from '@/lib/utils';

const SECTION_COMPONENT: Record<SectionKey, React.ComponentType<{ c: Case; canEdit: boolean; user: User }>> = {
  pet: PetSection, owner: OwnerSection, route: RouteSection, handover: HandoverSection, docs: DocsSection, flight: FlightSection, payment: PaymentSection, log: LogSection, driver: DriverSection, foster: FosterSection,
};

/** Case 详情子页面 */
export function CaseDetail({ id }: { id: string }) {
  const user = useCurrentUser();
  const c = useAppStore((s) => s.cases.find((x) => x.id === id));
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  if (!user) return null;
  const home = PAGE_META.find((p) => p.key === roles[user.role].homePage)!;
  if (!c || !canOpenCase(c, cases, tasks, user)) {
    return (
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center ring-1 ring-foreground/10">
        <Lock className="mx-auto size-8 text-muted-foreground" />
        <div className="mt-3 font-medium">{c ? '你没有权限查看这个 Case' : '找不到这个 Case'}</div>
        <p className="mt-1 text-sm text-muted-foreground">{c ? `${c.pet_name} · ${c.file_no} 不在 ${user.name} 的可见范围内` : id}</p>
        <Button variant="outline" className="mt-4" render={<Link href={home.path} />}>回到{home.label}</Button>
      </div>
    );
  }
  return <Body c={c} user={user} />;
}

function Body({ c, user }: { c: Case; user: User }) {
  const router = useRouter();
  const permissions = useAppStore((s) => s.permissions);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const lastImpact = useAppStore((s) => s.lastImpact);
  const updateCase = useAppStore((s) => s.updateCase);
  const headerEditable = user.role === 'admin' || user.role === 'ops_docs' || user.role === 'ops_logistics';
  const perms = useMemo(() => Object.fromEntries(SECTION_META.map((s) => [s.key, sectionPerm(permissions, user.role, s.key)])) as Record<SectionKey, { view: boolean; edit: boolean }>, [permissions, user.role]);
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  const docs = userById(c.ops_docs_id); const logi = userById(c.ops_logistics_id); const bk = userById(c.booking_id);
  const visibleCount = SECTION_META.filter((s) => perms[s.key].view).length;
  const listPage = roles[user.role].pages.includes('cases') ? PAGE_META.find((p) => p.key === 'cases')! : PAGE_META.find((p) => p.key === roles[user.role].homePage)!;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft /> 返回</Button>
        <Link href={listPage.path} className="hover:text-foreground hover:underline">{listPage.label}</Link>
        <span>/</span>
        <span className="font-mono text-foreground">{c.file_no}</span>
        <span>·</span>
        <span>{c.pet_name}</span>
      </div>

      {/* 顶部摘要 */}
      <header className="rounded-xl bg-white p-5 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-3xl">{petEmojiOf(c)}</span>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-heading text-xl font-semibold text-foreground">
              {c.pet_name}
              <span className="text-sm font-normal text-muted-foreground">{c.breed} · {c.gender} · {c.weight} kg</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-normal text-[#595959]"><Hash className="size-3" />{c.file_no}</span>
              {c.archived && <Tag tone="neutral">已归档</Tag>}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#595959]">
              <span className="inline-flex items-center gap-1"><Plane className="size-4 text-muted-foreground" />{c.route}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays className="size-4 text-muted-foreground" />{fmtDateFull(c.departure_date)} 出发（{relativeLabel(c.departure_date, today)}）</span>
              <span className="inline-flex items-center gap-1"><UserRound className="size-4 text-muted-foreground" />主人 {c.owner_name}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge value={c.stage} kind="stage" />
              <StatusBadge value={c.priority} kind="priority" />
              <StatusBadge value={c.airline_confirmed} kind="airline" />
              <Tag tone="info">下一步 · {c.next_step}</Tag>
              {c.waiting && <Tag tone="accent">等 {c.waiting}</Tag>}
              {c.risk_tags.map((r) => <Tag key={r} tone="danger">风险 · {r}</Tag>)}
              {c.deadline && <span className="text-xs text-muted-foreground">截止 {fmtDate(c.deadline)}</span>}
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
            <UserAvatar user={docs} size="sm" /><span>前期文件 · <span className="text-foreground">{docs?.name}</span></span>
            <UserAvatar user={logi} size="sm" /><span>接送寄养 · <span className="text-foreground">{logi?.name}</span></span>
            <UserAvatar user={bk} size="sm" /><span>订舱 · <span className="text-foreground">{bk?.name}</span></span>
          </div>
        </div>
        {headerEditable && !c.archived && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-[11px] text-muted-foreground">快速编辑</span>
            <SimpleSelect value={c.priority} onChange={(v) => set({ priority: v as Case['priority'] })} options={PRIORITIES} className="h-7 text-xs" />
            <SimpleSelect value={c.stage} onChange={(v) => set({ stage: v as Case['stage'] })} options={STAGES} className="h-7 text-xs" />
            <SimpleSelect value={c.next_step} onChange={(v) => set({ next_step: v as Case['next_step'] })} options={NEXT_STEPS} className="h-7 text-xs" />
            <SimpleSelect value={c.waiting} onChange={(v) => set({ waiting: v as Case['waiting'] })} options={WAITINGS} allowEmpty="不在等" className="h-7 text-xs" />
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">风险</span>
              {RISK_TAGS.map((r) => {
                const on = c.risk_tags.includes(r);
                return (
                  <button key={r} onClick={() => set({ risk_tags: on ? c.risk_tags.filter((x) => x !== r) : [...c.risk_tags, r] })} className={cn('rounded-full border px-2 py-0.5 text-[11px] transition-colors', on ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border text-muted-foreground hover:bg-muted')}>{r}</button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {lastImpact?.case_id === c.id && <ImpactCard report={lastImpact} />}

      <WorkflowProgress c={c} user={user} />

      {/* 分区锚点 */}
      <nav className="sticky -top-4 z-20 -mx-1 flex flex-wrap items-center gap-1 rounded-b-lg bg-background/95 px-1 py-2 backdrop-blur md:-top-6">
        {SECTION_META.map((s) => (
          <button key={s.key} onClick={() => scrollToSection(s.key)} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-foreground/10 transition-colors hover:bg-muted', perms[s.key].view ? 'bg-white text-foreground' : 'bg-muted/60 text-muted-foreground')}>
            {s.index} {s.label}
            {!perms[s.key].view && <Lock className="size-3" />}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{user.name} 可查看 {visibleCount}/{SECTION_META.length} 个分区</span>
      </nav>

      {SECTION_META.map((s) => {
        const p = perms[s.key];
        if (!p.view) return <LockedSection key={s.key} section={s.key} c={c} tasks={tasks} className="scroll-mt-12" />;
        const Comp = SECTION_COMPONENT[s.key];
        const canEdit = p.edit && !c.archived;
        return (
          <SectionCard key={s.key} section={s.key} canEdit={canEdit} className="scroll-mt-12 transition-shadow">
            <Comp c={c} canEdit={canEdit} user={user} />
          </SectionCard>
        );
      })}
    </div>
  );
}
