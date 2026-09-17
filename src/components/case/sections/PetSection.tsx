'use client';

import type { Case } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { petEmojiOf } from '@/data/cases';
import { Field, TextField, TextAreaField } from '@/components/common/Field';
import { fmtDate } from '@/lib/dates';
import type { SectionProps } from '@/components/case/types';

export function PetSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        <Field label="宠物名">{petEmojiOf(c)} {c.pet_name}</Field>
        <TextField label="品种" value={c.breed} editable={canEdit} onChange={(v) => set({ breed: v })} />
        <TextField label="性别" value={c.gender} editable={false} />
        <TextField label="出生日期" value={c.birth_date} editable={canEdit} type="date" onChange={(v) => set({ birth_date: v })} />
        <TextField label="体重 (kg)" value={String(c.weight)} editable={canEdit} onChange={(v) => set({ weight: Number(v) || 0 })} />
        <TextField label="毛色" value={c.color} editable={canEdit} onChange={(v) => set({ color: v })} />
        <TextField label="芯片号 chip_no" value={c.chip_no} editable={canEdit} onChange={(v) => set({ chip_no: v })} />
        <TextField label="航空箱 crate_no" value={c.crate_no} editable={canEdit} onChange={(v) => set({ crate_no: v })} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 md:grid-cols-4">
        <TextField label="寄养开始" value={c.foster_start} editable={canEdit} type="date" onChange={(v) => set({ foster_start: v })} />
        <TextField label="寄养结束" value={c.foster_end} editable={canEdit} type="date" onChange={(v) => set({ foster_end: v })} />
        <TextField label="用药次数 / 天" value={String(c.foster_med_count)} editable={canEdit} onChange={(v) => set({ foster_med_count: Number(v) || 0 })} />
        <Field label="寄养时长">{c.foster_start && c.foster_end ? `${fmtDate(c.foster_start)} ~ ${fmtDate(c.foster_end)}` : '无寄养'}</Field>
        <TextAreaField label="寄养备注" value={c.foster_notes} editable={canEdit} rows={2} className="col-span-full" onChange={(v) => set({ foster_notes: v })} />
      </div>
    </div>
  );
}
