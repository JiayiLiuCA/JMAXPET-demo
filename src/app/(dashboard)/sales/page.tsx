'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Plus, Link2 } from 'lucide-react';
import type { Currency, SalesOrder, User } from '@/types';
import { CURRENCIES } from '@/data/options';
import { users, userById } from '@/data/users';
import { petEmojiOf } from '@/data/cases';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { fmtDate, fmtMonth, monthKey } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleSelect } from '@/components/common/Field';
import { Tag } from '@/components/common/StatusBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { NewCaseDialog } from '@/components/case/NewCaseDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * 接单信息表：销售录新单 + 历史接单（按实际出发月份分组、每月单量）。
 * 操作部录单后自动关联 File No；订舱确认后实际出发日期自动回填。其他部门只读，操作部可改宠物名和 File No。
 */
export default function SalesPage() {
  const user = useCurrentUser();
  if (!user) return null;
  const isSales = user.role === 'sales';
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {isSales ? <SalesTabs user={user} /> : <OrderList user={user} />}
    </div>
  );
}

function SalesTabs({ user }: { user: User }) {
  const [tab, setTab] = useState<'new' | 'mine'>('new');
  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'new' | 'mine')}>
        <TabsList><TabsTrigger value="new">新单录入</TabsTrigger><TabsTrigger value="mine">我的接单</TabsTrigger></TabsList>
      </Tabs>
      {tab === 'new' ? <NewOrderForm user={user} onDone={() => setTab('mine')} /> : <OrderList user={user} />}
    </>
  );
}

