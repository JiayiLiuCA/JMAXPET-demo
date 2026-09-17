import type { User } from '@/types';

export const users: User[] = [
  { id: 'u_rita', name: 'Rita', role: 'admin', title: '管理员 / 运营主管', color: '#2b5672' },
  { id: 'u_lin', name: '小林', role: 'ops_docs', title: '操作员 — 前期文件', color: '#d2ac72' },
  { id: 'u_zhou', name: '小周', role: 'ops_docs', title: '操作员 — 前期文件', color: '#c9a86a' },
  { id: 'u_zhang', name: '小张', role: 'ops_logistics', title: '操作员 — 接送与寄养', color: '#7fa88b' },
  { id: 'u_teddy', name: 'Teddy', role: 'booking', title: '订舱', color: '#5b7fa6' },
  { id: 'u_wang', name: '老王', role: 'driver', title: '司机（多伦多站）', color: '#a2675b', station: 'YYZ' },
  { id: 'u_li', name: '老李', role: 'driver', title: '司机（温哥华站）', color: '#b48a5a', station: 'YVR' },
];

export const userById = (id: string) => users.find((u) => u.id === id);
export const userName = (id: string) => userById(id)?.name ?? '—';
