'use client';

import { useMemo, useState } from 'react';
import { Plane, AlertTriangle, Download, Pencil } from 'lucide-react';
import type { Route } from '@/types';
import { AIRPORT_CITY } from '@/data/options';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { visibleCases } from '@/lib/permissions';
import { fmtMD } from '@/lib/dates';
import { SimpleSelect } from '@/components/common/Field';
import { Tag } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const AIRLINE_COLOR: Record<string, string> = { CX: '#2b5672', AC: '#a2675b', LH: '#d2ac72', NH: '#5b7fa6', CZ: '#7fa88b', CA: '#c9a86a', BA: '#1d3f6e', EK: '#b0413e', MU: '#3a5f8f' };

/** 航线速查：按出发站点分区，一行一行；主管可编辑 */
export default function RoutesPage() {
  const user = useCurrentUser();
  const routes = useAppStore((s) => s.routes);
  const [dest, setDest] = useState('');
  const groups = useMemo(() => {
    const origins = Array.from(new Set(routes.map((r) => r.origin)));
    return origins.map((o) => ({ origin: o, list: routes.filter((r) => r.origin === o && (!dest || r.dest === dest)).sort((a, b) => a.dest.localeCompare(b.dest) || a.flight_no.localeCompare(b.flight_no)) })).filter((g) => g.list.length);
  }, [routes, dest]);
  const dests = Array.from(new Set(routes.map((r) => r.dest)));
  if (!user) return null;
  const canEdit = user.role === 'admin';
  const canFill = ['admin', 'ops_docs', 'booking_cargo'].includes(user.role);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SimpleSelect value={dest} onChange={setDest} options={dests.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]}` }))} allowEmpty="全部目的地" className="w-36" />
        <span className="ml-auto text-xs text-muted-foreground">{routes.length} 条航线 · {canEdit ? '主管可编辑' : '只读'}</span>
      </div>
      {groups.map((g) => (
        <section key={g.origin} className="overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
          <header className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-sm font-semibold"><Plane className="size-4 text-primary" /> {g.origin} {AIRPORT_CITY[g.origin]} 出发 <span className="rounded-full bg-white px-1.5 text-xs font-normal text-muted-foreground ring-1 ring-foreground/10">{g.list.length}</span></header>
          <Table>
            <TableHeader><TableRow className="text-xs hover:bg-transparent"><TableHead className="h-8">航司</TableHead><TableHead className="h-8">航班</TableHead><TableHead className="h-8">目的地</TableHead><TableHead className="h-8">起飞 → 落地</TableHead><TableHead className="h-8">班期</TableHead><TableHead className="h-8">限制</TableHead><TableHead className="h-8">备注</TableHead><TableHead className="h-8" /></TableRow></TableHeader>
            <TableBody>
              {g.list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><span className="mr-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold text-white" style={{ background: AIRLINE_COLOR[r.airline_code] ?? '#8f8f8f' }}>{r.airline_code}</span>{r.airline}</TableCell>
                  <TableCell className="font-mono">{r.flight_no}{r.second_leg ? ` + ${r.second_leg}` : ''}<div className="text-[0.65rem] text-muted-foreground">{r.type}{r.via ? ` 经 ${r.via}` : ''}</div></TableCell>
                  <TableCell>{r.dest} <span className="text-xs text-muted-foreground">{AIRPORT_CITY[r.dest]}</span></TableCell>
                  <TableCell className="text-xs">{r.dep_time} → {r.arr_time}{r.arr_day_offset ? `（+${r.arr_day_offset}D）` : ''}</TableCell>
                  <TableCell className="text-xs">{r.weekdays}</TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{r.restrictions.map((x) => <Tag key={x} tone="warn"><AlertTriangle className="mr-0.5 size-3" />{x}</Tag>)}</div></TableCell>
                  <TableCell className="max-w-[18rem] text-xs text-muted-foreground">{r.notes}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {canEdit && <EditRouteDialog r={r} />}
                    {canFill && <FillCase r={r} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}

function FillCase({ r }: { r: Route }) {
  const user = useCurrentUser()!;
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const fillRoute = useAppStore((s) => s.fillRoute);
  const openCase = useOpenCase();
  const [open, setOpen] = useState(false);
  const [cid, setCid] = useState('');
  const candidates = useMemo(() => visibleCases(cases, tasks, user).filter((c) => c.origin === r.origin && c.case_type === '托运').sort((a, b) => a.departure_date.localeCompare(b.departure_date)), [cases, tasks, user, r.origin]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="xs" variant="outline" className="ml-1" />}><Download /> 填入 Case</PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="text-xs text-muted-foreground">选一个从 {r.origin} 出发的托运 Case，把 {r.flight_no} 填到航班分区（AWB 需手动填）</div>
        <SimpleSelect value={cid} onChange={setCid} options={candidates.map((c) => ({ value: c.id, label: `${c.pet_name} · ${c.file_no} · ${fmtMD(c.departure_date)} · ${c.airline_confirmed}` }))} placeholder="选择 Case…" className="w-full" size="default" />
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>取消</Button>
          <Button size="sm" disabled={!cid} onClick={() => { fillRoute(cid, r.id, user.id); setOpen(false); openCase(cid); }}><Plane /> 填入并打开</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EditRouteDialog({ r }: { r: Route }) {
  const updateRoute = useAppStore((s) => s.updateRoute);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ flight_no: r.flight_no, dep_time: r.dep_time, arr_time: r.arr_time, weekdays: r.weekdays, restrictions: r.restrictions.join('、'), notes: r.notes });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="xs" variant="ghost" />}><Pencil /></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>编辑航线 · {r.origin} → {r.dest}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>航班号</Label><Input value={f.flight_no} onChange={(e) => set('flight_no', e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>班期</Label><Input value={f.weekdays} onChange={(e) => set('weekdays', e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>起飞</Label><Input value={f.dep_time} onChange={(e) => set('dep_time', e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>落地</Label><Input value={f.arr_time} onChange={(e) => set('arr_time', e.target.value)} /></div>
          <div className="col-span-2 grid gap-1.5"><Label>限制（顿号分隔）</Label><Input value={f.restrictions} onChange={(e) => set('restrictions', e.target.value)} /></div>
          <div className="col-span-2 grid gap-1.5"><Label>备注</Label><Input value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={() => { updateRoute(r.id, { ...f, restrictions: f.restrictions.split(/[、,，]/).map((x) => x.trim()).filter(Boolean) }); setOpen(false); }}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