function NewOrderForm({ user, onDone }: { user: User; onDone: () => void }) {
  const createSalesOrder = useAppStore((s) => s.createSalesOrder);
  const [f, setF] = useState({ owner_wechat_name: '', owner_wechat_id: '', origin_text: '', dest_text: '', price_text: '', currency: 'CAD' as Currency, order_status_text: '', caution: '', pet_name: '' });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const ok = f.owner_wechat_name && f.owner_wechat_id && f.origin_text && f.price_text && f.order_status_text;
  const submit = () => {
    createSalesOrder({ sales_id: user.id, ...f }, user.id);
    setF({ owner_wechat_name: '', owner_wechat_id: '', origin_text: '', dest_text: '', price_text: '', currency: 'CAD', order_status_text: '', caution: '', pet_name: '' });
    onDone();
  };
  return (
    <div className="mx-auto max-w-2xl rounded-xl bg-white p-5 ring-1 ring-foreground/10">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><ClipboardList className="size-4 text-primary" /> 新单录入 <span className="text-xs font-normal text-muted-foreground">越简单越好：必填 6 项，宠物名可后补</span></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5"><Label>接单销售</Label><Input value={user.name} disabled /></div>
        <div className="grid gap-1.5"><Label>宠物名字（非必填）</Label><Input value={f.pet_name} onChange={(e) => set('pet_name', e.target.value)} placeholder="客人信息表填得慢可以后补" /></div>
        <div className="grid gap-1.5"><Label>主人微信名 *</Label><Input value={f.owner_wechat_name} onChange={(e) => set('owner_wechat_name', e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>主人微信号 *</Label><Input value={f.owner_wechat_id} onChange={(e) => set('owner_wechat_id', e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>出发地及目的地 *</Label><Input value={f.origin_text} onChange={(e) => set('origin_text', e.target.value)} placeholder="多伦多 → 香港" /></div>
        <div className="grid gap-1.5"><Label>最终目的地（详细）</Label><Input value={f.dest_text} onChange={(e) => set('dest_text', e.target.value)} placeholder="香港九龙塘" /></div>
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <div className="grid gap-1.5"><Label>定金 / 尾款 *</Label><Input value={f.price_text} onChange={(e) => set('price_text', e.target.value)} placeholder="8000/18000" /></div>
          <div className="grid gap-1.5"><Label>币种</Label><SimpleSelect value={f.currency} onChange={(v) => set('currency', v)} options={CURRENCIES} className="w-full" size="default" /></div>
        </div>
        <div className="grid gap-1.5"><Label>订单情况 *</Label><Input value={f.order_status_text} onChange={(e) => set('order_status_text', e.target.value)} placeholder="泰迪 6kg，9 月中出发，全包托运" /></div>
        <div className="col-span-2 grid gap-1.5"><Label>注意事项</Label><Textarea rows={3} value={f.caution} onChange={(e) => set('caution', e.target.value)} placeholder="跟客人前期沟通时提到的一切信息、特殊约定" /></div>
      </div>
      <div className="mt-4 flex justify-end"><Button onClick={submit} disabled={!ok}><Plus /> 保存接单</Button></div>
    </div>
  );
}

function OrderList({ user }: { user: User }) {
  const orders = useAppStore((s) => s.salesOrders);
  const cases = useAppStore((s) => s.cases);
  const [salesFilter, setSalesFilter] = useState(user.role === 'sales' ? user.id : '');
  const list = useMemo(() => orders.filter((o) => !salesFilter || o.sales_id === salesFilter), [orders, salesFilter]);
  const withCase = (o: SalesOrder) => cases.find((c) => c.id === o.case_id);
  /** 时间分区：按实际出发日期（订舱确认后）分月；未确认 / 未录单归"未定" */
  const groups = useMemo(() => {
    const m = new Map<string, SalesOrder[]>();
    list.forEach((o) => {
      const c = withCase(o);
      const key = c && c.departure_confirmed ? monthKey(c.departure_date) : '';
      m.set(key, [...(m.get(key) ?? []), o]);
    });
    return Array.from(m.entries()).sort((a, b) => (a[0] === '' ? 1 : b[0] === '' ? -1 : b[0].localeCompare(a[0])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, cases]);
  const canEditOps = user.role === 'admin' || user.role === 'ops_docs';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{user.role === 'sales' ? '我的接单' : '接单信息表'}</span>
        <span className="text-xs text-muted-foreground">{user.role === 'sales' ? '按实际出发月份分区；操作部录单后 File No 和实际出发日期自动联动' : canEditOps ? '只读；可编辑宠物名字和 File No，并从接单直接录单' : '只读'}</span>
        {user.role !== 'sales' && <SimpleSelect value={salesFilter} onChange={setSalesFilter} options={users.filter((u) => u.role === 'sales').map((u) => ({ value: u.id, label: u.name }))} allowEmpty="全部销售" className="ml-auto w-28" />}
      </div>
      {groups.map(([key, os]) => (
        <section key={key || 'none'} className="overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
          <header className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-sm font-semibold">{key ? fmtMonth(`${key}-01`) : '出发日期未定 / 未录单'}<span className="rounded-full bg-white px-1.5 text-xs font-normal text-muted-foreground ring-1 ring-foreground/10">{os.length} 单</span></header>
          <Table>
            <TableHeader><TableRow className="text-xs hover:bg-transparent"><TableHead className="h-8">接单日期</TableHead><TableHead className="h-8">销售</TableHead><TableHead className="h-8">宠物</TableHead><TableHead className="h-8">File No</TableHead><TableHead className="h-8">主人微信</TableHead><TableHead className="h-8">出发地 → 目的地</TableHead><TableHead className="h-8">定金 / 尾款</TableHead><TableHead className="h-8">实际出发日期</TableHead><TableHead className="h-8">订单情况 / 注意事项</TableHead><TableHead className="h-8" /></TableRow></TableHeader>
            <TableBody>
              {os.map((o) => <OrderRow key={o.id} o={o} c={withCase(o)} user={user} canEditOps={canEditOps} />)}
            </TableBody>
          </Table>
        </section>
      ))}
      {groups.length === 0 && <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">还没有接单</div>}
    </div>
  );
}

function OrderRow({ o, c, user, canEditOps }: { o: SalesOrder; c?: ReturnType<typeof useAppStore.getState>['cases'][number]; user: User; canEditOps: boolean }) {
  const updateSalesOrder = useAppStore((s) => s.updateSalesOrder);
  const cases = useAppStore((s) => s.cases);
  const openCase = useOpenCase();
  const [editing, setEditing] = useState(false);
  const [pet, setPet] = useState(o.pet_name);
  const [cid, setCid] = useState(o.case_id);
  const canOpen = user.role !== 'sales';
  return (
    <TableRow>
      <TableCell className="text-xs">{fmtDate(o.created_at)}</TableCell>
      <TableCell><span className="inline-flex items-center gap-1.5"><UserAvatar user={userById(o.sales_id)} size="sm" />{userById(o.sales_id)?.name}</span></TableCell>
      <TableCell>
        {editing ? <Input value={pet} onChange={(e) => setPet(e.target.value)} className="h-7 w-28" /> : (o.pet_name ? `${c ? petEmojiOf(c) : ''} ${o.pet_name}` : <span className="text-muted-foreground">待补</span>)}
      </TableCell>
      <TableCell>
        {editing ? (
          <SimpleSelect value={cid} onChange={setCid} options={cases.filter((x) => !x.archived).map((x) => ({ value: x.id, label: `${x.file_no} ${x.pet_name}` }))} allowEmpty="未关联" className="w-44" />
        ) : c ? <button onClick={() => canOpen && openCase(c.id)} className={cn('font-mono text-xs', canOpen && 'hover:underline')}>{c.file_no}</button> : <Tag tone="warn">未录单</Tag>}
      </TableCell>
      <TableCell className="text-xs">{o.owner_wechat_name}<div className="text-muted-foreground">{o.owner_wechat_id}</div></TableCell>
      <TableCell className="text-xs">{o.origin_text}{o.dest_text && <div className="text-muted-foreground">{o.dest_text}</div>}</TableCell>
      <TableCell className="font-mono text-xs">{o.price_text} <span className="text-muted-foreground">{o.currency}</span></TableCell>
      <TableCell className="text-xs">{c ? (c.departure_confirmed ? <span className="font-medium">{fmtDate(c.departure_date)}</span> : <span className="text-muted-foreground">预计 {fmtDate(c.departure_date)}</span>) : <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="max-w-[18rem] text-xs text-[#595959]"><div>{o.order_status_text}</div>{o.caution && <div className="text-[#6b4f12]">⚠ {o.caution}</div>}</TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {canEditOps && !editing && <Button size="xs" variant="ghost" onClick={() => setEditing(true)}><Link2 /> 编辑</Button>}
        {canEditOps && editing && <Button size="xs" onClick={() => { updateSalesOrder(o.id, { pet_name: pet, case_id: cid }, user.id); setEditing(false); }}>保存</Button>}
        {canEditOps && !c && !editing && <NewCaseDialog user={user} order={o} label="录单" size="xs" />}
      </TableCell>
    </TableRow>
  );
}
