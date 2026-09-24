'use client';

import { useState } from 'react';
import { Plane, ArrowRight, AlertTriangle } from 'lucide-react';
import type { Case } from '@/types';
import { ACCOMPANY_STATUSES, AIRLINE_CONFIRMED, AIRPORT_CITY, CABINS } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { diffDays, fmtDateTime, fmtMD } from '@/lib/dates';
import { Field, SelectField, SimpleSelect, TextAreaField, TextField } from '@/components/common/Field';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AccompanyExceptionDialog, FlightChangeDialog, OpsFlightChangeDialog } from '@/components/case/FlightChangeDialog';
import { AddFlightDialog, BookingDialog } from '@/components/case/BookingDialog';
import { AttachmentList } from '@/components/case/AttachmentList';
import type { SectionProps } from '@/components/case/types';
import { cn } from '@/lib/utils';

const FLIGHT_ROW: Record<string, string> = { active: '', superseded: 'bg-warning/15 text-muted-foreground', cancelled: 'bg-destructive/10 text-muted-foreground line-through' };
const FLIGHT_TAG: Record<string, { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string }> = { active: { tone: 'ok', label: '当前' }, superseded: { tone: 'warn', label: '已替代' }, cancelled: { tone: 'danger', label: '已取消' } };

export function FlightSection({ c, canEdit, user }: SectionProps) {
  if (c.case_type === '随机') return <AccompanyFlight c={c} canEdit={canEdit} user={user} />;
  return <CargoFlight c={c} canEdit={canEdit} user={user} />;
}

