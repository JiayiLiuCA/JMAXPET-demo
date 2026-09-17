'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, RotateCcw } from 'lucide-react';
import { users } from '@/data/users';
import { roles } from '@/data/roles';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { pathOf } from '@/components/shell/nav';

export function UserSwitcher({ compact }: { compact?: boolean }) {
  const user = useCurrentUser();
  const router = useRouter();
  const switchUser = useAppStore((s) => s.switchUser);
  const logout = useAppStore((s) => s.logout);
  const resetDemo = useAppStore((s) => s.resetDemo);
  if (!user) return null;

  const go = (id: string) => {
    const u = users.find((x) => x.id === id)!;
    switchUser(id);
    router.push(pathOf(roles[u.role].homePage));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="h-9 gap-2 rounded-full pr-2 pl-1.5" />}>
        <UserAvatar user={user} size="sm" />
        {!compact && (
          <span className="text-xs">
            <span className="text-muted-foreground">当前登录：</span>
            <span className="font-medium">{user.name}</span>
            <span className="text-muted-foreground">（{user.title}）</span>
          </span>
        )}
        {compact && <span className="text-xs font-medium">{user.name}</span>}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
        <DropdownMenuLabel>一键切换账号（演示用，保留当前数据）</DropdownMenuLabel>
        {users.map((u) => (
          <DropdownMenuItem key={u.id} onClick={() => go(u.id)} className={u.id === user.id ? 'bg-accent/60' : ''}>
            <UserAvatar user={u} size="sm" />
            <span className="flex-1">
              <span className="font-medium">{u.name}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">{u.title}</span>
            </span>
            {roles[u.role].mobile && <span className="rounded-full bg-accent-2 px-1.5 text-[0.65rem]">手机</span>}
          </DropdownMenuItem>
        ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => resetDemo()}>
          <RotateCcw /> 重置 demo 数据
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { logout(); router.push('/'); }}>
          <LogOut /> 退出到登录页（重置数据）
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
