'use client';

import { useState } from 'react';
import { Home, Send } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate } from '@/lib/dates';
import { TextAreaField } from '@/components/common/Field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SectionProps } from '@/components/case/types';

export function FosterSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const addFosterDaily = useAppStore((s) => s.addFosterDaily);
  const [note, setNote] = useState('');
  if (!c.foster_start) return <div className="text-sm text-muted-foreground">该 Case 无寄养安排。</div>;
  const submit = () => { if (note.trim()) { addFosterDaily(c.id, note.trim(), user.id); setNote(''); } };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm"><Home className="size-4 text-muted-foreground" /> 寄养 {fmtDate(c.foster_start)} ~ {fmtDate(c.foster_end)} · 用药 {c.foster_med_count} 次/天 · {c.foster_notes}</div>
      {canEdit && (
        <div className="flex gap-1.5">
          <Input value={note} placeholder="今日情况：吃饭 / 排便 / 精神 / 视频已发…" className="h-8 bg-white" onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          <Button size="sm" variant="outline" disabled={!note.trim()} onClick={submit}><Send /> 记录</Button>
        </div>
      )}
      <ul className="space-y-1.5">
        {[...c.foster_daily].reverse().map((d, i) => (
          <li key={i} className="flex gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">{fmtDate(d.date)}</span>
            <span className="flex-1">{d.note}</span>
            <span className="text-xs text-muted-foreground">{d.by}</span>
          </li>
        ))}
        {c.foster_daily.length === 0 && <li className="text-sm text-muted-foreground">尚无寄养日常记录</li>}
      </ul>
      <TextAreaField label="寄养日志 foster_log" value={c.foster_log} editable={canEdit} rows={2} onChange={(v) => updateCase(c.id, { foster_log: v }, user.id)} />
    </div>
  );
}
