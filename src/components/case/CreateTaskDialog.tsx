'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import type { TaskType, User } from '@/types';
import { TASK_TYPES } from '@/data/options';
import { users } from '@/data/users';
import { useAppStore } from '@/store/useAppStore';
import { visibleCases } from '@/lib/permissions';
import { addDays, fmtDate } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect } from '@/components/common/Field';

const FOSTER: Record<string, string> = { YYZ: 'JMAXPET 多伦多寄养点 · 135 Bay St', YVR: 'JMAXPET 温哥华寄养点 · 149 Robson St' };
const CARGO: Record<string, string> = { YYZ: 'YYZ 货站 · 2580 Britannia Rd E', YVR: 'YVR 货站 · 5000 Miller Rd', JFK: 'JFK 货站 · Cargo Area B', LAX: 'LAX 货站 · 5600 W Century Blvd' };
const VET: Record<string, string> = { YYZ: 'Downtown Vet Clinic · 88 Queen St W', YVR: 'West End Animal Hospital · 1211 Davie St' };
const CFIA: Record<string, string> = { YYZ: 'CFIA Toronto · 1124 Finch Ave W', YVR: 'CFIA Burnaby · 4321 Still Creek Dr' };

export function CreateTaskDialog({ caseId, user, size = 'sm', variant = 'default', label = '创建任务' }: { caseId?: string; user: User; size?: 'xs' | 'sm' | 'default'; variant?: 'default' | 'outline' | 'secondary'; label?: string }) {
  const cases = useAppStore((s) => s.cases);
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const createTask = useAppStore((s) => s.createTask);
  const [open, setOpen] = useState(false);
  const options = useMemo(() => visibleCases(cases, tasks, user), [cases, tasks, user]);
  const [cid, setCid] = useState(caseId ?? options[0]?.id ?? '');
  const c = cases.find((x) => x.id === cid);
  const [type, setType] = useState<TaskType>('接宠');
  const [assignee, setAssignee] = useState('');
  const [date, setDate] = useState(addDays(today, 15));
  const [ts, setTs] = useState('10:00');
  const [te, setTe] = useState('11:00');
  const [pickup, setPickup] = useState('');
  const [dest, setDest] = useState('');
  const [notes, setNotes] = useState('');

  const isDriverType = ['接宠', '送机', '送医院', '送 CFIA', '采血'].includes(type);
  const assignees = useMemo(() => {
    const pool = users.filter((u) => (isDriverType ? u.role === 'driver' : ['ops_docs', 'ops_logistics', 'booking', 'admin'].includes(u.role)));
    return [...pool].sort((a, b) => (b.station === c?.origin ? 1 : 0) - (a.station === c?.origin ? 1 : 0));
  }, [isDriverType, c?.origin]);

  useEffect(() => { if (open) { setCid(caseId ?? options[0]?.id ?? ''); setDate(addDays(today, 15)); } }, [open, caseId, options, today]);
  useEffect(() => { setAssignee(assignees[0]?.id ?? ''); }, [assignees]);
  useEffect(() => {
    if (!c) return;
    const o = c.origin;
    const map: Record<TaskType, [string, string]> = {
      接宠: [c.owner_addr_intl, FOSTER[o] ?? '寄养点'],
      送机: [FOSTER[o] ?? c.owner_addr_intl, CARGO[o] ?? `${o} 货站`],
      送医院: [FOSTER[o] ?? c.owner_addr_intl, VET[o] ?? '指定医院'],
      '送 CFIA': [FOSTER[o] ?? c.owner_addr_intl, CFIA[o] ?? 'CFIA 办公室'],
      采血: [c.owner_addr_intl, VET[o] ?? '指定医院'],
      办文件: ['', ''],
    };
    setPickup(map[type][0]); setDest(map[type][1]);
  }, [type, c]);

  const submit = () => {
    if (!c || !assignee) return;
    createTask({ case_id: c.id, type, assignee_id: assignee, date, time_start: ts, time_end: te, pickup_addr: pickup, dest_addr: dest, notes }, user.id);
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
          <DialogDescription>任务会出现在被指派人的「我的待办」和日历；临 48h / 24h / 当天自动提醒。</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label>Case</Label>
            <SimpleSelect value={cid} onChange={setCid} disabled={!!caseId} options={options.map((x) => ({ value: x.id, label: `${x.pet_name} · ${x.file_no} · ${x.origin} → ${x.dest_region} · ${fmtDate(x.departure_date)} 出发` }))} className="w-full" size="default" />
          </div>
          <div className="grid gap-1.5">
            <Label>类型</Label>
            <SimpleSelect value={type} onChange={(v) => setType(v as TaskType)} options={TASK_TYPES} className="w-full" size="default" />
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
            <div className="grid gap-1.5"><Label>开始</Label><Input type="time" value={ts} onChange={(e) => setTs(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>结束</Label><Input type="time" value={te} onChange={(e) => setTe(e.target.value)} /></div>
          </div>
          {isDriverType && (
            <>
              <div className="col-span-2 grid gap-1.5"><Label>提货地址</Label><Input value={pickup} onChange={(e) => setPickup(e.target.value)} /></div>
              <div className="col-span-2 grid gap-1.5"><Label>目的地址</Label><Input value={dest} onChange={(e) => setDest(e.target.value)} /></div>
            </>
          )}
          <div className="col-span-2 grid gap-1.5"><Label>备注</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="航班 cut-off、箱体、主人交代……" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={submit} disabled={!c || !assignee || !date}>创建并指派</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
