'use client';

import { AlertTriangle, Info, OctagonAlert, X, Truck, HeartPulse, Home, FileText, BellRing } from 'lucide-react';
import type { ImpactReport } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { userName } from '@/data/users';
import { fmtDate, fmtDateTime } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const KIND_ICON = { driver: Truck, health_cert: HeartPulse, foster: Home, docs: FileText } as const;
const LEVEL = {
  info: { icon: Info, cls: 'bg-accent-2/50 text-foreground' },
  warn: { icon: AlertTriangle, cls: 'bg-warning/40 text-[#6b4f12]' },
  danger: { icon: OctagonAlert, cls: 'bg-destructive/10 text-destructive' },
} as const;

export function ImpactCard({ report }: { report: ImpactReport }) {
  const clearImpact = useAppStore((s) => s.clearImpact);
  return (
    <div className="rounded-xl border border-destructive/40 bg-white p-4 shadow-sm ring-4 ring-destructive/10">
      <div className="flex items-start gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-sm font-semibold">航变影响清单 · {report.change_type}</div>
          <div className="text-xs text-muted-foreground">
            {fmtDate(report.old_date)}{report.new_date !== report.old_date ? ` → ${fmtDate(report.new_date)}` : ''} · 生成于 {fmtDateTime(report.created_at)}
          </div>
        </div>
        <Button size="icon-xs" variant="ghost" onClick={clearImpact}><X /></Button>
      </div>
      <ul className="mt-3 space-y-1.5">
        {report.items.map((it, i) => {
          const L = LEVEL[it.level];
          const K = KIND_ICON[it.kind];
          return (
            <li key={i} className={cn('flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm', L.cls)}>
              <K className="mt-0.5 size-3.5 shrink-0" />
              <span className="flex-1">{it.text}</span>
              <L.icon className="mt-0.5 size-3.5 shrink-0 opacity-70" />
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-[#595959]">
        <BellRing className="size-3.5" /> 已通知：{report.notified.map(userName).join('、') || '—'}
      </div>
    </div>
  );
}
