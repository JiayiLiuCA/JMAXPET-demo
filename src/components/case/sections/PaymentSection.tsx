'use client';

import { Info } from 'lucide-react';
import type { Case } from '@/types';
import { PAYMENT_STATUSES, FINAL_PAYMENT_STATUSES } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { SelectField, TextAreaField } from '@/components/common/Field';
import type { SectionProps } from '@/components/case/types';

/** 收款情况：只记录状态和备注，不做提醒、不管明细（客户另有 invoice / 记账软件） */
export function PaymentSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        <SelectField label="收款情况 payment_status" value={c.payment_status} editable={canEdit} options={PAYMENT_STATUSES} onChange={(v) => set({ payment_status: v as Case['payment_status'] })} />
        <SelectField label="尾款情况 final_payment_status" value={c.final_payment_status} editable={canEdit} options={FINAL_PAYMENT_STATUSES} onChange={(v) => set({ final_payment_status: v as Case['final_payment_status'] })} />
        <TextAreaField label="收款备注" value={c.payment_notes} editable={canEdit} rows={2} className="col-span-2" onChange={(v) => set({ payment_notes: v })} />
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Info className="size-3.5" /> 只记录收款状态，明细与开票在 invoice / 记账软件里处理。</p>
    </div>
  );
}
