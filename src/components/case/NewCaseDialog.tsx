'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CaseType, SalesOrder, ServiceScope, Species, User } from '@/types';
import { users } from '@/data/users';
import { AIRPORT_CITY, AIRPORT_COUNTRY, SPECIES_EMOJI, SPECIES_LABEL, STATIONS } from '@/data/options';
import { useAppStore } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { addDays, fmtMD } from '@/lib/dates';
import { fullSteps, pickTemplate } from '@/lib/workflow';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/common/Field';

const BREEDS: Record<Species, string[]> = { dog: ['泰迪', '柯基', '柴犬', '金毛', '法斗', '西高地', '边牧', '拉布拉多'], cat: ['美短', '英短', '布偶', '田园猫'], rabbit: ['荷兰垂耳兔', '侏儒兔'] };
const ENTRIES = ['HKG', 'PVG', 'PEK', 'CAN', 'SZX', 'YYZ', 'YVR', 'JFK', 'LAX', 'LHR', 'DXB', 'NRT', 'MEL'];

/** 录单：可从销售接单带入；按出发国家 / 目的国家 / 物种自动选模板；Case 名统一 🐱 / 🐶 / 🐰 + 名字 */
export function NewCaseDialog({ user, order, label = '新建 Case（录单）', size = 'sm', defaultType = '托运' }: { user: User; order?: SalesOrder; label?: string; size?: 'xs' | 'sm'; defaultType?: CaseType }) {
  const workflows = useAppStore((s) => s.workflows);
  const orders = useAppStore((s) => s.salesOrders);
  const today = useAppStore((s) => s.today);
  const createCase = useAppStore((s) => s.createCase);
  const openCase = useOpenCase();
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState(order?.id ?? '');
  const [pet, setPet] = useState(order?.pet_name ?? '');
  const [species, setSpecies] = useState<Species>('dog');
  const [breed, setBreed] = useState('泰迪');
  const [owner, setOwner] = useState(order?.owner_wechat_name ?? '');
  const [origin, setOrigin] = useState('YYZ');
  const [entry, setEntry] = useState('HKG');
  const [finalDest, setFinalDest] = useState(order?.dest_text ?? '');
  const [dep, setDep] = useState(addDays(today, 60));
  const [type, setType] = useState<CaseType>(defaultType);
  const [scope, setScope] = useState<ServiceScope>('全包');
  const [tplOverride, setTplOverride] = useState('');
  const [docs, setDocs] = useState(user.role === 'ops_docs' ? user.id : 'u_lin');
  const unlinked = orders.filter((o) => !o.case_id);
  const so = orders.find((o) => o.id === orderId);

  useEffect(() => {
    if (!so) return;
    setPet(so.pet_name); setOwner(so.owner_wechat_name); setFinalDest(so.dest_text);
    const [from = '', to = ''] = so.origin_text.split(/→|->|>|到|—|-/).map((x) => x.trim());
    const code = (txt: string) => Object.entries(AIRPORT_CITY).find(([, city]) => txt.includes(city))?.[0];
    const o = code(from); const e = code(to);
    if (o) setOrigin(o);
    if (e) setEntry(e);
    if (/随机|随行/.test(so.order_status_text)) setType('随机');
    if (/代办文件/.test(so.order_status_text)) setType('仅代办文件');
  }, [so]);
  useEffect(() => { setBreed(BREEDS[species][0]); }, [species]);

  const suggested = useMemo(() => pickTemplate(AIRPORT_COUNTRY[origin] ?? '加拿大', AIRPORT_COUNTRY[entry] ?? '中国', species), [origin, entry, species]);
  const template = workflows.find((w) => w.id === tplOverride) ?? suggested ?? workflows[0];
  const payPoint = scope === '仅订舱' ? '送机前' : '清关后';
  const steps = useMemo(() => fullSteps(template, type, scope, payPoint), [template, type, scope, payPoint]);

  const submit = () => {
    const id = createCase({ sales_order_id: orderId, pet_name: pet || '新宠物', species, breed, owner_name: owner || '待补充', origin, entry_airport: entry, final_dest: finalDest, departure_date: dep, case_type: type, service_scope: scope, template_id: template.id, ops_docs_id: docs, sales_id: so?.sales_id ?? '' }, user.id);
    setOpen(false);
    openCase(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} />}>
        <Plus /> {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>录单 · 新建 Case</DialogTitle>
          <DialogDescription>File No 自动生成；按出发国家 / 目的国家 / 猫狗兔自动选 workflow 模板，按预计出发日倒推每一步；订舱确认后变成实际出发日期并回写销售接单。</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_17rem]">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid gap-1.5">
              <Label>从销售接单带入（可选）</Label>
              <SimpleSelect value={orderId} onChange={setOrderId} options={unlinked.map((o) => ({ value: o.id, label: `${o.owner_wechat_name} · ${o.origin_text} · ${o.price_text} ${o.currency}${o.pet_name ? ` · ${o.pet_name}` : ''}` }))} allowEmpty="不关联接单" className="w-full" size="default" disabled={!!order} />
              {so?.caution && <div className="text-xs text-[#6b4f12]">⚠ 销售注意事项：{so.caution}</div>}
            </div>
            <div className="grid gap-1.5"><Label>种类</Label><SimpleSelect value={species} onChange={(v) => setSpecies(v as Species)} options={(['dog', 'cat', 'rabbit'] as Species[]).map((s) => ({ value: s, label: `${SPECIES_EMOJI[s]} ${SPECIES_LABEL[s]}` }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>宠物名（Case 名 = {SPECIES_EMOJI[species]} + 名字）</Label><Input value={pet} onChange={(e) => setPet(e.target.value)} placeholder="Mochi / 豆豆" /></div>
            <div className="grid gap-1.5"><Label>品种</Label><SimpleSelect value={breed} onChange={setBreed} options={BREEDS[species]} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>主人姓名</Label><Input value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>出发机场（站点）</Label><SimpleSelect value={origin} onChange={(v) => { setOrigin(v); setTplOverride(''); }} options={STATIONS.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]} · ${AIRPORT_COUNTRY[o]}` }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>入境机场</Label><SimpleSelect value={entry} onChange={(v) => { setEntry(v); setTplOverride(''); }} options={ENTRIES.map((o) => ({ value: o, label: `${o} ${AIRPORT_CITY[o]} · ${AIRPORT_COUNTRY[o]}` }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>最终目的地</Label><Input value={finalDest} onChange={(e) => setFinalDest(e.target.value)} placeholder="香港九龙塘 / 上海浦东" /></div>
            <div className="grid gap-1.5"><Label>预计出发日期（周期一周）</Label><Input type="date" value={dep} onChange={(e) => setDep(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Case 类型</Label><SimpleSelect value={type} onChange={(v) => setType(v as CaseType)} options={['托运', '随机', '仅代办文件']} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>服务范围</Label><SimpleSelect value={scope} onChange={(v) => setScope(v as ServiceScope)} options={['全包', '仅订舱']} className="w-full" size="default" disabled={type !== '托运'} /></div>
            <div className="grid gap-1.5"><Label>Workflow 模板（自动匹配，可改）</Label><SimpleSelect value={template.id} onChange={setTplOverride} options={workflows.map((w) => ({ value: w.id, label: w.name }))} className="w-full" size="default" /></div>
            <div className="grid gap-1.5"><Label>前期文件负责人</Label><SimpleSelect value={docs} onChange={setDocs} options={users.filter((u) => u.role === 'ops_docs').map((u) => ({ value: u.id, label: u.name }))} className="w-full" size="default" /></div>
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-xs">
            <div className="font-medium text-foreground">Timeline 预览（{steps.length} 步）</div>
            <div className="text-muted-foreground">{template.short} · {type}{type === '托运' ? ` · ${scope}` : ''}</div>
            <ol className="thin-scroll mt-2 max-h-72 space-y-1 overflow-y-auto">
              {steps.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2">
                  <span>{s.label}{s.required_docs.length ? <span className="text-muted-foreground"> 📎</span> : null}</span>
                  <span className="font-mono text-muted-foreground">{fmtMD(addDays(dep, s.offset_days))}</span>
                </li>
              ))}
            </ol>
            {template.notes && <p className="mt-2 text-[0.7rem] text-muted-foreground">{template.notes}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={submit}>创建并打开</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
