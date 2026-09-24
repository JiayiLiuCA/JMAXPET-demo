import type { User } from '@/types';

/** 电话均为编造（+1 416-555-01xx 式），仅用于短信 demo */
export const users: User[] = [
  { id: 'u_rita', name: 'Rita', role: 'admin', title: '操作部管理员 / 老板', color: '#2b5672', phone: '+1 416-555-0100' },
  { id: 'u_amy', name: 'Amy', role: 'sales', title: '销售', color: '#c97b84', phone: '+1 416-555-0111' },
  { id: 'u_ben', name: 'Ben', role: 'sales', title: '销售', color: '#b06a73', phone: '+1 604-555-0112' },
  { id: 'u_lin', name: '小林', role: 'ops_docs', title: '操作员 — 前期文件', color: '#d2ac72', phone: '+1 416-555-0121' },
  { id: 'u_zhou', name: '小周', role: 'ops_docs', title: '操作员 — 前期文件', color: '#c9a86a', phone: '+1 416-555-0122' },
  { id: 'u_teddy', name: 'Teddy', role: 'booking_cargo', title: '托运订舱', color: '#5b7fa6', phone: '+1 416-555-0131' },
  { id: 'u_vivian', name: 'Vivian', role: 'booking_accompany', title: '随机订舱', color: '#7a8fc9', phone: '+1 416-555-0132' },
  { id: 'u_zhang', name: '小张', role: 'ops_post', title: '操作员 — 后段（香港 / 中国大陆）', color: '#7fa88b', phone: '+86 138-0000-0141', regions: ['香港', '中国大陆'] },
  { id: 'u_he', name: '小何', role: 'ops_post', title: '操作员 — 后段（其他国家）', color: '#6f9a7c', phone: '+1 416-555-0142', regions: ['加拿大', '美国', '英国', '阿联酋', '日本', '澳大利亚'] },
  { id: 'u_cai', name: '阿财', role: 'finance', title: '财务（只读）', color: '#8f7ab0', phone: '+1 416-555-0151' },
  { id: 'u_wang', name: '老王', role: 'driver', title: '司机（多伦多站）', color: '#a2675b', phone: '+1 416-555-0161', station: 'YYZ' },
  { id: 'u_li', name: '老李', role: 'driver', title: '司机（温哥华站）', color: '#b48a5a', phone: '+1 604-555-0162', station: 'YVR' },
];

export const userById = (id: string) => users.find((u) => u.id === id);
export const userName = (id: string) => (id === '系统' ? '系统' : userById(id)?.name ?? '—');
export const usersByRole = (role: User['role']) => users.filter((u) => u.role === role);
export const adminIds = () => usersByRole('admin').map((u) => u.id);
