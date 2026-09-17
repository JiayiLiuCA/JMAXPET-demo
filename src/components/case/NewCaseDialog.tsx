'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { User } from '@/types';
import { users } from '@/data/users';
import { AIRPORT_CITY } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { addDays, fmtDate } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/common/Field';

const BREEDS = ['美短', '英短', '布偶', '田园猫', '金毛', '柯基', '柴犬', '泰迪', '法斗', '西高地'];
const CAT = new Set(['美短', '英短', '布偶', '田园猫']);
const ORIGINS = ['YYZ', 'YVR', 'JFK', 'LAX', 'PVG'];
const DESTS = ['HKG', 'PVG', 'PEK', 'CAN', 'YYZ', 'YVR', 'MEL'];

export function NewCaseDialog({ user }: { user: User }) {
  const workflows = useAppStore((s) => s.workflows);
  const today = useAppStore((s) => s.today);
  const createCase = useAppStore((s) => s.createCase);
  const openCase = useOpenCase();
  const [open, setOpen] = useState(false);
  const [pet, setPet] = useState('');
  const [breed, setBreed] = useState('泰迪');
  const [owner, setOwner] = useState('');
  const [origin, setOrigin] = useState('YYZ');
  const [dest, setDest] = useState('HKG');
  const [dep, setDep] = useState(addDays(today, 60));
  const [tpl, setTpl] = useState('ca_cn_cargo');
  const [docs, setDocs] = useState('u_lin');
  const [logi, setLogi] = useState('u_zhang');
  const [booking, setBooking] = useState('u_teddy');

  const suggested = useMemo(() => {
    const cn = ['HKG', 'PVG', 'PEK', 'CAN'].includes(dest);
    if (origin === 'PVG') return dest === 'MEL' ? 'cn_au_cargo' : 'cn_ca_cargo';
    if (['JFK', 'LAX'].includes(origin) && cn) return 'us_cn_cargo';
    return tpl === 'ca_cn_accompany' ? 'ca_cn_accompany' : 'ca_cn_cargo';
  }, [origin, dest, tpl]);
  const template = workflows.find((w) => w.id === (workflows.some((w) => w.id === tpl) ? tpl : suggested))!;
  const preview = template.steps.slice(0, 6);

  const submit = () => {
    const id = createCase({ pet_name: pet || '新宠物', species: CAT.has(breed) ? 'cat' : 'dog', breed, owner_name: owner || '待补充', origin, dest, departure_date: dep, template_id: template.id, ops_docs_id: docs, ops_logistics_id: logi, booking_id: booking }, user.id);
    setOpen(false);
    openCase(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus /> 新建 Case
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>新建 Case</DialogTitle>
          <DialogDescription>选择线路模板后，系统按出发日倒推每一步计划日期，生成这只宠物的 Timeline。</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px]">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>宠物名</Label><Input value={pet} onChange={(e) => setPet(e.target.value)} placeholder="Mochi / 豆豆" /></div>
            <div className="grid gap-1.5"><Label>品种</Label><SimpleSelect value={breed} onChange={setBreed} options={BREEDS} className="w-full" size="default" /></div>
            <div className="col-span-2 grid gap-1.5"><Label>主人姓名</Label><Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="编造即可" /></div>
            <div className="grid gap-1.5"><Label>出发机场</Label><SimpleSelect value={origin} onChange={(v) => { setOrigin(v); setTpl(''); }} options={ORIGINS.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]}` }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>目的地</Label><SimpleSelect value={dest} onChange={(v) => { setDest(v); setTpl(''); }} options={DESTS.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]}` }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>出发日期</Label><Input type="date" value={dep} onChange={(e) => setDep(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Workflow 模板</Label><SimpleSelect value={template.id} onChange={setTpl} options={workflows.map((w) => ({ value: w.id, label: w.name }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>前期文件</Label><SimpleSelect value={docs} onChange={setDocs} options={users.filter((u) => u.role === 'ops_docs').map((u) => ({ value: u.id, label: u.name }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>接送寄养</Label><SimpleSelect value={logi} onChange={setLogi} options={users.filter((u) => u.role === 'ops_logistics').map((u) => ({ value: u.id, label: u.name }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>订舱</Label><SimpleSelect value={booking} onChange={setBooking} options={users.filter((u) => u.role === 'booking').map((u) => ({ value: u.id, label: u.name }))} className="w-full" size="default" /></div>
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-xs">
            <div className="font-medium text-foreground">Timeline 预览（前 {preview.length} 步）</div>
            <div className="text-muted-foreground">{template.name} · 共 {template.steps.length} 步</div>
            <ol className="mt-2 space-y-1.5">
              {preview.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2">
                  <span>{s.label}</span>
                  <span className="font-mono text-muted-foreground">{fmtDate(addDays(dep, s.offset_days))}</span>
                </li>
              ))}
              <li className="text-muted-foreground">…</li>
            </ol>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={submit}>创建并打开</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
