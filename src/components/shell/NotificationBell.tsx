'use client';

import { useMemo, useState } from 'react';
import { Bell, BellRing, PlaneTakeoff, AlarmClock, ClipboardList, Info, CheckCheck } from 'lucide-react';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { users } from '@/data/users';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleSelect } from '@/components/common/Field';
import { fmtDateTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { NotificationKind } from '@/types';

const KIND_ICON: Record<NotificationKind, typeof Bell> = { flight_change: PlaneTakeoff, reminder: AlarmClock, task: ClipboardList, system: Info };
const KIND_COLOR: Record<NotificationKind, string> = { flight_change: '#e03939', reminder: '#d2ac72', task: '#5b7fa6', system: '#8f8f8f' };

export function NotificationBell({ compact }: { compact?: boolean }) {
  const user = useCurrentUser();
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markRead);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const openCase = useOpenCase();
  const [filterUser, setFilterUser] = useState<string>('');
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const target = isAdmin && filterUser ? filterUser : user?.id;
  const list = useMemo(() => notifications.filter((n) => n.to_user_id === target).sort((a, b) => b.created_at.localeCompare(a.created_at)), [notifications, target]);
  const unreadMine = notifications.filter((n) => n.to_user_id === user?.id && !n.read).length;
  if (!user) return null;
  const canOpenCase = user.role !== 'driver';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="icon" className="relative size-9 rounded-full" />}>
        {unreadMine ? <BellRing className="size-4" /> : <Bell className="size-4" />}
        {unreadMine > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white ring-2 ring-white">{unreadMine}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className={cn('w-[380px] p-0', compact && 'w-[340px]')}>
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="text-sm font-medium">通知中心</div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <SimpleSelect value={filterUser} onChange={setFilterUser} options={users.map((u) => ({ value: u.id, label: u.name }))} allowEmpty="我（Rita）" className="h-7 w-32 text-xs" />
            )}
            <Button size="xs" variant="ghost" onClick={() => markAllRead(target!)}><CheckCheck /> 全部已读</Button>
          </div>
        </div>
        <ScrollArea className="max-h-[420px]">
          <div className="flex flex-col">
            {list.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted-foreground">暂无通知</div>}
            {list.map((n) => {
              const Icon = KIND_ICON[n.kind];
              return (
                <button
                  key={n.id}
                  onClick={() => { markRead(n.id); if (n.case_id && canOpenCase) { openCase(n.case_id); setOpen(false); } }}
                  className={cn('flex gap-3 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/60', !n.read && 'bg-accent-2/30')}
                >
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full" style={{ background: `${KIND_COLOR[n.kind]}22`, color: KIND_COLOR[n.kind] }}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn('truncate text-sm', !n.read && 'font-medium')}>{n.title}</span>
                      {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-destructive" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[#595959]">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{fmtDateTime(n.created_at)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
