'use client';

import { useRef } from 'react';
import { Paperclip, Upload, Download, FileText, Image as ImageIcon } from 'lucide-react';
import type { Attachment, AttachmentCategory, User } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { userName } from '@/data/users';
import { fmtDateTime } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** 附件列表 + 上传（demo：文件只存在浏览器内存，用 object URL 下载） */
export function AttachmentList({ caseId, category, stepKey = '', user, canUpload, compact, emptyText = '还没有附件' }: { caseId: string; category: AttachmentCategory; stepKey?: string; user: User; canUpload: boolean; compact?: boolean; emptyText?: string }) {
  const all = useAppStore((s) => s.attachments);
  const addAttachment = useAppStore((s) => s.addAttachment);
  const ref = useRef<HTMLInputElement>(null);
  const list = all.filter((a) => a.case_id === caseId && a.category === category && (category !== 'step' || a.step_key === stepKey));
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => addAttachment(caseId, category, stepKey, { name: f.name, size: f.size, mime: f.type, url: URL.createObjectURL(f) }, user.id));
    if (ref.current) ref.current.value = '';
  };
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', compact ? '' : 'rounded-lg bg-muted/40 p-2')}>
      {list.map((a) => <AttachmentChip key={a.id} a={a} />)}
      {list.length === 0 && <span className="text-xs text-muted-foreground">{emptyText}</span>}
      {canUpload && (
        <>
          <input ref={ref} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <Button size="xs" variant="outline" onClick={() => ref.current?.click()}><Upload /> 上传</Button>
        </>
      )}
    </div>
  );
}

export function AttachmentChip({ a }: { a: Attachment }) {
  const Icon = a.mime.startsWith('image/') ? ImageIcon : FileText;
  const inner = (
    <>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="max-w-[12rem] truncate">{a.name}</span>
      <span className="text-[0.65rem] text-muted-foreground">{fmtSize(a.size)}</span>
      {a.url ? <Download className="size-3 text-muted-foreground" /> : null}
    </>
  );
  const title = `${userName(a.uploaded_by)} 上传于 ${fmtDateTime(a.uploaded_at)}${a.url ? '' : '（demo 示例文件，不可下载）'}`;
  if (a.url) return <a href={a.url} download={a.name} target="_blank" rel="noreferrer" title={title} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-foreground/10 hover:bg-accent-2/40">{inner}</a>;
  return <span title={title} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-foreground/10"><Paperclip className="size-3 text-muted-foreground" />{inner}</span>;
}
