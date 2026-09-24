'use client';

import { useState } from 'react';
import { TicketCheck, Plus } from 'lucide-react';
import type { Case, User } from '@/types';
import { AIRPORT_CITY } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { addDays, fmtMD } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/common/Field';

const AWB_PREFIX: Record<string, string> = { 国泰航空: '160', 加拿大航空: '014', 汉莎航空: '020', 全日空: '205', 南方航空: '784', 英国航空: '125', 阿联酋航空: '176' };

/** 订舱确认：选一条 active 航班 + 填 AWB → 航司状态已确认、预计出发日期变实际出发日期、订舱步骤完成 */
export function BookingDialog({ c, user }: { c: Case; user: User }) {
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const [open, setOpen] = useState(false);
  const active = c.flights.filter((f) => f.status === 'active');
  const [fid, setFid] = useState(active[0]?.id ?? '');
  const f = active.find((x) => x.id === fid) ?? active[0];
  const [awb, setAwb] = useState(f?.awb || `${AWB_PREFIX[f?.airline ?? ''] ?? '014'}-${String(Math.floor(10000000 + Math.random() * 89999999))}`);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}><TicketCheck /> 确认订舱 / 填 AWB</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>确认订舱 · {c.pet_name}</DialogTitle>
          <DialogDescription>确认后航司状态变「已确认」，预计出发日期变为实际出发日期并回写到销售接单；通知操作员、后段、销售和管理员。</DialogDescription>
        </DialogHeader>
        {active.length === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">还没有航班记录，先从航线速查填入或手动录入航班。</div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>航班</Label><SimpleSelect value={fid} onChange={setFid} options={active.map((x) => ({ value: x.id, label: `${x.flight_no} ${x.from_code} → ${x.to_code} ${fmtMD(x.dep_time.slice(0, 10))}` }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>AWB</Label><Input value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="160-12345678" className="font-mono" /></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={() => { confirmBooking(c.id, { flight_id: fid, awb }, user.id); setOpen(false); }} disabled={!awb || !f}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 手动录入航班（第一次走的航线，航线速查里没有） */
export function AddFlightDialog({ c, user }: { c: Case; user: User }) {
  const addFlight = useAppStore((s) => s.addFlight);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ airline: '', flight_no: '', from_code: c.origin, to_code: c.entry_airport, dep_date: c.departure_date, dep_time: '12:00', arr_date: addDays(c.departure_date, 1), arr_time: '14:00', awb: '' });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}><Plus /> 手动录入航班</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>手动录入航班 · {c.pet_name}</DialogTitle><DialogDescription>航司、航班号、起飞（出发港口及日期时间）、到达（入境港口及日期时间）、AWB。</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>航司</Label><Input value={f.airline} onChange={(e) => set('airline', e.target.value)} placeholder="国泰航空" /></div>
          <div className="grid gap-1.5"><Label>航班号</Label><Input value={f.flight_no} onChange={(e) => set('flight_no', e.target.value)} placeholder="CX829" /></div>
          <div className="grid gap-1.5"><Label>出发港口</Label><Input value={f.from_code} onChange={(e) => set('from_code', e.target.value.toUpperCase())} /><span className="text-[0.65rem] text-muted-foreground">{AIRPORT_CITY[f.from_code] ?? ''}</span></div>
          <div className="grid gap-1.5"><Label>入境港口</Label><Input value={f.to_code} onChange={(e) => set('to_code', e.target.value.toUpperCase())} /><span className="text-[0.65rem] text-muted-foreground">{AIRPORT_CITY[f.to_code] ?? ''}</span></div>
          <div className="grid grid-cols-2 gap-2"><div className="grid gap-1.5"><Label>起飞日期</Label><Input type="date" value={f.dep_date} onChange={(e) => set('dep_date', e.target.value)} /></div><div className="grid gap-1.5"><Label>时间</Label><Input type="time" value={f.dep_time} onChange={(e) => set('dep_time', e.target.value)} /></div></div>
          <div className="grid grid-cols-2 gap-2"><div className="grid gap-1.5"><Label>到达日期</Label><Input type="date" value={f.arr_date} onChange={(e) => set('arr_date', e.target.value)} /></div><div className="grid gap-1.5"><Label>时间（local）</Label><Input type="time" value={f.arr_time} onChange={(e) => set('arr_time', e.target.value)} /></div></div>
          <div className="col-span-2 grid gap-1.5"><Label>AWB（可后填）</Label><Input value={f.awb} onChange={(e) => set('awb', e.target.value)} className="font-mono" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button disabled={!f.airline || !f.flight_no} onClick={() => { addFlight(c.id, { airline: f.airline, flight_no: f.flight_no, from_code: f.from_code, to_code: f.to_code, dep_time: `${f.dep_date}T${f.dep_time}:00`, arr_time: `${f.arr_date}T${f.arr_time}:00`, awb: f.awb }, user.id); setOpen(false); }}>录入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
