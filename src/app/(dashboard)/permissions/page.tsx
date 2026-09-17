'use client';

import { ShieldCheck, Info } from 'lucide-react';
import type { RoleKey } from '@/types';
import { users } from '@/data/users';
import { roles, SECTION_META, PAGE_META } from '@/data/roles';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Tag } from '@/components/common/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ROLE_ORDER: RoleKey[] = ['admin', 'ops_docs', 'ops_logistics', 'booking', 'driver'];

export default function PermissionsPage() {
  const user = useCurrentUser();
  const permissions = useAppStore((s) => s.permissions);
  const togglePermission = useAppStore((s) => s.togglePermission);
  if (!user) return null;
  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 text-sm font-semibold">账号列表</h2>
        <div className="rounded-xl bg-white ring-1 ring-foreground/10">
          <Table>
            <TableHeader><TableRow><TableHead>账号</TableHead><TableHead>角色</TableHead><TableHead>Case 可见范围</TableHead><TableHead>可见页面</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell><span className="inline-flex items-center gap-2"><UserAvatar user={u} size="sm" /><span className="font-medium">{u.name}</span>{u.station && <span className="text-xs text-muted-foreground">{u.station}</span>}</span></TableCell>
                  <TableCell>{roles[u.role].label}</TableCell>
                  <TableCell className="text-xs text-[#595959]">{roles[u.role].description}</TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{roles[u.role].pages.map((p) => <Tag key={p} tone="neutral">{PAGE_META.find((x) => x.key === p)?.label}</Tag>)}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" /> 权限矩阵（角色 × Case 分区 × 查看 / 编辑）</h2>
        <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"><Info className="size-3.5" /> 点击即生效（内存状态）。取消「查看」后，该角色打开 Case 时对应分区变为灰色卡片，只显示负责人与进度。</p>
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium">角色 \ 分区</th>
                {SECTION_META.map((s) => <th key={s.key} className="px-2 py-2 text-center font-medium whitespace-nowrap">{s.index} {s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROLE_ORDER.map((rk) => (
                <tr key={rk} className="border-b last:border-0">
                  <td className="sticky left-0 bg-white px-3 py-2 whitespace-nowrap">
                    <div className="font-medium">{roles[rk].label}</div>
                    <div className="text-[0.7rem] text-muted-foreground">{users.filter((u) => u.role === rk).map((u) => u.name).join('、')}</div>
                  </td>
                  {SECTION_META.map((s) => {
                    const p = permissions[rk][s.key];
                    return (
                      <td key={s.key} className="px-2 py-2 text-center">
                        <div className="inline-flex items-center gap-3">
                          <label className="inline-flex items-center gap-1 text-xs"><Checkbox checked={p.view} onCheckedChange={() => togglePermission(rk, s.key, 'view')} disabled={rk === 'admin'} />看</label>
                          <label className="inline-flex items-center gap-1 text-xs"><Checkbox checked={p.edit} onCheckedChange={() => togglePermission(rk, s.key, 'edit')} disabled={rk === 'admin'} />改</label>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
