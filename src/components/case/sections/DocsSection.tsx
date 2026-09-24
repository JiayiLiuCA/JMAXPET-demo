'use client';

import { useState } from 'react';
import { Check, FileWarning, Send, Paperclip } from 'lucide-react';
import type { Case } from '@/types';
import { FILES_STATUSES } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { STEP_STATUS_COLOR } from '@/lib/buckets';
import { fmtMD, relativeLabel } from '@/lib/dates';
import { isDocStep, preDocsDone } from '@/lib/workflow';
import { userName } from '@/data/users';
import { Field, SelectField, TextAreaField, TextField } from '@/components/common/Field';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AttachmentList } from '@/components/case/AttachmentList';
import type { SectionProps } from '@/components/case/types';
import { cn } from '@/lib/utils';

/** 疫苗 / 文件 Timeline：每步需上传照片或文件才能点完成；另有"其他文件"上传处 */
export function DocsSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const completeCaseStep = useAppStore((s) => s.completeCaseStep);
  const notifyBooking = useAppStore((s) => s.notifyBooking);
  const attachments = useAppStore((s) => s.attachments);
  const today = useAppStore((s) => s.today);
  const [note, setNote] = useState('');
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  const steps = c.timeline.filter((s) => isDocStep(s.key) || s.key === 'booking' || s.key === 'accompany_booking');
  const hasAtt = (key: string) => attachments.some((a) => a.case_id === c.id && a.category === 'step' && a.step_key === key);
  const canOps = user.role === 'admin' || user.role === 'ops_docs';
  const docsDone = preDocsDone(c);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        <TextField label="狂犬 1 针" value={c.vacc_rabies_1} editable={canEdit} type="date" onChange={(v) => set({ vacc_rabies_1: v })} />
        <TextField label="狂犬 2 针" value={c.vacc_rabies_2} editable={canEdit} type="date" onChange={(v) => set({ vacc_rabies_2: v })} />
        <TextField label={c.species === 'cat' ? 'FVRCP' : 'DHPP / 联合疫苗'} value={c.vacc_combo} editable={canEdit} type="date" onChange={(v) => set({ vacc_combo: v })} />
        <TextField label="采血日期" value={c.vacc_blood} editable={canEdit} type="date" onChange={(v) => set({ vacc_blood: v })} />
        <TextField label="健康证 / 检疫证签发日" value={c.health_cert_issued} editable={canEdit} type="date" onChange={(v) => set({ health_cert_issued: v })} />
        <SelectField label="文件状态" value={c.files_status} editable={canEdit} options={FILES_STATUSES} onChange={(v) => set({ files_status: v as Case['files_status'] })} />
        <TextAreaField label="疫苗 / 文件备注" value={c.vacc_notes} editable={canEdit} rows={1} className="col-span-2" onChange={(v) => set({ vacc_notes: v })} />
      </div>

      {c.booking_id && (
        <div className={cn('flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs', c.booking_notified ? 'bg-success/15 text-[#2f5a3c]' : 'bg-muted/60 text-[#595959]')}>
          <Send className="size-3.5" />
          {c.booking_notified ? `已转给订舱 ${userName(c.booking_id)}` : docsDone ? '前期文件已办完，将自动转给订舱' : `前期文件办完后自动转给订舱 ${userName(c.booking_id)}；文件还没办完但需要先把舱位定下来时，可提前通知`}
          {canOps && !c.booking_notified && !c.archived && (
            <Popover>
              <PopoverTrigger render={<Button size="xs" variant="outline" className="ml-auto" />}><Send /> 提前通知订舱</PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="text-xs text-muted-foreground">写一句给订舱同事的备注（例如：狂犬要 10/01 才打完，但 10/15 的舱位要先定）</div>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注（必填）" className="bg-white" />
                <div className="flex justify-end"><Button size="sm" disabled={!note.trim()} onClick={() => { notifyBooking(c.id, user.id, note.trim()); setNote(''); }}>通知</Button></div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2 text-[0.7rem] tracking-wide text-muted-foreground">文件 Timeline（按 workflow 自动生成）<span className="inline-flex items-center gap-1"><Paperclip className="size-3" />带附件要求的步骤，传了照片或文件才能点完成</span></div>
        <ol className="relative ml-2 border-l border-border pl-4">
          {steps.map((s) => {
            const needs = s.required_docs.length > 0;
            const ok = !needs || hasAtt(s.key);
            const canDo = canEdit && s.status !== '完成' && (user.role === 'admin' || user.role === s.owner_role);
            const canUpload = !c.archived && (user.role === 'admin' || user.role === s.owner_role || (user.role === 'ops_docs' && canEdit));
            return (
              <li key={s.key} className="relative mb-3 last:mb-0">
                <span className="absolute -left-[1.3rem] top-1 size-2.5 rounded-full ring-2 ring-white" style={{ background: STEP_STATUS_COLOR[s.status] }} />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={cn('text-sm', s.key === c.current_step_key && 'font-semibold')}>{s.label}</span>
                  <StatusBadge value={s.status} kind="step" />
                  <span className={cn('text-xs', s.status === '延误' ? 'text-destructive' : 'text-muted-foreground')}>计划 {fmtMD(s.planned_date)}（{relativeLabel(s.planned_date, today)}）· {s.offset_rule}</span>
                  {s.status === '完成' && s.completed_by && <span className="text-xs text-muted-foreground">{s.completed_by} 完成于 {fmtMD(s.completed_at)}</span>}
                  {s.status !== '完成' && s.missing_docs.map((d) => <Tag key={d} tone={ok ? 'ok' : 'warn'}><FileWarning className="mr-0.5 size-3" />{d}</Tag>)}
                  {canDo && <Button size="xs" variant="outline" className="ml-auto" disabled={!ok} title={ok ? '' : '先上传附件'} onClick={() => completeCaseStep(c.id, s.key, user.id)}><Check /> 标记完成</Button>}
                </div>
                {s.description && <div className="mt-0.5 text-xs text-muted-foreground">{s.description}</div>}
                {(needs || hasAtt(s.key)) && <div className="mt-1.5"><AttachmentList caseId={c.id} category="step" stepKey={s.key} user={user} canUpload={canUpload} compact emptyText={needs ? '还没上传' : ''} /></div>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="border-t pt-3">
        <Field label="其他文件（没有对应步骤的：主人护照复印件、授权书、截图等）">
          <div className="mt-1"><AttachmentList caseId={c.id} category="other" user={user} canUpload={!c.archived && (canEdit || user.role === 'admin')} /></div>
        </Field>
      </div>
    </div>
  );
}
