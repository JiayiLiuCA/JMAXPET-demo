import { LayoutDashboard, ListTodo, FolderOpen, CalendarDays, Route as RouteIcon, Archive, ShieldCheck } from 'lucide-react';
import type { PageKey } from '@/types';
import { PAGE_META } from '@/data/roles';

export const NAV_ICON: Record<PageKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard, todo: ListTodo, cases: FolderOpen, calendar: CalendarDays, routes: RouteIcon, archive: Archive, permissions: ShieldCheck,
};

export const pageByPath = (pathname: string) => PAGE_META.find((p) => pathname === p.path || pathname.startsWith(p.path + '/'));
export const pathOf = (key: PageKey) => PAGE_META.find((p) => p.key === key)!.path;
