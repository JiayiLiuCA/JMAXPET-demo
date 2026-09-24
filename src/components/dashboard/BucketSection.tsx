'use client';

import type { BucketDef, BucketItem } from '@/lib/buckets';
import { CaseTable } from '@/components/dashboard/CaseTable';

export function BucketSection({ bucket, items, subtitle, canOpen }: { bucket: BucketDef; items: BucketItem[]; subtitle?: string; canOpen?: boolean }) {
  return (
    <section id={`bucket-${bucket.key}`} className="scroll-mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
      <header className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2.5" style={{ boxShadow: `inset 4px 0 0 ${bucket.color}` }}>
        <span className="size-2.5 rounded-full" style={{ background: bucket.color }} />
        <h2 className="font-heading text-sm font-semibold text-foreground">{bucket.label}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        <span className="rounded-full bg-white px-1.5 text-xs text-muted-foreground ring-1 ring-foreground/10">{items.length}</span>
        {bucket.hint && <span className="text-xs text-muted-foreground">{bucket.hint}</span>}
      </header>
      {items.length === 0 ? <div className="px-4 py-3 text-sm text-muted-foreground">暂无</div> : <CaseTable items={items} canOpen={canOpen} />}
    </section>
  );
}
