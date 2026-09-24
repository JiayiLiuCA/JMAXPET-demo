'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { Task, User } from '@/types';
import { users } from '@/data/users';
import { useAppStore } from '@/store/useAppStore';
import { isDriverTask } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect } from '@/components/common/Field';

/** 操作部修改已排好的任务：时间 / 地址 / 司机 → 自动进司机的紧急变动，司机需确认已看到 */
export function EditTaskDialog({ t, user, size = 'xs' }: { t: Task; user: User; size?: 'xs' | 'sm' }) {
  const updateTask = useAppStore((s) => s.updateTask);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(t.date);
  const [ts, setTs] = useState(t.time_start);
  const [te, setTe] = useState(t.time_end);
  const [assignee, setAssignee] = useState(t.assignee_id);
  const [pickup, setPickup] = useState(t.pickup_addr);
  const [pickupPhone, setPickupPhone] = useState(t.pickup_phone);
  const [dest, setDest] = useState(t.dest_addr);
  const [destPhone, setDestPhone] = useState(t.dest_phone);
  const [notes, setNotes] = useState(t.notes);
  const [reason, setReason] = useState('');
  const driver = isDriverTask(t.type);
  const pool = users.filter((u) => (driver ? u.role === 'driver' : ['ops_docs', 'ops_post', 'admin'].includes(u.role)));

  const submit = () => {
    updateTask(t.id, { date, time_start: ts, time_end: te, assignee_id: assignee, pickup_addr: pickup, pickup_phone: pickupPhone, dest_addr: dest, dest_phone: destPhone, notes }, reason, user.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setDate(t.date); setTs(t.time_start); setTe(t.time_end); setAssignee(t.assignee_id); setPickup(t.pickup_addr); setPickupPhone(t.pickup_phone); setDest(t.dest_addr); setDestPhone(t.dest_phone); setNotes(t.notes); setReason(''); } }}>
      <DialogTrigger render={<Button size={size} variant="outline" />}><Pencil /> 修改</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>修改任务 · {t.type}</DialogTitle>
          <DialogDescription>{driver ? '修改后第一时间同步到司机的「紧急变动」，司机需点确认已看到；原记录保留在操作日志。' : '修改会记入操作日志。'}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>日期</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5"><Label>开始</Label><Input type="time" value={ts} onChange={(e) => setTs(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>结束</Label><Input type="time" value={te} onChange={(e) => setTe(e.target.value)} /></div>
          </div>
          <div className="col-span-2 grid gap-1.5"><Label>{driver ? '司机' : '负责人'}</Label><SimpleSelect value={assignee} onChange={setAssignee} options={pool.map((u) => ({ value: u.id, label: `${u.name}（${u.title}）` }))} className="w-full" size="default" /></div>
          {driver && (
            <>
              <div className="col-span-2 grid grid-cols-[1fr_11rem] gap-2">
                <div className="grid gap-1.5"><Label>提货地址</Label><Input value={pickup} onChange={(e) => setPickup(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label>提货电话</Label><Input value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value)} /></div>
              </div>
              <div className="col-span-2 grid grid-cols-[1fr_11rem] gap-2">
                <div className="grid gap-1.5"><Label>目的地址</Label><Input value={dest} onChange={(e) => setDest(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label>目的地电话</Label><Input value={destPhone} onChange={(e) => setDestPhone(e.target.value)} /></div>
              </div>
            </>
          )}
          <div className="col-span-2 grid gap-1.5"><Label>详情 / 备注</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="col-span-2 grid gap-1.5"><Label>变动原因（司机会看到）</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例如：医院改约 / 主人要求 / 航变" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={submit}>保存并同步司机</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
