'use client';

import { useState } from 'react';
import { PlaneTakeoff } from 'lucide-react';
import type { Case, FlightChangeType, User } from '@/types';
import { FLIGHT_CHANGE_TYPES } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { addDays, fmtDate } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const DESC: Record<FlightChangeType, string> = {
  改期: '航司通知航班改期，宠物按新日期出发',
  取消: '航班取消，需要重新订舱',
  当天拒载: '航司当天不让宠物上机（温度 / 箱体 / 文件），需接回并重新安排',
  无仓位: '申请的航班无动物仓位，改申请其他日期',
};

export function FlightChangeDialog({ c, user }: { c: Case; user: User }) {
  const markFlightChange = useAppStore((s) => s.markFlightChange);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FlightChangeType>('改期');
  const [date, setDate] = useState(addDays(c.departure_date, 2));

  const submit = () => {
    markFlightChange(c.id, type, type === '取消' ? '' : date, user.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" />}>
        <PlaneTakeoff /> 标记航变
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>标记航变 · {c.pet_name}（{c.flights[0]?.flight_no ?? '未订舱'} {fmtDate(c.departure_date)}）</DialogTitle>
          <DialogDescription>确认后：航司状态变更、加风险标签「时间」、生成影响清单，并通知操作员 / 司机 / 订舱 / 管理员。</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {FLIGHT_CHANGE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn('rounded-lg border p-2.5 text-left transition-colors hover:bg-muted', type === t ? 'border-primary bg-accent-2/40' : 'border-border')}
            >
              <div className="text-sm font-medium">{t}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{DESC[t]}</div>
            </button>
          ))}
        </div>
        {type !== '取消' && (
          <div className="grid gap-1.5">
            <Label htmlFor="fc-date">新出发日期</Label>
            <Input id="fc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button variant="destructive" onClick={submit}>确认航变</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
