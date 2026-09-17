'use client';

import { useState } from 'react';
import { zhCN } from 'date-fns/locale';
import { CalendarClock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SEED_TODAY, addDays, diffDays, fmtDateFull, parse, toISO } from '@/lib/dates';
import { cn } from '@/lib/utils';

/** "当前日期"控件：拨动日期触发 48h / 24h / 当天 提醒 */
export function DateControl({ compact }: { compact?: boolean }) {
  const today = useAppStore((s) => s.today);
  const setToday = useAppStore((s) => s.setToday);
  const [open, setOpen] = useState(false);
  const shifted = today !== SEED_TODAY;
  const delta = diffDays(SEED_TODAY, today);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" className={cn('h-9 gap-2 rounded-full', shifted && 'border-warning bg-warning/20')} />}>
        <CalendarClock className="size-4 text-muted-foreground" />
        <span className="text-xs">
          {!compact && <span className="text-muted-foreground">当前日期：</span>}
          <span className="font-medium">{fmtDateFull(today)}</span>
          {shifted && <span className="ml-1 text-[#6b4f12]">（{delta > 0 ? '+' : ''}{delta} 天）</span>}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <div className="px-1 text-xs text-muted-foreground">拨动「当前日期」，系统按 48h / 24h / 当天 规则生成提醒</div>
        <Calendar mode="single" locale={zhCN} selected={parse(today)} defaultMonth={parse(today)} onSelect={(d) => { if (d) { setToday(toISO(d)); setOpen(false); } }} />
        <div className="flex flex-wrap gap-1.5 px-1">
          <Button size="xs" variant="secondary" onClick={() => { setToday(SEED_TODAY); setOpen(false); }}>回到 seed 今天</Button>
          {[1, 2, 7, 13].map((n) => (
            <Button key={n} size="xs" variant="outline" onClick={() => { setToday(addDays(today, n)); setOpen(false); }}>+{n} 天</Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
