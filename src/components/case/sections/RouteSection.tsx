'use client';

import type { Case } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { AIRPORT_CITY } from '@/data/options';
import { Field, TextField } from '@/components/common/Field';
import { shiftTimeline } from '@/lib/workflow';
import { fmtDateFull, relativeLabel } from '@/lib/dates';
import type { SectionProps } from '@/components/case/types';

export function RouteSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const today = useAppStore((s) => s.today);
  const tpl = useAppStore((s) => s.workflows.find((w) => w.id === c.template_id));
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  const setDeparture = (v: string) => {
    if (!v || !tpl) return;
    updateCase(c.id, { departure_date: v, timeline: shiftTimeline(c.timeline, tpl, v, today) }, user.id);
  };
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
      <Field label="出发机场 origin">{c.origin} · {AIRPORT_CITY[c.origin] ?? ''}</Field>
      <Field label="目的地">{c.dest_country} · {c.dest_region}</Field>
      <TextField label="路线 route" value={c.route} editable={canEdit} onChange={(v) => set({ route: v })} className="col-span-2" />
      <TextField label="出发日期 departure_date" value={c.departure_date} editable={canEdit} type="date" onChange={setDeparture} />
      <Field label="距出发">{relativeLabel(c.departure_date, today)}（{fmtDateFull(c.departure_date)}）</Field>
      <Field label="Workflow 模板" className="col-span-2">{tpl?.name}（{tpl?.mode} · 盖章机构 {tpl?.stamp_authority}）</Field>
    </div>
  );
}
