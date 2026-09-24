'use client';

import { useMemo, useState } from 'react';
import { Info, Plus, Lock } from 'lucide-react';
import type { Case, Currency, FeeBearer } from '@/types';
import { CURRENCIES, FEE_BEARERS, FINAL_PAYMENT_STATUSES } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate, fmtDateTime } from '@/lib/dates';
import { Field, SelectField, SimpleSelect, TextAreaField, TextField } from '@/components/common/Field';
import { Tag } from '@/components/common/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SectionProps } from '@/components/case/types';

/**
 * 收款情况（一期不记账）：定金 / 尾款 / 币种来自销售接单；操作部只能改尾款状态、加额外费用；
 * 额外费用一旦添加不可删除；财务只读。
 */
export function PaymentSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const addFee = useAppStore((s) => s.addFee);
  const setFeeBearer = useAppStore((s) => s.setFeeBearer);
  const today = useAppStore((s) => s.today);
  const allFees = useAppStore((s) => s.fees);
  const fees = useMemo(() => allFees.filter((f) => f.case_id === c.id).sort((a, b) => a.date.localeCompare(b.date)), [allFees, c.id]);
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  const isAdmin = user.role === 'admin';
  const opsEdit = canEdit && !c.archived && user.role !== 'finance';
  const [f, setF] = useState({ date: today, desc: '', amount: '', currency: c.currency as Currency, bearer: '暂未确认' as FeeBearer });
  const submit = () => {
    if (!f.desc || !f.amount) return;
    addFee(c.id, { date: f.date, desc: f.desc, amount: Number(f.amount), currency: f.currency, bearer: f.bearer }, user.id);
    setF({ date: today, desc: '', amount: '', currency: c.currency, bearer: '暂未确认' });
  };
  const totals = fees.reduce<Record<string, number>>((m, x) => ({ ...m, [`${x.bearer}|${x.currency}`]: (m[`${x.bearer}|${x.currency}`] ?? 0) + x.amount }), {});
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-5">
        <TextField label="订单金额" value={String(c.order_amount)} editable={isAdmin && canEdit} onChange={(v) => set({ order_amount: Number(v) || 0 })} />
        <TextField label="定金" value={String(c.deposit_amount)} editable={isAdmin && canEdit} onChange={(v) => set({ deposit_amount: Number(v) || 0, final_amount: c.order_amount - (Number(v) || 0) })} />
        <TextField label="尾款" value={String(c.final_amount)} editable={isAdmin && canEdit} onChange={(v) => set({ final_amount: Number(v) || 0 })} />
        {isAdmin && canEdit ? <div className="min-w-0"><div className="text-[0.7rem] tracking-wide text-muted-foreground">币种</div><SimpleSelect value={c.currency} onChange={(v) => set({ currency: v as Currency })} options={CURRENCIES} className="mt-0.5 w-full" /></div> : <Field label="币种">{c.currency}</Field>}
        <SelectField label="尾款情况（操作部可改）" value={c.final_payment_status} editable={opsEdit} options={FINAL_PAYMENT_STATUSES} onChange={(v) => set({ final_payment_status: v as Case['final_payment_status'] })} />
        <TextAreaField label="收款备注" value={c.payment_notes} editable={opsEdit} rows={1} className="col-span-full" onChange={(v) => set({ payment_notes: v })} />
      </div>

      <div className="border-t pt-3">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.7rem] tracking-wide text-muted-foreground">
          额外费用（运输费用以外的任何费用，确认后不可删除）
          {Object.entries(totals).map(([k, v]) => { const [b, cur] = k.split('|'); return <Tag key={k} tone={b === '客人承担' ? 'warn' : b === '公司承担' ? 'neutral' : 'accent'}>{b} {v.toLocaleString()} {cur}</Tag>; })}
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground"><tr><th className="py-1 text-left font-medium">日期</th><th className="py-1 text-left font-medium">费用</th><th className="py-1 text-right font-medium">金额</th><th className="py-1 text-left font-medium">币种</th><th className="py-1 text-left font-medium">承担方</th><th className="py-1 text-left font-medium">添加</th></tr></thead>
          <tbody>
            {fees.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="py-1.5">{fmtDate(x.date)}</td>
                <td className="py-1.5">{x.desc}</td>
                <td className="py-1.5 text-right font-mono">{x.amount.toLocaleString()}</td>
                <td className="py-1.5">{x.currency}</td>
                <td className="py-1.5">{opsEdit ? <SimpleSelect value={x.bearer} onChange={(v) => setFeeBearer(x.id, v as FeeBearer, user.id)} options={FEE_BEARERS} className="h-7 w-28 text-xs" /> : x.bearer}</td>
                <td className="py-1.5 text-xs text-muted-foreground">{x.by} · {fmtDateTime(x.at)} <Lock className="inline size-2.5" /></td>
              </tr>
            ))}
            {fees.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">暂无额外费用</td></tr>}
          </tbody>
        </table>
        {opsEdit && (
          <div className="mt-2 grid grid-cols-[8.5rem_1fr_6rem_5rem_7rem_auto] items-end gap-1.5">
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="h-8 bg-white" />
            <Input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="打狂犬 + 芯片 / 办健康证 / 买狗粮" className="h-8 bg-white" />
            <Input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="金额" className="h-8 bg-white font-mono" />
            <SimpleSelect value={f.currency} onChange={(v) => setF({ ...f, currency: v as Currency })} options={CURRENCIES} className="h-8" />
            <SimpleSelect value={f.bearer} onChange={(v) => setF({ ...f, bearer: v as FeeBearer })} options={FEE_BEARERS} className="h-8" />
            <Button size="sm" onClick={submit} disabled={!f.desc || !f.amount}><Plus /> 添加</Button>
          </div>
        )}
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Info className="size-3.5" /> 一期只记录状态、金额与额外费用条目；实际收支、汇率、报销在二期财务模块。客人承担的额外费用会自动进财务的「需收款」。</p>
    </div>
  );
}
