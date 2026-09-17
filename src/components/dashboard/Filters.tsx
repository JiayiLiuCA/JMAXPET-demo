'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { users } from '@/data/users';
import { AIRPORT_CITY } from '@/data/options';
import { SimpleSelect } from '@/components/common/Field';
import { Button } from '@/components/ui/button';

export interface FilterState { origin: string; assignee: string; dest: string }
export const emptyFilter: FilterState = { origin: '', assignee: '', dest: '' };

const ORIGINS = ['YYZ', 'YVR', 'JFK', 'LAX', 'PVG'];
const DESTS = ['香港', '上海', '北京', '广州', '多伦多', '温哥华', '墨尔本'];

export function Filters({ value, onChange, hideAssignee }: { value: FilterState; onChange: (v: FilterState) => void; hideAssignee?: boolean }) {
  const active = value.origin || value.assignee || value.dest;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" /> 筛选</span>
      <SimpleSelect value={value.origin} onChange={(v) => onChange({ ...value, origin: v })} options={ORIGINS.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]}` }))} allowEmpty="全部站点" className="w-36" />
      {!hideAssignee && <SimpleSelect value={value.assignee} onChange={(v) => onChange({ ...value, assignee: v })} options={users.filter((u) => ['ops_docs', 'ops_logistics', 'booking'].includes(u.role)).map((u) => ({ value: u.id, label: u.name }))} allowEmpty="全部负责人" className="w-32" />}
      <SimpleSelect value={value.dest} onChange={(v) => onChange({ ...value, dest: v })} options={DESTS} allowEmpty="全部目的地" className="w-32" />
      {active && <Button size="xs" variant="ghost" onClick={() => onChange(emptyFilter)}><X /> 清除</Button>}
    </div>
  );
}

export const applyFilter = <T extends { origin: string; dest_region: string; ops_docs_id: string; ops_logistics_id: string; booking_id: string }>(list: T[], f: FilterState) =>
  list.filter((c) => (!f.origin || c.origin === f.origin) && (!f.dest || c.dest_region === f.dest) && (!f.assignee || [c.ops_docs_id, c.ops_logistics_id, c.booking_id].includes(f.assignee)));
