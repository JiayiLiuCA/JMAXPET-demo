import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function UserAvatar({ user, size = 'default', className, tip }: { user?: User; size?: 'sm' | 'default' | 'lg'; className?: string; tip?: string }) {
  if (!user) return null;
  const s = size === 'sm' ? 'size-6 text-[10px]' : size === 'lg' ? 'size-11 text-base' : 'size-8 text-xs';
  const initial = /^[A-Za-z]/.test(user.name) ? user.name[0].toUpperCase() : user.name.slice(-1);
  const el = (
    <span className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white ring-2 ring-white', s, className)} style={{ background: user.color }}>
      {initial}
    </span>
  );
  if (!tip) return el;
  return (
    <Tooltip>
      <TooltipTrigger render={el} />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
