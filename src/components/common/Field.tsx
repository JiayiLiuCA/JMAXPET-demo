'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function Field({ label, children, className, mono }: { label: string; children?: React.ReactNode; className?: string; mono?: boolean }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11px] tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 min-h-5 text-sm text-foreground break-words', mono && 'font-mono')}>{children ?? '—'}</div>
    </div>
  );
}

/** 读写切换的文本字段 */
export function TextField({ label, value, onChange, editable, type = 'text', placeholder, className }: { label: string; value: string; onChange?: (v: string) => void; editable?: boolean; type?: string; placeholder?: string; className?: string }) {
  if (!editable) return <Field label={label} className={className}>{value || '—'}</Field>;
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11px] tracking-wide text-muted-foreground">{label}</div>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange?.(e.target.value)} className="mt-0.5 h-7 bg-white text-sm" />
    </div>
  );
}

export function TextAreaField({ label, value, onChange, editable, rows = 3, className }: { label: string; value: string; onChange?: (v: string) => void; editable?: boolean; rows?: number; className?: string }) {
  if (!editable) return <Field label={label} className={className}><span className="whitespace-pre-wrap">{value || '—'}</span></Field>;
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11px] tracking-wide text-muted-foreground">{label}</div>
      <Textarea value={value} rows={rows} onChange={(e) => onChange?.(e.target.value)} className="mt-0.5 bg-white text-sm" />
    </div>
  );
}

const NONE = '__none__';

/** 简化的 Select：options 为字符串或 {value,label} */
export function SimpleSelect({ value, onChange, options, placeholder, className, size = 'sm', disabled, allowEmpty }: {
  value: string; onChange: (v: string) => void; options: readonly (string | { value: string; label: string })[]; placeholder?: string; className?: string; size?: 'sm' | 'default'; disabled?: boolean; allowEmpty?: string;
}) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o || NONE, label: o || (allowEmpty ?? '—') } : { value: o.value || NONE, label: o.label }));
  if (allowEmpty && !items.some((i) => i.value === NONE)) items.unshift({ value: NONE, label: allowEmpty });
  return (
    <Select value={value ? value : allowEmpty ? NONE : null} onValueChange={(v) => onChange(!v || v === NONE ? '' : (v as string))} items={items} disabled={disabled}>
      <SelectTrigger size={size} className={cn('bg-white', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SelectField({ label, value, onChange, options, editable, className, kindBadge }: { label: string; value: string; onChange?: (v: string) => void; options: readonly string[]; editable?: boolean; className?: string; kindBadge?: React.ReactNode }) {
  if (!editable) return <Field label={label} className={className}>{kindBadge ?? (value || '—')}</Field>;
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11px] tracking-wide text-muted-foreground">{label}</div>
      <SimpleSelect value={value} onChange={(v) => onChange?.(v)} options={options} className="mt-0.5 w-full" allowEmpty={options.includes('') ? '—' : undefined} />
    </div>
  );
}
