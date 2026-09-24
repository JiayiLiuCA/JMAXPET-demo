'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PAGE_META, roles } from '@/data/roles';
import { NAV_ICON, pageByPath } from '@/components/shell/nav';
import { UserSwitcher } from '@/components/shell/UserSwitcher';
import { DateControl } from '@/components/shell/DateControl';
import { NotificationBell } from '@/components/shell/NotificationBell';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export function Topbar() {
  const pathname = usePathname();
  const page = pageByPath(pathname);
  const title = /^\/cases\/[^/]+$/.test(pathname) ? 'Case 详情' : page?.label ?? '';
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <Image src="/logo-mark.png" alt="" width={36} height={36} className="size-9 rounded-full object-cover ring-1 ring-foreground/10 md:hidden" />
      <h1 className="font-heading text-lg font-semibold text-foreground">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <DateControl />
        <NotificationBell />
        <UserSwitcher />
      </div>
    </header>
  );
}

/** 司机手机端顶栏 */
export function MobileTopbar() {
  const pathname = usePathname();
  const page = pageByPath(pathname);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-white px-3">
      <Image src="/logo-mark.png" alt="" width={32} height={32} className="size-8 rounded-full object-cover ring-1 ring-foreground/10" />
      <div className="text-sm font-semibold">{page?.mobileLabel ?? page?.label ?? '我的任务'}</div>
      <div className="ml-auto flex items-center gap-1.5">
        <DateControl compact />
        <NotificationBell compact />
        <UserSwitcher compact />
      </div>
    </header>
  );
}

/** 司机手机端底部导航：今日任务 / 紧急变动 / 日历 / 历史任务 */
export function MobileBottomNav() {
  const user = useCurrentUser();
  const pathname = usePathname();
  const alerts = useAppStore((s) => s.alerts);
  const tasks = useAppStore((s) => s.tasks);
  if (!user) return null;
  const pages = PAGE_META.filter((p) => roles[user.role].pages.includes(p.key));
  const pending = alerts.filter((a) => !a.resolved && a.targets.includes(user.id) && !a.confirmations[user.id]).length + tasks.filter((t) => t.assignee_id === user.id && !t.change_acked && t.status !== '已完成').length;
  return (
    <nav className="sticky bottom-0 z-30 grid border-t border-border bg-white" style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}>
      {pages.map((p) => {
        const Icon = NAV_ICON[p.key];
        const active = pathname === p.path || pathname.startsWith(p.path + '/');
        return (
          <Link key={p.key} href={p.path} className={cn('relative flex flex-col items-center gap-0.5 py-2 text-[0.7rem] text-muted-foreground', active && 'font-medium text-primary')}>
            <Icon className="size-5" />
            {p.mobileLabel ?? p.label}
            {p.key === 'alerts' && pending > 0 && <span className="absolute top-1 right-1/4 rounded-full bg-destructive px-1.5 text-[0.6rem] font-semibold text-white">{pending}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
