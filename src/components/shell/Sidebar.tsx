'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PAGE_META, roles } from '@/data/roles';
import { NAV_ICON } from '@/components/shell/nav';
import { useCurrentUser } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { SEED_TODAY } from '@/lib/dates';

export function Sidebar() {
  const user = useCurrentUser();
  const pathname = usePathname();
  if (!user) return null;
  const pages = PAGE_META.filter((p) => roles[user.role].pages.includes(p.key));
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex h-16 items-center px-4">
        <Link href={PAGE_META.find((p) => p.key === roles[user.role].homePage)!.path}>
          <Image src="/logo.png" alt="JMAXPET" width={150} height={75} priority className="h-auto w-[140px]" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {pages.map((p) => {
          const Icon = NAV_ICON[p.key];
          const active = pathname === p.path || pathname.startsWith(p.path + '/');
          return (
            <Link
              key={p.key}
              href={p.path}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#595959] transition-colors hover:bg-muted hover:text-foreground',
                active && 'bg-accent font-medium text-foreground',
              )}
            >
              <Icon className="size-4" />
              {p.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        Mock Demo · seed 日期 {SEED_TODAY}
        <br />
        数据仅在内存，刷新即重置
      </div>
    </aside>
  );
}
