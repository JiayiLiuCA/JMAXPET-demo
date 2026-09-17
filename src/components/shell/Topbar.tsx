'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { pageByPath } from '@/components/shell/nav';
import { UserSwitcher } from '@/components/shell/UserSwitcher';
import { DateControl } from '@/components/shell/DateControl';
import { NotificationBell } from '@/components/shell/NotificationBell';

export function Topbar() {
  const pathname = usePathname();
  const page = pageByPath(pathname);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <Image src="/logo-mark.png" alt="" width={36} height={36} className="size-9 rounded-full object-cover ring-1 ring-foreground/10 md:hidden" />
      <h1 className="font-heading text-lg font-semibold text-foreground">{page?.label ?? ''}</h1>
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
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-white px-3">
      <Image src="/logo-mark.png" alt="" width={32} height={32} className="size-8 rounded-full object-cover ring-1 ring-foreground/10" />
      <div className="text-sm font-semibold">我的任务</div>
      <div className="ml-auto flex items-center gap-1.5">
        <DateControl compact />
        <NotificationBell compact />
        <UserSwitcher compact />
      </div>
    </header>
  );
}
