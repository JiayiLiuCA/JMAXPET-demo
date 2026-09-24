'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import type { TaskType, User } from '@/types';
import { DRIVER_TASK_TYPES, OPS_TASK_TYPES } from '@/data/options';
import { users } from '@/data/users';
import { useAppStore } from '@/store/useAppStore';
import { visibleCases, isDriverTask } from '@/lib/permissions';
import { addDays, fmtMD } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect } from '@/components/common/Field';

const FOSTER: Record<string, [string, string]> = { YYZ: ['JMAXPET 多伦多寄养点 · 135 Bay St', '+1 416-555-0100'], YVR: ['JMAXPET 温哥华寄养点 · 149 Robson St', '+1 604-555-0100'] };
const CARGO: Record<string, [string, string]> = { YYZ: ['YYZ 货站 · 2580 Britannia Rd E', '+1 905-555-0199'], YVR: ['YVR 货站 · 5000 Miller Rd', '+1 604-555-0199'], JFK: ['JFK 货站 · Cargo Area B', '+1 718-555-0199'], LAX: ['LAX 货站 · 5600 W Century Blvd', '+1 310-555-0199'] };
const VET: Record<string, [string, string]> = { YYZ: ['Downtown Vet Clinic · 88 Queen St W', '+1 416-555-0188'], YVR: ['West End Animal Hospital · 1211 Davie St', '+1 604-555-0188'] };
const CFIA: Record<string, [string, string]> = { YYZ: ['CFIA Toronto · 1124 Finch Ave W', '+1 416-555-0177'], YVR: ['CFIA Burnaby · 4321 Still Creek Dr', '+1 604-555-0177'] };
const NONE: [string, string] = ['', ''];

export function CreateTaskDialog({ caseId, user, size = 'sm', variant = 'default', label = '创建任务' }: { caseId?: string; user: User; size?: 'xs' | 'sm' | 'default'; variant?: 'default' | 'outline' | 'secondary'; label?: string }) {
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const createTask = useAppStore((s) => s.createTask);
  const [open, setOpen] = useState(false);
  const options = useMemo(() => visibleCases(cases, tasks, user), [cases, tasks, user]);
  const [cid, setCid] = useState(caseId ?? options[0]?.id ?? '');
  const c = cases.find((x) => x.id === cid);
  const [type, setType] = useState<TaskType>('接回寄养');
  const [assignee, setAssignee] = useState('');
  const [date, setDate] = useState(addDays(today, 15));
  const [ts, setTs] = useState('10:00');
  const [te, setTe] = useState('');
  const [pickup, setPickup] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [dest, setDest] = useState('');
  const [destPhone, setDestPhone] = useState('');
  const [notes, setNotes] = useState('');

  const driver = isDriverTask(type);
  const assignees = useMemo(() => {
    const pool = users.filter((u) => (driver ? u.role === 'driver' : ['ops_docs', 'ops_post', 'admin'].includes(u.role)));
    return [...pool].sort((a, b) => (b.station === c?.origin ? 1 : 0) - (a.station === c?.origin ? 1 : 0));
  }, [driver, c?.origin]);

  useEffect(() => { if (open) { setCid(caseId ?? options[0]?.id ?? ''); setDate(addDays(today, 15)); } }, [open, caseId, options, today]);
  useEffect(() => { setAssignee(assignees[0]?.id ?? ''); }, [assignees]);
  useEffect(() => {
    if (!c) return;
    const o = c.origin;
    const home: [string, string] = [c.owner_addr_intl, c.owner_phone_intl];
    const map: Record<TaskType, [[string, string], [string, string]]> = {
      接回寄养: [home, FOSTER[o] ?? ['寄养点', '']],
      接去医院送回: [home, VET[o] ?? ['指定医院', '']],
      接去医院送寄养: [FOSTER[o] ?? home, VET[o] ?? ['指定医院', '']],
      仅接送: [home, FOSTER[o] ?? ['寄养点', '']],
      送机: [FOSTER[o] ?? home, CARGO[o] ?? [`${o} 货站`, '']],
      接机: [CARGO[o] ?? [`${c.entry_airport} 到达货站`, ''], home],
      'CFIA 盖章': [FOSTER[o] ?? home, CFIA[o] ?? ['CFIA 办公室', '']],
      约医院: [NONE, NONE], 等待: [NONE, NONE], 办文件: [NONE, NONE],
    };
    const [p, d] = map[type];
    setPickup(p[0]); setPickupPhone(p[1]); setDest(d[0]); setDestPhone(d[1]);
  }, [type, c]);

  const submit = () => {
    if (!c || !assignee) return;
    createTask({ case_id: c.id, type, assignee_id: assignee, date, time_start: ts, time_end: te, pickup_addr: driver ? pickup : '', pickup_phone: driver ? pickupPhone : '', dest_addr: driver ? dest : '', dest_phone: driver ? destPhone : '', notes }, user.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} variant={variant} />}>
        <CalendarPlus /> {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建任务</DialogTitle>
          <DialogDescription>司机类任务会出现在司机的「今日任务」等待司机确认；操作类任务进「我的待办」。时间一般只填开始时间。</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label>Case</Label>
            <SimpleSelect value={cid} onChange={setCid} disabled={!!caseId} options={options.map((x) => ({ value: x.id, label: `${x.pet_name} · ${x.file_no} · ${x.origin} → ${x.entry_airport} · ${fmtMD(x.departure_date)} 出发` }))} className="w-full" size="default" />
          </div>
          <div className="grid gap-1.5">
            <Label>类型</Label>
            <SimpleSelect value={type} onChange={(v) => setType(v as TaskType)} options={[...DRIVER_TASK_TYPES.map((t) => ({ value: t, label: `司机 · ${t}` })), ...OPS_TASK_TYPES.map((t) => ({ value: t, label: `操作 · ${t}` }))]} className="w-full" size="default" />
          </div>
          <div className="grid gap-1.5">
            <Label>指派给</Label>
            <SimpleSelect value={assignee} onChange={setAssignee} options={assignees.map((u) => ({ value: u.id, label: `${u.name}（${u.title}）` }))} className="w-full" size="default" />
          </div>
          <div className="grid gap-1.5">
            <Label>日期</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5"><Label>开始时间</Label><Input type="time" value={ts} onChange={(e) => setTs(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>结束（可选）</Label><Input type="time" value={te} onChange={(e) => setTe(e.target.value)} /></div>
          </div>
          {driver && (
            <>
              <div className="col-span-2 grid grid-cols-[1fr_11rem] gap-2">
                <div className="grid gap-1.5"><Label>提货地址</Label><Input value={pickup} onChange={(e) => setPickup(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label>提货电话</Label><Input value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value)} placeholder="不一定是主人的" /></div>
              </div>
              <div className="col-span-2 grid grid-cols-[1fr_11rem] gap-2">
                <div className="grid gap-1.5"><Label>目的地址</Label><Input value={dest} onChange={(e) => setDest(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label>目的地电话（选填）</Label><Input value={destPhone} onChange={(e) => setDestPhone(e.target.value)} /></div>
              </div>
            </>
          )}
          <div className="col-span-2 grid gap-1.5"><Label>详情 / 备注</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="司机需要知道这次行程是要做什么：例如 xxx 需要做 Rabies + Microchip；航班 cut-off、箱体、主人交代……" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={submit} disabled={!c || !assignee || !date}>创建并指派</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
