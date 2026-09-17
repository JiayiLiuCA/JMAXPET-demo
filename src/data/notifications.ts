import type { Notification } from '@/types';

export const seedNotifications: Notification[] = [
  { id: 'n01', to_user_id: 'u_wang', kind: 'reminder', title: '48 小时提醒 · 采血', body: '9/18 09:30 糯米（JM-2026-053）采血，从 177 Bay St 到 Downtown Vet Clinic', case_id: 'c11', task_id: 't07', created_at: '2026-09-16T08:00:00', read: false },
  { id: 'n02', to_user_id: 'u_wang', kind: 'reminder', title: '24 小时提醒 · 送 CFIA', body: '9/17 09:00 Momo（JM-2026-064）送 CFIA，带健康证原件', case_id: 'c22', task_id: 't03', created_at: '2026-09-16T08:00:00', read: false },
  { id: 'n03', to_user_id: 'u_wang', kind: 'reminder', title: '24 小时提醒 · 送机', body: '9/17 20:30 Teddy（JM-2026-041）送机 YYZ 货站，CX829', case_id: 'c01', task_id: 't06', created_at: '2026-09-16T08:00:00', read: false },
  { id: 'n04', to_user_id: 'u_wang', kind: 'reminder', title: '当天提醒 · 接宠', body: '今天 10:00 Luna（JM-2026-046）接宠，135 Bay St → 寄养点', case_id: 'c05', task_id: 't01', created_at: '2026-09-16T07:00:00', read: true },
  { id: 'n05', to_user_id: 'u_li', kind: 'reminder', title: '24 小时提醒 · 送机', body: '9/17 08:00 豆豆（JM-2026-038）送机 YVR 货站，AC25', case_id: 'c02', task_id: 't05', created_at: '2026-09-16T08:00:00', read: false },
  { id: 'n06', to_user_id: 'u_li', kind: 'reminder', title: '48 小时提醒 · 接宠', body: '9/18 13:00 Bobo（JM-2026-063）接宠，大型犬带 #500 箱', case_id: 'c21', task_id: 't08', created_at: '2026-09-16T08:00:00', read: false },
  { id: 'n07', to_user_id: 'u_teddy', kind: 'task', title: '订舱任务 · Sesame', body: 'LH 10/1 无仓位，请查 CX829 10/2 或 LH 10/3 并回复', case_id: 'c26', created_at: '2026-09-15T16:20:00', read: false },
  { id: 'n08', to_user_id: 'u_teddy', kind: 'task', title: '订舱任务 · 旺财', body: 'AC31 9/25 仓位待航司回复，今天需要结果', case_id: 'c06', created_at: '2026-09-16T08:30:00', read: false },
  { id: 'n09', to_user_id: 'u_lin', kind: 'system', title: '步骤延误 · Mochi', body: 'CFIA 盖章 计划 9/14，已延误 2 天', case_id: 'c03', created_at: '2026-09-16T06:00:00', read: false },
  { id: 'n10', to_user_id: 'u_rita', kind: 'system', title: '待收尾款 · Peanut', body: 'JM-2026-067 已到家 3 天，尾款还没收，主人未回复', case_id: 'c25', created_at: '2026-09-16T06:00:00', read: false },
  { id: 'n11', to_user_id: 'u_zhang', kind: 'system', title: '已落地 · Biscuit', body: 'CX865 已落地 HKG，代理提货中，等海关放行', case_id: 'c24', created_at: '2026-09-15T06:30:00', read: true },
  { id: 'n12', to_user_id: 'u_rita', kind: 'flight_change', title: '航变 · Max（AC26 改期）', body: '10/18 → 10/20，影响清单已生成，主人已同步', case_id: 'c14', created_at: '2026-09-12T11:00:00', read: true },
];
