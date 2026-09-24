'use client';

import type { Case } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { AIRPORT_CITY, AIRPORT_COUNTRY, AIRPORT_REGION } from '@/data/options';
import { Field, TextField, SimpleSelect } from '@/components/common/Field';
import { Tag } from '@/components/common/StatusBadge';
import { fmtDateFull, relativeLabel } from '@/lib/dates';
import type { SectionProps } from '@/components/case/types';

const ORIGIN_COUNTRIES = ['加拿大', '美国', '中国'];
const ENTRIES = ['HKG', 'PVG', 'PEK', 'CAN', 'SZX', 'YYZ', 'YVR', 'JFK', 'LAX', 'LHR', 'DXB', 'NRT', 'MEL'];

export function RouteSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const setDeparture = useAppStore((s) => s.setDeparture);
  const changeCaseSetup = useAppStore((s) => s.changeCaseSetup);
  const today = useAppStore((s) => s.today);
  const tpl = useAppStore((s) => s.workflows.find((w) => w.id === c.template_id));
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  const canSetup = canEdit && (user.role === 'admin' || user.role === 'ops_docs') && !c.archived;
  const Sel = ({ label, value, options, onChange, allowEmpty }: { label: string; value: string; options: readonly (string | { value: string; label: string })[]; onChange: (v: string) => void; allowEmpty?: string }) => (
    <div className="min-w-0"><div className="text-[0.7rem] tracking-wide text-muted-foreground">{label}</div><SimpleSelect value={value} onChange={onChange} options={options} allowEmpty={allowEmpty} className="mt-0.5 w-full" /></div>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        {canEdit ? <Sel label="出发国家" value={c.origin_country} options={ORIGIN_COUNTRIES} onChange={(v) => set({ origin_country: v })} /> : <Field label="出发国家">{c.origin_country}</Field>}
        <TextField label="出发地" value={c.origin_city} editable={canEdit} onChange={(v) => set({ origin_city: v })} />
        {canEdit ? <Sel label="入境机场" value={c.entry_airport} options={ENTRIES.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]} · ${AIRPORT_COUNTRY[o]}` }))} onChange={(v) => set({ entry_airport: v, dest_country: AIRPORT_COUNTRY[v] ?? c.dest_country, dest_region: AIRPORT_REGION[v] ?? c.dest_region, route: `${c.origin} → ${v}` })} /> : <Field label="入境机场">{c.entry_airport} · {AIRPORT_CITY[c.entry_airport]}</Field>}
        <TextField label="最终目的地" value={c.final_dest} editable={canEdit} onChange={(v) => set({ final_dest: v })} />
        <Field label="站点 / 入境地区">{c.origin} → {c.dest_region}</Field>
        <TextField label="路线" value={c.route} editable={canEdit} onChange={(v) => set({ route: v })} className="col-span-2" />
        <TextField label={c.departure_confirmed ? '实际出发日期（订舱已确认）' : '预计出发日期（订舱确认后变实际）'} value={c.departure_date} editable={canEdit} type="date" onChange={(v) => setDeparture(c.id, v, user.id)} />
        <Field label="距出发">{relativeLabel(c.departure_date, today)}（{fmtDateFull(c.departure_date)}）{c.departure_confirmed ? <Tag tone="ok" className="ml-1">实际</Tag> : <Tag tone="warn" className="ml-1">预计</Tag>}</Field>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 md:grid-cols-4">
        {canSetup ? <Sel label="Case 类型（可中途改，已完成步骤保留）" value={c.case_type} options={['托运', '随机', '仅代办文件']} onChange={(v) => changeCaseSetup(c.id, { case_type: v as Case['case_type'] }, user.id)} /> : <Field label="Case 类型">{c.case_type}</Field>}
        {canSetup && c.case_type === '托运' ? <Sel label="服务范围" value={c.service_scope} options={['全包', '仅订舱']} onChange={(v) => changeCaseSetup(c.id, { service_scope: v as Case['service_scope'] }, user.id)} /> : <Field label="服务范围">{c.case_type === '托运' ? c.service_scope : '—'}</Field>}
        {canSetup && c.case_type === '托运' ? <Sel label="收尾款节点（可调，默认清关后）" value={c.final_payment_point} options={['清关后', '送机前', '到家后']} onChange={(v) => changeCaseSetup(c.id, { final_payment_point: v as Case['final_payment_point'] }, user.id)} /> : <Field label="收尾款节点">{c.case_type === '托运' ? c.final_payment_point : c.case_type === '随机' ? '接单前全款' : '—'}</Field>}
        <Field label="Workflow 模板">{tpl?.name}（盖章 {tpl?.stamp_authority}）{tpl?.links?.length ? <a href={tpl.links[0]} target="_blank" rel="noreferrer" className="ml-1 text-xs underline">官网</a> : null}</Field>
      </div>
    </div>
  );
}
