'use client';

import { useMemo, useState } from 'react';
import { Send, Lock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { userById } from '@/data/users';
import { fmtDateTime, fmtDate } from '@/lib/dates';
import { Field, TextAreaField } from '@/components/common/Field';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SectionProps } from '@/components/case/types';
import { cn } from '@/lib/utils';

/** 销售交接（自动联动销售接单）+ 内部备注（不可删除、标注添加人）+ 操作日志（所有改动自动记录） */
export function LogSection({ c, canEdit, user }: SectionProps) {
  const updateCase = useAppStore((s) => s.updateCase);
  const addNote = useAppStore((s) => s.addNote);
  const allLogs = useAppStore((s) => s.logs);
  const allNotes = useAppStore((s) => s.notes);
  const order = useAppStore((s) => s.salesOrders.find((o) => o.id === c.sales_order_id));
  const [text, setText] = useState('');
  const logs = useMemo(() => allLogs.filter((l) => l.case_id === c.id).sort((a, b) => b.at.localeCompare(a.at)), [allLogs, c.id]);
  const notes = useMemo(() => allNotes.filter((n) => n.case_id === c.id).sort((a, b) => a.at.localeCompare(b.at)), [allNotes, c.id]);
  const canNote = canEdit && !c.archived;
  const sales = userById(c.sales_id);
  const submit = () => { if (text.trim()) { addNote(c.id, text.trim(), user.id); setText(''); } };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-accent/40 p-3">
          <div className="mb-1 flex items-center gap-2 text-[0.7rem] tracking-wide text-muted-foreground">销售交接 {sales && <span className="inline-flex items-center gap-1"><UserAvatar user={sales} size="sm" />{sales.name}</span>}{order ? <span>· 自动联动接单 {order.id}（{fmtDate(order.created_at)}）</span> : <span>· 未关联接单</span>}</div>
          {order && (
            <div className="space-y-0.5 text-sm">
              <div>主人微信：{order.owner_wechat_name}（{order.owner_wechat_id}）</div>
              <div>定金 / 尾款：<span className="font-mono">{order.price_text} {order.currency}</span> · {order.origin_text}{order.dest_text ? ` · ${order.dest_text}` : ''}</div>
              <div>订单情况：{order.order_status_text}</div>
              {order.caution && <div className="text-[#6b4f12]">⚠ 注意事项：{order.caution}</div>}
            </div>
          )}
          <TextAreaField label="操作部补充的交接内容" value={c.sales_handover} editable={canNote && (user.role === 'admin' || user.role === 'ops_docs')} rows={2} className="mt-2" onChange={(v) => updateCase(c.id, { sales_handover: v }, user.id)} />
        </div>
        <div>
          <Field label="内部备注（任何人添加后不可删除，标注添加人）">
            <ul className="mt-1 space-y-1.5">
              {notes.map((n) => (
                <li key={n.id} className="flex gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                  <span className="flex-1">{n.text}</span>
                  <span className="shrink-0 text-[0.7rem] text-muted-foreground">{n.by} · {fmtDateTime(n.at)} <Lock className="inline size-2.5" /></span>
                </li>
              ))}
              {notes.length === 0 && <li className="text-sm text-muted-foreground">暂无备注</li>}
            </ul>
          </Field>
          {canNote && (
            <div className="mt-2 flex gap-1.5">
              <Input value={text} placeholder="添加内部备注（添加后不能删除）" className="h-8 bg-white" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
              <Button size="sm" variant="outline" disabled={!text.trim()} onClick={submit}><Send /> 添加</Button>
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="mb-2 text-[0.7rem] tracking-wide text-muted-foreground">操作日志（新增单、航变、信息修改、司机安排、附件、费用……全部自动记录，不可修改）</div>
        <ol className="thin-scroll relative ml-2 max-h-[22rem] overflow-y-auto border-l border-border pl-4">
          {logs.map((l) => (
            <li key={l.id} className="relative mb-2.5 last:mb-0">
              <span className={cn('absolute -left-[1.3rem] top-1.5 size-2.5 rounded-full ring-2 ring-white', l.actor === '系统' ? 'bg-lilac' : 'bg-primary')} />
              <div className="text-xs text-muted-foreground">{fmtDateTime(l.at)} · <span className={cn('font-medium', l.actor === '系统' ? 'text-[#7a6f95]' : 'text-foreground')}>{l.actor}</span></div>
              <div className="text-sm">{l.action}</div>
            </li>
          ))}
          {logs.length === 0 && <li className="text-sm text-muted-foreground">暂无日志</li>}
        </ol>
      </div>
    </div>
  );
}
