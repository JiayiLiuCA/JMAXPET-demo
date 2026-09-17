'use client';

import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { fmtDateTime } from '@/lib/dates';
import { TextAreaField } from '@/components/common/Field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SectionProps } from '@/components/case/types';
import { cn } from '@/lib/utils';

export function LogSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const addLog = useAppStore((s) => s.addLog);
  const allLogs = useAppStore((s) => s.logs);
  const [text, setText] = useState('');
  const sorted = useMemo(() => allLogs.filter((l) => l.case_id === c.id).sort((a, b) => b.at.localeCompare(a.at)), [allLogs, c.id]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextAreaField label="销售交接 sales_handover" value={c.sales_handover} editable={canEdit} rows={3} onChange={(v) => updateCase(c.id, { sales_handover: v }, user.id)} />
        <TextAreaField label="内部备注 notes_extra" value={c.notes_extra} editable={canEdit} rows={3} onChange={(v) => updateCase(c.id, { notes_extra: v }, user.id)} />
      </div>
      {canEdit && (
        <div className="flex gap-1.5">
          <Input value={text} placeholder="写一条操作日志…" className="h-8 bg-white" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { addLog(c.id, user.id, text.trim()); setText(''); } }} />
          <Button size="sm" variant="outline" disabled={!text.trim()} onClick={() => { addLog(c.id, user.id, text.trim()); setText(''); }}><Send /> 记录</Button>
        </div>
      )}
      <ol className="relative ml-2 border-l border-border pl-4">
        {sorted.map((l) => (
          <li key={l.id} className="relative mb-2.5 last:mb-0">
            <span className={cn('absolute -left-[1.3rem] top-1.5 size-2.5 rounded-full ring-2 ring-white', l.actor === '系统' ? 'bg-lilac' : 'bg-primary')} />
            <div className="text-xs text-muted-foreground">{fmtDateTime(l.at)} · <span className={cn('font-medium', l.actor === '系统' ? 'text-[#7a6f95]' : 'text-foreground')}>{l.actor}</span></div>
            <div className="text-sm">{l.action}</div>
          </li>
        ))}
        {sorted.length === 0 && <li className="text-sm text-muted-foreground">暂无日志</li>}
      </ol>
    </div>
  );
}