/** 托运：只有订舱能改航班；操作部只能填"航变情况"；改航班旧记录保留只变颜色 */
function CargoFlight({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const updateFlight = useAppStore((s) => s.updateFlight);
  const fillRoute = useAppStore((s) => s.fillRoute);
  const routes = useAppStore((s) => s.routes);
  const [routeId, setRouteId] = useState('');
  const isBooking = user.role === 'booking_cargo' || user.role === 'admin';
  const isOps = user.role === 'ops_docs' || user.role === 'admin';
  const bookingEdit = canEdit && isBooking && !c.archived;
  const candidates = routes.filter((r) => r.origin === c.origin);
  const docsOnly = c.case_type === '仅代办文件';
  if (docsOnly) return <div className="text-sm text-muted-foreground">仅代办文件：主人自行订票出行，不需要订舱。若主人想改成全包托运，在 ③ 路线里改 Case 类型即可。</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField label="航班状态" value={c.airline_confirmed} editable={bookingEdit} options={AIRLINE_CONFIRMED} onChange={(v) => updateCase(c.id, { airline_confirmed: v as Case['airline_confirmed'] }, user.id)} kindBadge={<StatusBadge value={c.airline_confirmed} kind="airline" />} className="w-36" />
        {bookingEdit && (
          <div className="flex items-end gap-1.5">
            <div>
              <div className="text-[0.7rem] tracking-wide text-muted-foreground">从航线速查填入（常走的）</div>
              <SimpleSelect value={routeId} onChange={setRouteId} options={candidates.map((r) => ({ value: r.id, label: `${r.airline_code} ${r.flight_no} → ${r.dest}${r.type === '中转' ? ` 经 ${r.via}` : ''}` }))} placeholder="选航线…" className="mt-0.5 w-56" />
            </div>
            <Button size="sm" variant="outline" disabled={!routeId} onClick={() => { fillRoute(c.id, routeId, user.id); setRouteId(''); }}>填入</Button>
            <AddFlightDialog c={c} user={user} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {bookingEdit && <BookingDialog c={c} user={user} />}
          {bookingEdit && <FlightChangeDialog c={c} user={user} />}
          {isOps && !c.archived && <OpsFlightChangeDialog c={c} user={user} />}
        </div>
      </div>

      {c.flight_change && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span><span className="font-medium">操作侧航变：{c.flight_change}</span>{c.flight_change_note ? ` · ${c.flight_change_note}` : ''}（订舱确认新航班后自动清除）</span>
        </div>
      )}

      {c.flights.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">尚无航班记录 · {isBooking ? '从航线速查填入或手动录入' : '等订舱同事录入'}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow><TableHead>航司</TableHead><TableHead>航班号</TableHead><TableHead>起飞（出发港口 · 日期时间）</TableHead><TableHead>到达（入境港口 · 当地时间）</TableHead><TableHead>AWB</TableHead><TableHead>确认</TableHead><TableHead>记录状态</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {c.flights.map((f) => (
              <TableRow key={f.id} className={cn(FLIGHT_ROW[f.status])}>
                <TableCell><span className="inline-flex items-center gap-1"><Plane className="size-3.5 text-muted-foreground" />{f.airline}</span></TableCell>
                <TableCell className="font-mono">{f.flight_no}</TableCell>
                <TableCell><div>{f.from_code} {AIRPORT_CITY[f.from_code] ?? ''}</div><div className="text-xs text-muted-foreground">{fmtDateTime(f.dep_time)}</div></TableCell>
                <TableCell><div className="inline-flex items-center gap-1"><ArrowRight className="size-3 text-muted-foreground" />{f.to_code} {AIRPORT_CITY[f.to_code] ?? ''}</div><div className="text-xs text-muted-foreground">{fmtDateTime(f.arr_time)}</div></TableCell>
                <TableCell>{bookingEdit && f.status === 'active' ? <Input value={f.awb} placeholder="160-12345678" className="h-7 w-36 bg-white font-mono text-xs" onChange={(e) => updateFlight(c.id, f.id, { awb: e.target.value }, user.id)} /> : <span className="font-mono">{f.awb || '—'}</span>}</TableCell>
                <TableCell>{f.confirmed ? <Tag tone="ok">已确认</Tag> : <Tag tone="warn">未确认</Tag>}</TableCell>
                <TableCell><Tag tone={FLIGHT_TAG[f.status].tone}>{FLIGHT_TAG[f.status].label}</Tag>{f.note && <div className="mt-0.5 text-[0.7rem] text-muted-foreground">{f.note}</div>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="border-t pt-3">
        <Field label="航司文件（订舱确认件、AWB、承诺书等，订舱上传，其他人可下载）">
          <div className="mt-1"><AttachmentList caseId={c.id} category="airline" user={user} canUpload={bookingEdit} /></div>
        </Field>
      </div>
    </div>
  );
}

/** 随机：找随机人、加宠物位置；备注至少每两天更新 */
function AccompanyFlight({ c, canEdit, user }: SectionProps) {
  const updateAccompany = useAppStore((s) => s.updateAccompany);
  const today = useAppStore((s) => s.today);
  const isBooking = user.role === 'booking_accompany' || user.role === 'admin';
  const edit = canEdit && isBooking && !c.archived;
  const stale = c.accompany_notes_updated && diffDays(c.accompany_notes_updated, today) >= 2 && c.accompany_status !== '已添加宠物位置';
  const [notes, setNotes] = useState(c.accompany_notes);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        <div className="min-w-0">
          <div className="text-[0.7rem] tracking-wide text-muted-foreground">是否需要找随机人（与列表联动）</div>
          <label className="mt-1 inline-flex items-center gap-2 text-sm"><Checkbox checked={c.accompany_needed} disabled={!edit} onCheckedChange={(v) => updateAccompany(c.id, { accompany_needed: !!v }, user.id)} />{c.accompany_needed ? '需要找随机人' : '主人随行，不需要'}</label>
        </div>
        <SelectField label="随机状态" value={c.accompany_status} editable={edit} options={ACCOMPANY_STATUSES} onChange={(v) => updateAccompany(c.id, { accompany_status: v as Case['accompany_status'] }, user.id)} kindBadge={<StatusBadge value={c.accompany_status} kind="accompany" />} />
        <TextField label="随机人姓名（航班确认后添加）" value={c.accompany_person} editable={edit && c.accompany_needed} onChange={(v) => updateAccompany(c.id, { accompany_person: v }, user.id)} />
        {edit ? <div className="min-w-0"><div className="text-[0.7rem] tracking-wide text-muted-foreground">客舱 or 氧舱</div><SimpleSelect value={c.cabin} onChange={(v) => updateAccompany(c.id, { cabin: v as Case['cabin'] }, user.id)} options={CABINS.filter(Boolean)} allowEmpty="未定" className="mt-0.5 w-full" /></div> : <Field label="客舱 or 氧舱">{c.cabin || '未定'}</Field>}
      </div>
      <div className={cn('rounded-lg p-3', stale ? 'bg-destructive/10' : 'bg-muted/50')}>
        <div className="mb-1 flex items-center gap-2 text-[0.7rem] tracking-wide text-muted-foreground">
          进度备注（至少每两天填写一次）
          {c.accompany_notes_updated && <span>上次更新 {fmtMD(c.accompany_notes_updated)}</span>}
          {stale && <Tag tone="danger">超过 2 天未更新</Tag>}
        </div>
        {edit ? (
          <div className="flex gap-1.5">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white" placeholder="今天联系了谁、航司回复了什么…" />
            <Button size="sm" variant="outline" disabled={notes === c.accompany_notes} onClick={() => updateAccompany(c.id, { accompany_notes: notes }, user.id)}>更新</Button>
          </div>
        ) : <div className="text-sm">{c.accompany_notes || '—'}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.7rem] tracking-wide text-muted-foreground">主人 / 随机人航班（航司、航班号、起飞、到达）</span>
        <div className="ml-auto flex gap-1.5">{edit && <AddFlightDialog c={c} user={user} />}{edit && <AccompanyExceptionDialog c={c} user={user} />}</div>
      </div>
      {c.flights.length === 0 ? <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">尚未录入航班</div> : (
        <Table>
          <TableHeader><TableRow><TableHead>航司</TableHead><TableHead>航班号</TableHead><TableHead>起飞</TableHead><TableHead>到达（local）</TableHead><TableHead>记录状态</TableHead></TableRow></TableHeader>
          <TableBody>
            {c.flights.map((f) => (
              <TableRow key={f.id} className={cn(FLIGHT_ROW[f.status])}>
                <TableCell>{f.airline}</TableCell><TableCell className="font-mono">{f.flight_no}</TableCell>
                <TableCell>{f.from_code} <span className="text-xs text-muted-foreground">{fmtDateTime(f.dep_time)}</span></TableCell>
                <TableCell>{f.to_code} <span className="text-xs text-muted-foreground">{fmtDateTime(f.arr_time)}</span></TableCell>
                <TableCell><Tag tone={FLIGHT_TAG[f.status].tone}>{FLIGHT_TAG[f.status].label}</Tag>{f.note && <span className="ml-1 text-[0.7rem] text-muted-foreground">{f.note}</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <TextAreaField label="异常情况（主人改期等）" value={c.flight_change_note} editable={false} rows={1} />
      <div className="border-t pt-3"><Field label="航司文件"><div className="mt-1"><AttachmentList caseId={c.id} category="airline" user={user} canUpload={edit} /></div></Field></div>
    </div>
  );
}
