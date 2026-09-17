'use client';

import { useMemo, useState } from 'react';
import { addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { users, userById } from '@/data/users';
import { AIRPORT_CITY, TASK_TYPES } from '@/data/options';
import { petEmojiOf } from '@/data/cases';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { visibleCases } from '@/lib/permissions';
import { parse, toISO } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleSelect } from '@/components/common/Field';
import { cn } from '@/lib/utils';

type Ev = { id: string; date: string; kind: 'task' | 'departure' | 'foster_in' | 'foster_out'; label: string; sub: string; color: string; case_id: string; station: string; assignee?: string; type: string };
const TASK_COLOR: Record<string, string> = { 接宠: '#7fa88b', 送机: '#2b5672', 送医院: '#5b7fa6', '送 CFIA': '#d2ac72', 办文件: '#c9c3d6', 采血: '#a2675b' };

export default function CalendarPage() {
  const user = useCurrentUser();
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(today);
  const [station, setStation] = useState('');
  const [assignee, setAssignee] = useState('');
  const [type, setType] = useState('');

  const events = useMemo<Ev[]>(() => {
    if (!user) return [];
    const vis = visibleCases(cases, tasks, user);
    const byId = new Map(vis.map((c) => [c.id, c]));
    const evs: Ev[] = [];
    tasks.forEach((t) => {
      const c = byId.get(t.case_id);
      if (!c) return;
      if (user.role === 'driver' && t.assignee_id !== user.id) return;
      evs.push({ id: t.id, date: t.date, kind: 'task', label: `${t.type} ${c.pet_name}`, sub: `${t.time_start} · ${userById(t.assignee_id)?.name}`, color: TASK_COLOR[t.type], case_id: c.id, station: c.origin, assignee: t.assignee_id, type: t.type });
    });
    vis.forEach((c) => {
      evs.push({ id: `dep_${c.id}`, date: c.departure_date, kind: 'departure', label: `✈ ${c.pet_name} 出发`, sub: c.flights[0]?.flight_no ?? c.route, color: '#2b5672', case_id: c.id, station: c.origin, type: '出发' });
      if (c.foster_start) evs.push({ id: `fin_${c.id}`, date: c.foster_start, kind: 'foster_in', label: `🏠 ${c.pet_name} 入住`, sub: '寄养开始', color: '#cbb2a6', case_id: c.id, station: c.origin, assignee: c.ops_logistics_id, type: '寄养' });
      if (c.foster_end) evs.push({ id: `fout_${c.id}`, date: c.foster_end, kind: 'foster_out', label: `🏠 ${c.pet_name} 离开`, sub: '寄养结束', color: '#cbb2a6', case_id: c.id, station: c.origin, assignee: c.ops_logistics_id, type: '寄养' });
    });
    return evs.filter((e) => (!station || e.station === station) && (!assignee || e.assignee === assignee) && (!type || e.type === type));
  }, [cases, tasks, user, station, assignee, type]);

  if (!user) return null;
  const d = parse(cursor);
  const range = view === 'month'
    ? eachDayOfInterval({ start: startOfWeek(startOfMonth(d), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(d), { weekStartsOn: 1 }) })
    : eachDayOfInterval({ start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) });
  const shift = (n: number) => setCursor(toISO(view === 'month' ? addMonths(d, n) : addWeeks(d, n)));
  const title = view === 'month' ? format(d, 'yyyy 年 M 月', { locale: zhCN }) : `${format(range[0], 'M月d日')} – ${format(range[6], 'M月d日')}`;
  const byDate = (iso: string) => events.filter((e) => e.date === iso).sort((a, b) => (a.kind === 'task' ? 1 : 0) - (b.kind === 'task' ? 1 : 0));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-sm" variant="outline" onClick={() => shift(-1)}><ChevronLeft /></Button>
        <div className="w-40 text-center text-sm font-semibold">{title}</div>
        <Button size="icon-sm" variant="outline" onClick={() => shift(1)}><ChevronRight /></Button>
        <Button size="sm" variant="ghost" onClick={() => setCursor(today)}>回到当前日期</Button>
        <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week')}>
          <TabsList><TabsTrigger value="month">月</TabsTrigger><TabsTrigger value="week">周</TabsTrigger></TabsList>
        </Tabs>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SimpleSelect value={station} onChange={setStation} options={['YYZ', 'YVR', 'JFK', 'LAX', 'PVG'].map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]}` }))} allowEmpty="全部站点" className="w-32" />
          {user.role !== 'driver' && <SimpleSelect value={assignee} onChange={setAssignee} options={users.map((u) => ({ value: u.id, label: u.name }))} allowEmpty="全部负责人" className="w-28" />}
          <SimpleSelect value={type} onChange={setType} options={[...TASK_TYPES, '出发', '寄养']} allowEmpty="全部类型" className="w-28" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs text-muted-foreground">
          {['一', '二', '三', '四', '五', '六', '日'].map((w) => <div key={w} className="py-1.5">周{w}</div>)}
        </div>
        <div className={cn('grid grid-cols-7', view === 'month' ? 'auto-rows-[minmax(112px,auto)]' : 'auto-rows-[minmax(420px,auto)]')}>
          {range.map((day) => {
            const iso = toISO(day);
            const evs = byDate(iso);
            const isToday = iso === today;
            const outside = view === 'month' && day.getMonth() !== d.getMonth();
            const max = view === 'month' ? 3 : 99;
            return (
              <div key={iso} className={cn('border-r border-b p-1.5 last:border-r-0', outside && 'bg-muted/30', isToday && 'bg-warning/10')}>
                <div className={cn('mb-1 flex items-center justify-between text-xs', outside ? 'text-muted-foreground' : 'text-foreground')}>
                  <span className={cn(isToday && 'rounded-full bg-primary px-1.5 text-white')}>{format(day, 'd')}</span>
                  {evs.length > 0 && <span className="text-[10px] text-muted-foreground">{evs.length}</span>}
                </div>
                <div className="space-y-0.5">
                  {evs.slice(0, max).map((e) => (
                    <button key={e.id} onClick={() => openCase(e.case_id)} className="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight text-white hover:opacity-90" style={{ background: e.color }} title={`${e.label} · ${e.sub}`}>
                      {e.label}{view === 'week' && <span className="block text-[10px] opacity-80">{e.sub}</span>}
                    </button>
                  ))}
                  {evs.length > max && <div className="text-[10px] text-muted-foreground">+{evs.length - max} 更多</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {Object.entries(TASK_COLOR).map(([k, v]) => <span key={k} className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: v }} />{k}</span>)}
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-primary" />出发</span>
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-latte" />寄养起止</span>
        <span className="ml-auto">{petEmojiOf({ species: 'dog' })} 点击事件打开 Case</span>
      </div>
    </div>
  );
}
