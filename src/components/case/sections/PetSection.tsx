'use client';

import type { Case } from '@/types';
import { CRATE_SIZES, GENDERS, GENDER_LABEL, SPECIES_LABEL } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { petEmojiOf } from '@/data/cases';
import { Field, TextField, TextAreaField, SimpleSelect } from '@/components/common/Field';
import { diffDays, fmtDate } from '@/lib/dates';
import type { SectionProps } from '@/components/case/types';

export function PetSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  const days = c.foster_start && c.foster_end ? diffDays(c.foster_start, c.foster_end) : 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        <TextField label={`宠物名（${petEmojiOf(c)} ${SPECIES_LABEL[c.species]}）`} value={c.pet_name} editable={canEdit} onChange={(v) => set({ pet_name: v })} />
        <TextField label="品种" value={c.breed} editable={canEdit} onChange={(v) => set({ breed: v })} />
        {canEdit ? (
          <div className="min-w-0"><div className="text-[0.7rem] tracking-wide text-muted-foreground">性别</div><SimpleSelect value={c.gender} onChange={(v) => set({ gender: v as Case['gender'] })} options={GENDERS.map((g) => ({ value: g, label: GENDER_LABEL[g] }))} className="mt-0.5 w-full" /></div>
        ) : <Field label="性别">{GENDER_LABEL[c.gender] ?? c.gender}</Field>}
        <TextField label="出生日期" value={c.birth_date} editable={canEdit} type="date" onChange={(v) => set({ birth_date: v })} />
        <TextField label="体重（不固定单位）" value={String(c.weight || '')} editable={canEdit} placeholder="6.2 kg" onChange={(v) => set({ weight: Number(v.replace(/[^\d.]/g, '')) || 0 })} />
        <TextField label="毛色" value={c.color} editable={canEdit} onChange={(v) => set({ color: v })} />
        <TextField label="芯片号（15 位 xxx-xxx-xxx-xxx-xxx）" value={c.chip_no} editable={canEdit} placeholder="900-123-456-789-012" onChange={(v) => set({ chip_no: v })} />
        {canEdit ? (
          <div className="min-w-0"><div className="text-[0.7rem] tracking-wide text-muted-foreground">航空箱尺寸</div><SimpleSelect value={c.crate_size} onChange={(v) => set({ crate_size: v })} options={CRATE_SIZES} allowEmpty="未定（我们包）" className="mt-0.5 w-full" /></div>
        ) : <Field label="航空箱尺寸">{c.crate_size || '未定'}</Field>}
        <TextAreaField label="备注" value={c.pet_notes} editable={canEdit} rows={2} className="col-span-full" onChange={(v) => set({ pet_notes: v })} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 md:grid-cols-4">
        <TextField label="寄养开始日期" value={c.foster_start} editable={canEdit} type="date" onChange={(v) => set({ foster_start: v })} />
        <TextField label="寄养结束日期" value={c.foster_end} editable={canEdit} type="date" onChange={(v) => set({ foster_end: v })} />
        <Field label="寄养时长">{c.foster_start && c.foster_end ? `${days} 天（${fmtDate(c.foster_start)} ~ ${fmtDate(c.foster_end)}）` : '无寄养'}</Field>
        <TextAreaField label="寄养备注" value={c.foster_notes} editable={canEdit} rows={1} onChange={(v) => set({ foster_notes: v })} />
      </div>
    </div>
  );
}
