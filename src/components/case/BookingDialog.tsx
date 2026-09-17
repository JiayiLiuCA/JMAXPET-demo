'use client';

import { useState } from 'react';
import { TicketCheck } from 'lucide-react';
import type { Case, User } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BookingDialog({ c, user }: { c: Case; user: User }) {
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const [open, setOpen] = useState(false);
  const f = c.flights[0];
  const [airline, setAirline] = useState(f?.airline ?? '');
  const [flightNo, setFlightNo] = useState(f?.flight_no ?? '');
  const [awb, setAwb] = useState(f?.awb || `${['国泰航空'].includes(f?.airline ?? '') ? '160' : '014'}-${String(Math.floor(10000000 + Math.random() * 89999999))}`);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <TicketCheck /> 确认订舱 / 填 AWB
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>确认订舱 · {c.pet_name}</DialogTitle>
          <DialogDescription>填完后航司状态自动变为「已确认」，订舱步骤完成，并通知操作员与管理员。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>航司</Label><Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="国泰航空" /></div>
          <div className="grid gap-1.5"><Label>航班号</Label><Input value={flightNo} onChange={(e) => setFlightNo(e.target.value)} placeholder="CX829" /></div>
          <div className="grid gap-1.5"><Label>AWB</Label><Input value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="160-12345678" className="font-mono" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={() => { confirmBooking(c.id, { airline, flight_no: flightNo, awb }, user.id); setOpen(false); }} disabled={!awb || !flightNo}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
