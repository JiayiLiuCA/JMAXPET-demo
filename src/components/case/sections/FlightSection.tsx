'use client';

import { useState } from 'react';
import { Plane, ArrowRight } from 'lucide-react';
import type { Case } from '@/types';
import { AIRLINE_CONFIRMED, AIRPORT_CITY } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { fmtDateTime } from '@/lib/dates';
import { SelectField, SimpleSelect } from '@/components/common/Field';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FlightChangeDialog } from '@/components/case/FlightChangeDialog';
import { BookingDialog } from '@/components/case/BookingDialog';
import type { SectionProps } from '@/components/case/types';

export function FlightSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const updateFlight = useAppStore((s) => s.updateFlight);
  const fillRoute = useAppStore((s) => s.fillRoute);
  const routes = useAppStore((s) => s.routes);
  const [routeId, setRouteId] = useState('');
  const candidates = routes.filter((r) => r.origin === c.origin);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField label="航司状态 airline_confirmed" value={c.airline_confirmed} editable={canEdit} options={AIRLINE_CONFIRMED} onChange={(v) => updateCase(c.id, { airline_confirmed: v as Case['airline_confirmed'] }, user.id)} kindBadge={<StatusBadge value={c.airline_confirmed} kind="airline" />} className="w-40" />
        {canEdit && (
          <div className="flex items-end gap-1.5">
            <div>
              <div className="text-[11px] tracking-wide text-muted-foreground">从航线速查填入</div>
              <SimpleSelect value={routeId} onChange={setRouteId} options={candidates.map((r) => ({ value: r.id, label: `${r.airline_code} ${r.flight_no} → ${r.dest}${r.type === '中转' ? ` 经 ${r.via}` : ''}` }))} placeholder="选航线…" className="mt-0.5 w-56" />
            </div>
            <Button size="sm" variant="outline" disabled={!routeId} onClick={() => { fillRoute(c.id, routeId, user.id); setRouteId(''); }}>填入</Button>
          </div>
        )}
        {canEdit && (
          <div className="ml-auto flex items-center gap-1.5">
            <BookingDialog c={c} user={user} />
            <FlightChangeDialog c={c} user={user} />
          </div>
        )}
      </div>

      {c.flights.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">尚无航班记录 · 从航线速查填入或确认订舱</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>航司</TableHead><TableHead>航班号</TableHead><TableHead>起飞</TableHead><TableHead>到达</TableHead><TableHead>AWB</TableHead><TableHead>确认</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.flights.map((f) => (
              <TableRow key={f.id}>
                <TableCell><span className="inline-flex items-center gap-1"><Plane className="size-3.5 text-muted-foreground" />{f.airline}</span></TableCell>
                <TableCell className="font-mono">{f.flight_no}</TableCell>
                <TableCell>
                  <div>{f.from_code} {AIRPORT_CITY[f.from_code] ?? ''}</div>
                  <div className="text-xs text-muted-foreground">{fmtDateTime(f.dep_time)}</div>
                </TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1"><ArrowRight className="size-3 text-muted-foreground" />{f.to_code} {AIRPORT_CITY[f.to_code] ?? ''}</div>
                  <div className="text-xs text-muted-foreground">{fmtDateTime(f.arr_time)}</div>
                </TableCell>
                <TableCell>
                  {canEdit ? <Input value={f.awb} placeholder="160-12345678" className="h-7 w-36 bg-white font-mono text-xs" onChange={(e) => updateFlight(c.id, f.id, { awb: e.target.value }, user.id)} /> : <span className="font-mono">{f.awb || '—'}</span>}
                </TableCell>
                <TableCell>{f.confirmed ? <Tag tone="ok">已确认</Tag> : <Tag tone="warn">未确认</Tag>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
