'use client';

import { useState } from 'react';
import { PlaneTakeoff, UserRoundCog } from 'lucide-react';
import type { Case, FlightChangeType, OpsFlightChangeType, User } from '@/types';
import { ACCOMPANY_CHANGE_TYPES, FLIGHT_CHANGE_TYPES, OPS_FLIGHT_CHANGE_TYPES } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { addDays, fmtMD } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect } from '@/components/common/Field';
import { cn } from '@/lib/utils';

const DESC: Record<FlightChangeType, string> = {
  改期: '航司通知改期，宠物按新日期出发；旧航班保留为「已替代」',
  取消: '航班取消，需要重新订舱',
  当天拒载: '航司当天不让宠物上机（温度 / 箱体 / 文件），需接回并重新安排',
  无仓位: '申请的航班无动物仓位，改申请其他日期',
  暂定新日期: '先暂定一个新日期，等航司确认',
};

/** 订舱侧航变：只有订舱同事可用 */
export function FlightChangeDialog({ c, user }: { c: Case; user: User }) {
  const markFlightChange = useAppStore((s) => s.markFlightChange);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FlightChangeType>('改期');
  const [date, setDate] = useState(addDays(c.departure_date, 2));
  const [note, setNote] = useState('');
  const needDate = type !== '取消';
  const active = c.flights.find((f) => f.status === 'active');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" />}><PlaneTakeoff /> 标记航变</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>标记航变 · {c.pet_name}（{active?.flight_no ?? '未订舱'} {fmtMD(c.departure_date)}）</DialogTitle>
          <DialogDescription>确认后：旧航班保留只变颜色、生成影响清单、进「紧急变动」，并短信 + 站内通知除司机和财务以外的所有相关同事和接单销售。</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {FLIGHT_CHANGE_TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={cn('rounded-lg border p-2.5 text-left transition-colors hover:bg-muted', type === t ? 'border-primary bg-accent-2/40' : 'border-border')}>
              <div className="text-sm font-medium">{t}</div>
              <div className="mt-0.5 text-[0.7rem] leading-snug text-muted-foreground">{DESC[t]}</div>
            </button>
          ))}
        </div>
        {needDate && <div className="grid gap-1.5"><Label>新出发日期{type === '无仓位' || type === '当天拒载' ? '（可先填备选）' : ''}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>}
        <div className="grid gap-1.5"><Label>备注</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：LH 10/01 无仓位，备选 CX829 10/02" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button variant="destructive" onClick={() => { markFlightChange(c.id, type, needDate ? date : '', note, user.id); setOpen(false); }}>确认航变</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 操作侧航变：操作部只能改这几项，不能改航班本身 */
export function OpsFlightChangeDialog({ c, user }: { c: Case; user: User }) {
  const opsFlightChange = useAppStore((s) => s.opsFlightChange);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<OpsFlightChangeType>('本单时间暂定');
  const [date, setDate] = useState(addDays(c.departure_date, 3));
  const [note, setNote] = useState('');
  const needDate = type === '客人要求提前' || type === '客人要求延后';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="border-destructive/40 text-destructive" />}><UserRoundCog /> 航变情况（操作）</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>航变情况 · {c.pet_name}</DialogTitle>
          <DialogDescription>操作部只能填这几种情况，航班本身由订舱修改。提交后进「紧急变动」并短信通知管理员、订舱、后段和接单销售。</DialogDescription>
        </DialogHeader>
        <SimpleSelect value={type} onChange={(v) => setType(v as OpsFlightChangeType)} options={OPS_FLIGHT_CHANGE_TYPES} className="w-full" size="default" />
        {needDate && <div className="grid gap-1.5"><Label>客人希望的日期</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>}
        <div className="grid gap-1.5"><Label>备注</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="客人的原因、已和客人确认的内容" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button variant="destructive" onClick={() => { opsFlightChange(c.id, type, needDate ? date : '', note, user.id); setOpen(false); }}>提交</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 随机异常：主人改期 / 取消 / 航司异常 */
export function AccompanyExceptionDialog({ c, user }: { c: Case; user: User }) {
  const markAccompanyException = useAppStore((s) => s.markAccompanyException);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>(ACCOMPANY_CHANGE_TYPES[0]);
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" />}><PlaneTakeoff /> 标记异常</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>随机异常 · {c.pet_name}</DialogTitle>
          <DialogDescription>不论是航司变化还是主人变化，只要选了异常，就进「紧急变动」并短信通知除司机、财务以外的相关同事和接单销售。</DialogDescription>
        </DialogHeader>
        <SimpleSelect value={type} onChange={setType} options={ACCOMPANY_CHANGE_TYPES} className="w-full" size="default" />
        <div className="grid gap-1.5"><Label>说明</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：主人机票改到 10/05，需重新加宠物位置" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button variant="destructive" onClick={() => { markAccompanyException(c.id, type, note, user.id); setOpen(false); }}>提交</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
