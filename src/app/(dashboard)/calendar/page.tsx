'use client';

import { useMemo, useState } from 'react';
import { addDays as addD, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { users, userById } from '@/data/users';
import { AIRPORT_CITY, STATIONS, TASK_TYPES } from '@/data/options';
import { petEmojiOf } from '@/data/cases';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { visibleCases } from '@/lib/permissions';
import { TASK_TYPE_COLOR } from '@/lib/buckets';
import { parse, toISO, fmtDateFull } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleSelect } from '@/components/common/Field';
import { cn } from '@/lib/utils';

type Ev = { id: string; date: string; kind: 'task' | 'departure' | 'foster_in' | 'foster_out'; label: string; sub: string; color: string; dashed?: boolean; case_id: string; station: string; assignee?: string; type: string; time: string };

/** 颜色约定 */
const DEP_CONFIRMED = '#2b5672';
const DEP_EXPECTED = '#9db3c7';
const ACC = { docs_done_no_person: '#7fa88b', docs_pending_no_person: '#cbc7b5', person_set: '#7a8fc9', person_pending: '#e03939' };

export default function CalendarPage() {
  const user = useCurrentUser();
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const isDriver = user?.role === 'driver';
  const [view, setView] = useState<'month' | 'week' | 'day'>(isDriver ? 'day' : 'month');
  const [cursor, setCursor] = useState(today);
  const [station, setStation] = useState('');
  const [assignee, setAssignee] = useState('');
  const [type, setType] = useState('');

  const events = useMemo<Ev[]>(() => {
    if (!user) return [];
    const vis = visibleCases(cases, tasks, user);
    const byId = new Map(vis.map((c) => [c.id, c]));
    const evs: Ev[] = [];
    const finance = user.role === 'finance';
    tasks.forEach((t) => {
      const c = byId.get(t.case_id);
      if (!c) return;
      if (isDriver && t.assignee_id !== user.id) return;
      if (finance && t.status === '待确认') return; // 财务只看已确认的司机时间
      if (t.status === '无法确认') return;
      evs.push({ id: t.id, date: t.date, kind: 'task', label: `${t.time_start} ${petEmojiOf(c)} ${c.pet_name} | ${t.type}`, sub: `${userById(t.assignee_id)?.name} · ${t.status}`, color: TASK_TYPE_COLOR[t.type] ?? '#8f8f8f', case_id: c.id, station: c.origin, assignee: t.assignee_id, type: t.type, time: t.time_start });
    });
    if (!isDriver) {
      vis.forEach((c) => {
        if (finance && !c.departure_confirmed) return;
        let color = c.departure_confirmed ? DEP_CONFIRMED : DEP_EXPECTED;
        let sub = c.departure_confirmed ? '实际出发日' : '预计出发日（未确认）';
        if (c.case_type === '随机') {
          const docsDone = c.timeline.filter((s) => s.owner_role === 'ops_docs' && s.key !== 'remind_checkin').every((s) => s.status === '完成');
          if (c.accompany_needed) { color = c.accompany_person ? ACC.person_set : ACC.person_pending; sub = c.accompany_person ? `随机人已定 · ${c.accompany_person}` : '随机人未定'; }
          else { color = docsDone ? ACC.docs_done_no_person : ACC.docs_pending_no_person; sub = docsDone ? '随机文件已定' : '随机文件未定'; }
        }
        const f = c.flights.find((x) => x.status === 'active');
        evs.push({ id: `dep_${c.id}`, date: c.departure_date, kind: 'departure', label: `✈ ${petEmojiOf(c)} ${c.pet_name} 出发`, sub: `${f?.flight_no ?? c.route} · ${sub}`, color, dashed: !c.departure_confirmed && c.case_type !== '随机', case_id: c.id, station: c.origin, assignee: c.ops_docs_id, type: '出发', time: f?.dep_time.slice(11, 16) ?? '' });
        if (!finance && c.foster_start) evs.push({ id: `fin_${c.id}`, date: c.foster_start, kind: 'foster_in', label: `🏠 ${c.pet_name} 入住`, sub: '寄养开始', color: '#cbb2a6', case_id: c.id, station: c.origin, assignee: c.ops_docs_id, type: '寄养', time: '' });
        if (!finance && c.foster_end) evs.push({ id: `fout_${c.id}`, date: c.foster_end, kind: 'foster_out', label: `🏠 ${c.pet_name} 离开`, sub: '寄养结束', color: '#cbb2a6', case_id: c.id, station: c.origin, assignee: c.ops_docs_id, type: '寄养', time: '' });
      });
    }
    return evs.filter((e) => (!station || e.station === station) && (!assignee || e.assignee === assignee) && (!type || e.type === type));
  }, [cases, tasks, user, station, assignee, type, isDriver]);

  if (!user) return null;
  const d = parse(cursor);
  const range = view === 'month'
    ? eachDayOfInterval({ start: startOfWeek(startOfMonth(d), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(d), { weekStartsOn: 1 }) })
    : view === 'week' ? eachDayOfInterval({ start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) })
    : [d];
  const shift = (n: number) => setCursor(toISO(view === 'month' ? addMonths(d, n) : view === 'week' ? addWeeks(d, n) : addD(d, n)));
  const title = view === 'month' ? format(d, 'yyyy 年 M 月', { locale: zhCN }) : view === 'week' ? `${format(range[0], 'MM/dd')} – ${format(range[6], 'MM/dd')}` : fmtDateFull(cursor);
  const byDate = (iso: string) => events.filter((e) => e.date === iso).sort((a, b) => (a.kind === 'task' ? 1 : 0) - (b.kind === 'task' ? 1 : 0) || a.time.localeCompare(b.time));
  const canOpen = user.role !== 'driver' && user.role !== 'sales';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-sm" variant="outline" onClick={() => shift(-1)}><ChevronLeft /></Button>
        <div className="min-w-40 text-center text-sm font-semibold">{title}</div>
        <Button size="icon-sm" variant="outline" onClick={() => shift(1)}><ChevronRight /></Button>
        <Button size="sm" variant="ghost" onClick={() => setCursor(today)}>回到当前日期</Button>
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>{!isDriver && <TabsTrigger value="month">月</TabsTrigger>}<TabsTrigger value="week">周</TabsTrigger><TabsTrigger value="day">日</TabsTrigger></TabsList>
        </Tabs>
        {!isDriver && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <SimpleSelect value={station} onChange={setStation} options={STATIONS.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]}` }))} allowEmpty="全部站点" className="w-32" />
            <SimpleSelect value={assignee} onChange={setAssignee} options={users.filter((u) => ['driver', 'ops_docs', 'ops_post'].includes(u.role)).map((u) => ({ value: u.id, label: u.name }))} allowEmpty="全部负责人" className="w-28" />
            <SimpleSelect value={type} onChange={setType} options={[...TASK_TYPES, '出发', '寄养']} allowEmpty="全部类型" className="w-32" />
          </div>
        )}
      </div>

      {view === 'day' ? (
        <div className="space-y-2">
          {byDate(cursor).map((e) => (
            <button key={e.id} onClick={() => canOpen && openCase(e.case_id)} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-foreground/10" style={{ boxShadow: `inset 4px 0 0 ${e.color}` }}>
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">{e.label}</div><div className="text-xs text-muted-foreground">{e.sub}</div></div>
            </button>
          ))}
          {byDate(cursor).length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">这天没有安排</div>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
          <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs text-muted-foreground">
            {['一', '二', '三', '四', '五', '六', '日'].map((w) => <div key={w} className="py-1.5">周{w}</div>)}
          </div>
          <div className={cn('grid grid-cols-7', view === 'month' ? 'auto-rows-[minmax(7rem,auto)]' : 'auto-rows-[minmax(26rem,auto)]')}>
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
                    {evs.length > 0 && <span className="text-[0.65rem] text-muted-foreground">{evs.length}</span>}
                  </div>
                  <div className="space-y-0.5">
                    {evs.slice(0, max).map((e) => (
                      <button key={e.id} onClick={() => canOpen && openCase(e.case_id)} className={cn('block w-full truncate rounded px-1 py-0.5 text-left text-[0.7rem] leading-tight text-white hover:opacity-90', e.dashed && 'border border-dashed border-white/70')} style={{ background: e.color }} title={`${e.label} · ${e.sub}`}>
                        {e.label}{view === 'week' && <span className="block text-[0.65rem] opacity-80">{e.sub}</span>}
                      </button>
                    ))}
                    {evs.length > max && <div className="text-[0.65rem] text-muted-foreground">+{evs.length - max} 更多</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!isDriver && (
        <div className="flex flex-wrap gap-3 text-[0.7rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: DEP_CONFIRMED }} />实际出发日（已确认）</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm border border-dashed border-foreground/40" style={{ background: DEP_EXPECTED }} />预计出发日（未确认）</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: ACC.docs_done_no_person }} />随机 · 文件已定</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: ACC.docs_pending_no_person }} />随机 · 文件未定</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: ACC.person_set }} />随机 · 随机人已定</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: ACC.person_pending }} />随机 · 随机人未定</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-latte" />寄养起止</span>
          {Object.entries(TASK_TYPE_COLOR).slice(0, 7).map(([k, v]) => <span key={k} className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: v }} />{k}</span>)}
        </div>
      )}
    </div>
  );
}
