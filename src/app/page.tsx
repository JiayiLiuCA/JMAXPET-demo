'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plane, ShieldCheck, Truck, FileText, Users, Handshake, PackageCheck, Wallet, UserRound } from 'lucide-react';
import type { RoleKey } from '@/types';
import { users } from '@/data/users';
import { roles, PAGE_META, ROLE_ORDER } from '@/data/roles';
import { useAppStore } from '@/store/useAppStore';
import { UserAvatar } from '@/components/common/UserAvatar';

const ROLE_ICON: Record<RoleKey, typeof Plane> = { admin: ShieldCheck, sales: Handshake, ops_docs: FileText, booking_cargo: Plane, booking_accompany: UserRound, ops_post: PackageCheck, finance: Wallet, driver: Truck };

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore((s) => s.login);

  const go = (userId: string) => {
    const u = users.find((x) => x.id === userId)!;
    login(userId);
    router.push(PAGE_META.find((p) => p.key === roles[u.role].homePage)!.path);
  };
  const ordered = ROLE_ORDER.flatMap((r) => users.filter((u) => u.role === r));

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <section className="flex flex-col gap-8">
          <Image src="/logo.png" alt="JMAXPET animal travel" width={360} height={179} priority className="w-[19rem] lg:w-[22rem]" />
          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">内部操作系统 · 一期</h1>
            <p className="max-w-md text-base leading-relaxed text-[#595959]">
              Case 是唯一信息源：8 个角色各看各的 · 13 套文件 workflow 模板 · 每步传附件才能完成 · 托运 / 随机 / 仅代办文件 · 航变与司机异常进「紧急变动」并短信通知负责人 · 销售接单表与 Case 联动。
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-[#ece7e8] p-6 ring-1 ring-foreground/10">
            <div className="flex items-center gap-5">
              <Image src="/logo-mark.png" alt="" width={120} height={120} className="size-24 rounded-full object-cover ring-4 ring-white/80 lg:size-28" />
              <div className="space-y-1 text-sm text-[#595959]">
                <p className="font-medium text-foreground">Demo 说明</p>
                <p>点击右侧任一账号即登录，无需密码。</p>
                <p>所有数据为本地 seed，编辑只改内存；刷新页面回到初始状态。</p>
                <p>顶栏可随时切换账号、拨动「当前日期」演示提醒。短信未配 Twilio 时为模拟发送。</p>
              </div>
            </div>
            <span className="pointer-events-none absolute -right-6 -bottom-8 size-32 rounded-full bg-[#c8e0fe]/60" />
            <span className="pointer-events-none absolute -top-8 right-16 size-20 rounded-full bg-[#ecd7cc]/70" />
          </div>
        </section>

        <section className="space-y-2">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" /> 选择账号登录（8 个角色）
          </div>
          {ordered.map((u) => {
            const r = roles[u.role];
            const Icon = ROLE_ICON[u.role];
            return (
              <button
                key={u.id}
                onClick={() => go(u.id)}
                className="group flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-foreground/10 transition-all hover:-translate-y-px hover:ring-primary/40 hover:shadow-md"
              >
                <UserAvatar user={u} size="default" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{u.name}</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-foreground">{u.title}</span>
                    {r.mobile && <span className="rounded-full bg-accent-2 px-2 py-0.5 text-xs text-foreground">手机端</span>}
                    {r.readOnly && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">只读</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.description}</p>
                </div>
                <Icon className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
}
