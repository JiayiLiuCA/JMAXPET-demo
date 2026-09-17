'use client';

import { Check, FileWarning } from 'lucide-react';
import type { Case } from '@/types';
import { FILES_STATUSES } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { STEP_STATUS_COLOR } from '@/lib/buckets';
import { fmtDate, relativeLabel } from '@/lib/dates';
import { Field, SelectField, TextAreaField, TextField } from '@/components/common/Field';
import { StatusBadge, Tag } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import type { SectionProps } from '@/components/case/types';
import { cn } from '@/lib/utils';

const DOC_STEP_ROLES = new Set(['ops_docs']);

export function DocsSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const completeCaseStep = useAppStore((s) => s.completeCaseStep);
  const today = useAppStore((s) => s.today);
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  const steps = c.timeline.filter((s) => DOC_STEP_ROLES.has(s.owner_role));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        <TextField label="狂犬 1 针 vacc_rabies_1" value={c.vacc_rabies_1} editable={canEdit} type="date" onChange={(v) => set({ vacc_rabies_1: v })} />
        <TextField label="狂犬 2 针 vacc_rabies_2" value={c.vacc_rabies_2} editable={canEdit} type="date" onChange={(v) => set({ vacc_rabies_2: v })} />
        {c.species === 'cat' && <TextField label="FVRCP" value={c.vacc_fvrcp} editable={canEdit} type="date" onChange={(v) => set({ vacc_fvrcp: v })} />}
        <TextField label="FAVN 采血" value={c.vacc_favn} editable={canEdit} type="date" onChange={(v) => set({ vacc_favn: v })} />
        <TextField label="IHC 健康证签发" value={c.vacc_ihc} editable={canEdit} type="date" onChange={(v) => set({ vacc_ihc: v, health_cert_issued: v })} />
        <SelectField label="文件状态 files_status" value={c.files_status} editable={canEdit} options={FILES_STATUSES} onChange={(v) => set({ files_status: v as Case['files_status'] })} />
        <Field label="预计疫苗 / 采血 / 健康证">
          {fmtDate(c.expected_vaccine_date)} · {fmtDate(c.expected_blood_draw_date)} · {fmtDate(c.expected_health_cert_date)}
        </Field>
        <TextAreaField label="疫苗备注" value={c.vacc_notes} editable={canEdit} rows={1} onChange={(v) => set({ vacc_notes: v })} />
      </div>

      <div>
        <div className="mb-2 text-[11px] tracking-wide text-muted-foreground">文件 Timeline（前期文件负责步骤）</div>
        <ol className="relative ml-2 border-l border-border pl-4">
          {steps.map((s) => (
            <li key={s.key} className="relative mb-3 last:mb-0">
              <span className="absolute -left-[21px] top-1 size-2.5 rounded-full ring-2 ring-white" style={{ background: STEP_STATUS_COLOR[s.status] }} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={cn('text-sm', s.key === c.current_step_key && 'font-semibold')}>{s.label}</span>
                <StatusBadge value={s.status} kind="step" />
                <span className={cn('text-xs', s.status === '延误' ? 'text-destructive' : 'text-muted-foreground')}>计划 {fmtDate(s.planned_date)}（{relativeLabel(s.planned_date, today)}）</span>
                {s.missing_docs.map((d) => <Tag key={d} tone="warn"><FileWarning className="mr-0.5 size-3" />{d}</Tag>)}
                {s.status !== '完成' && canEdit && (
                  <Button size="xs" variant="outline" className="ml-auto" onClick={() => completeCaseStep(c.id, s.key, user.id)}><Check /> 标记完成</Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
