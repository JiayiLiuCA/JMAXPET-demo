'use client';

import { useMemo, useState } from 'react';
import { Plane, ArrowRight, Clock, CalendarDays, AlertTriangle, Download } from 'lucide-react';
import type { Route } from '@/types';
import { AIRPORT_CITY } from '@/data/options';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { visibleCases } from '@/lib/permissions';
import { fmtDate } from '@/lib/dates';
import { SimpleSelect } from '@/components/common/Field';
import { Tag } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const AIRLINE_COLOR: Record<string, string> = { CX: '#2b5672', AC: '#a2675b', LH: '#d2ac72', NH: '#5b7fa6', CZ: '#7fa88b', CA: '#c9a86a' };

export default function RoutesPage() {
  const user = useCurrentUser();
  const routes = useAppStore((s) => s.routes);
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [type, setType] = useState('');
  const list = useMemo(() => routes.filter((r) => (!origin || r.origin === origin) && (!dest || r.dest === dest) && (!type || r.type === type)), [routes, origin, dest, type]);
  const origins = Array.from(new Set(routes.map((r) => r.origin)));
  const dests = Array.from(new Set(routes.map((r) => r.dest)));
  if (!user) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SimpleSelect value={origin} onChange={setOrigin} options={origins.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]}` }))} allowEmpty="全部出发地" className="w-36" />
        <SimpleSelect value={dest} onChange={setDest} options={dests.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]}` }))} allowEmpty="全部目的地" className="w-36" />
        <SimpleSelect value={type} onChange={setType} options={['直飞', '中转']} allowEmpty="直飞 + 中转" className="w-28" />
        <span className="ml-auto text-xs text-muted-foreground">{list.length} 条航线</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => <RouteCard key={r.id} r={r} canFill={user.role !== 'driver'} />)}
      </div>
    </div>
  );
}

function RouteCard({ r, canFill }: { r: Route; canFill: boolean }) {
  const user = useCurrentUser()!;
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const fillRoute = useAppStore((s) => s.fillRoute);
  const openCase = useOpenCase();
  const [open, setOpen] = useState(false);
  const [cid, setCid] = useState('');
  const candidates = useMemo(() => visibleCases(cases, tasks, user).filter((c) => c.origin === r.origin).sort((a, b) => a.departure_date.localeCompare(b.departure_date)), [cases, tasks, user, r.origin]);
  const color = AIRLINE_COLOR[r.airline_code] ?? '#8f8f8f';
  return (
    <div className="flex flex-col rounded-xl bg-white p-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <span className="rounded-md px-2 py-0.5 font-mono text-xs font-semibold text-white" style={{ background: color }}>{r.airline_code}</span>
        <span className="text-sm font-medium">{r.airline}</span>
        <span className="font-mono text-sm">{r.flight_no}{r.second_leg ? ` + ${r.second_leg}` : ''}</span>
        <Tag tone={r.type === '直飞' ? 'ok' : 'info'} className="ml-auto">{r.type}{r.via ? ` ${r.via}` : ''}</Tag>
      </div>
      <div className="mt-3 flex items-center gap-2 text-base">
        <span className="font-semibold">{r.origin}</span><span className="text-xs text-muted-foreground">{AIRPORT_CITY[r.origin]}</span>
        <ArrowRight className="size-4 text-muted-foreground" />
        {r.via && <><span className="text-sm text-muted-foreground">{r.via}</span><ArrowRight className="size-4 text-muted-foreground" /></>}
        <span className="font-semibold">{r.dest}</span><span className="text-xs text-muted-foreground">{AIRPORT_CITY[r.dest]}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#595959]">
        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{r.dep_time} 飞 → {r.arr_time} 落地{r.arr_day_offset ? `（+${r.arr_day_offset}D）` : ''}</span>
        <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{r.weekdays}</span>
      </div>
      {r.restrictions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {r.restrictions.map((x) => <Tag key={x} tone="warn"><AlertTriangle className="mr-0.5 size-3" />{x}</Tag>)}
        </div>
      )}
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{r.notes}</p>
      {canFill && (
        <div className="mt-3 flex justify-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<Button size="sm" variant="outline" />}><Download /> 填入 Case</PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="text-xs text-muted-foreground">选一个从 {r.origin} 出发的 Case，把 {r.flight_no} 回填到航班子表</div>
              <SimpleSelect value={cid} onChange={setCid} options={candidates.map((c) => ({ value: c.id, label: `${c.pet_name} · ${c.file_no} · ${fmtDate(c.departure_date)} · ${c.airline_confirmed}` }))} placeholder="选择 Case…" className="w-full" size="default" />
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>取消</Button>
                <Button size="sm" disabled={!cid} onClick={() => { fillRoute(cid, r.id, user.id); setOpen(false); openCase(cid); }}><Plane /> 填入并打开</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <div className={cn('hidden')} />
    </div>
  );
}
