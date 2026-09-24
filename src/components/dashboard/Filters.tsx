'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { users } from '@/data/users';
import { AIRPORT_CITY, DEST_REGIONS, STATIONS } from '@/data/options';
import { SimpleSelect } from '@/components/common/Field';
import { Button } from '@/components/ui/button';

export interface FilterState { origin: string; assignee: string; region: string }
export const emptyFilter: FilterState = { origin: '', assignee: '', region: '' };

const ASSIGNEE_ROLES = ['ops_docs', 'booking_cargo', 'booking_accompany', 'ops_post', 'sales'];

/** 站点 / 负责人 / 入境国家（地区） */
export function Filters({ value, onChange, hideAssignee }: { value: FilterState; onChange: (v: FilterState) => void; hideAssignee?: boolean }) {
  const active = value.origin || value.assignee || value.region;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" /> 筛选</span>
      <SimpleSelect value={value.origin} onChange={(v) => onChange({ ...value, origin: v })} options={STATIONS.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]}` }))} allowEmpty="全部站点" className="w-36" />
      {!hideAssignee && <SimpleSelect value={value.assignee} onChange={(v) => onChange({ ...value, assignee: v })} options={users.filter((u) => ASSIGNEE_ROLES.includes(u.role)).map((u) => ({ value: u.id, label: u.name }))} allowEmpty="全部负责人" className="w-32" />}
      <SimpleSelect value={value.region} onChange={(v) => onChange({ ...value, region: v })} options={DEST_REGIONS} allowEmpty="全部入境国家 / 地区" className="w-40" />
      {active && <Button size="xs" variant="ghost" onClick={() => onChange(emptyFilter)}><X /> 清除</Button>}
    </div>
  );
}

export const applyFilter = <T extends { origin: string; dest_region: string; ops_docs_id: string; booking_id: string; ops_post_id: string; sales_id: string }>(list: T[], f: FilterState) =>
  list.filter((c) => (!f.origin || c.origin === f.origin) && (!f.region || c.dest_region === f.region) && (!f.assignee || [c.ops_docs_id, c.booking_id, c.ops_post_id, c.sales_id].includes(f.assignee)));
