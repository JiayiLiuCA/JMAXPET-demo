'use client';

import { useAppStore } from '@/store/useAppStore';
import { TextAreaField } from '@/components/common/Field';
import type { SectionProps } from '@/components/case/types';

export function HandoverSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  return <TextAreaField label="销售交接 sales_handover" value={c.sales_handover} editable={canEdit} rows={3} onChange={(v) => updateCase(c.id, { sales_handover: v }, user.id)} />;
}
