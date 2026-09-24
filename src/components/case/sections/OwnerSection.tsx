'use client';

import type { Case } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { TextField } from '@/components/common/Field';
import type { SectionProps } from '@/components/case/types';

export function OwnerSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const set = (patch: Partial<Case>) => updateCase(c.id, patch, user.id);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
      <TextField label="主人姓名" value={c.owner_name} editable={canEdit} onChange={(v) => set({ owner_name: v })} />
      <TextField label="护照号" value={c.passport_no} editable={canEdit} onChange={(v) => set({ passport_no: v })} />
      <TextField label="邮箱" value={c.owner_email} editable={canEdit} onChange={(v) => set({ owner_email: v })} />
      <TextField label="国内电话" value={c.owner_phone_cn} editable={canEdit} onChange={(v) => set({ owner_phone_cn: v })} />
      <TextField label="海外电话" value={c.owner_phone_intl} editable={canEdit} onChange={(v) => set({ owner_phone_intl: v })} className="md:col-span-2" />
      <TextField label="国内地址" value={c.owner_addr_cn} editable={canEdit} onChange={(v) => set({ owner_addr_cn: v })} className="col-span-2 md:col-span-3" />
      <TextField label="海外地址" value={c.owner_addr_intl} editable={canEdit} onChange={(v) => set({ owner_addr_intl: v })} className="col-span-2 md:col-span-3" />
    </div>
  );
}
