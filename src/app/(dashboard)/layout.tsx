'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/store/useAppStore';
import { roles } from '@/data/roles';
import { canViewPage } from '@/lib/permissions';
import { pageByPath, pathOf } from '@/components/shell/nav';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar, MobileTopbar, MobileBottomNav } from '@/components/shell/Topbar';
import type { User } from '@/types';

/** Case 详情子页面：司机、销售不能进入；页面内再按可见范围判断 */
const allowedPath = (user: User, pathname: string) => {
  if (/^\/cases\/[^/]+$/.test(pathname)) return user.role !== 'driver' && user.role !== 'sales';
  const page = pageByPath(pathname);
  return !page || canViewPage(user, page.key);
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.replace('/'); return; }
    if (!allowedPath(user, pathname)) router.replace(pathOf(roles[user.role].homePage));
  }, [mounted, user, pathname, router]);

  if (!mounted || !user) return null;
  if (!allowedPath(user, pathname)) return null;

  if (roles[user.role].mobile) {
    return (
      <div className="min-h-screen bg-[#ece7e8]/60">
        <div className="mx-auto flex min-h-screen w-full max-w-[27rem] flex-col bg-background shadow-xl ring-1 ring-foreground/10">
          <MobileTopbar />
          <main className="flex-1 p-3">{children}</main>
          <MobileBottomNav />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main-scroll" className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
