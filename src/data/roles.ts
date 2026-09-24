import type { PermissionMatrix, RoleDef, RoleKey, SectionKey, PageKey } from '@/types';

export const SECTION_META: { key: SectionKey; label: string; index: string; owner: 'ops_docs' | 'booking' | 'ops_post' | 'admin' }[] = [
  { key: 'pet', label: '宠物信息 + 寄养时间', index: '①', owner: 'ops_docs' },
  { key: 'owner', label: '主人信息', index: '②', owner: 'ops_docs' },
  { key: 'route', label: '路线', index: '③', owner: 'ops_docs' },
  { key: 'docs', label: '疫苗 / 文件 Timeline', index: '④', owner: 'ops_docs' },
  { key: 'flight', label: '航班与订舱', index: '⑤', owner: 'booking' },
  { key: 'driver', label: '司机安排', index: '⑥', owner: 'ops_docs' },
  { key: 'foster', label: '寄养日常', index: '⑦', owner: 'ops_docs' },
  { key: 'log', label: '销售交接 / 内部备注 / 操作日志', index: '⑧', owner: 'admin' },
  { key: 'payment', label: '收款情况', index: '⑨', owner: 'ops_post' },
];

export const PAGE_META: { key: PageKey; label: string; path: string; mobileLabel?: string }[] = [
  { key: 'dashboard', label: '今日总控', path: '/dashboard' },
  { key: 'todo', label: '我的待办', path: '/todo', mobileLabel: '今日任务' },
  { key: 'cases', label: '托运 Case 列表', path: '/cases' },
  { key: 'accompany', label: '随机 Case 列表', path: '/accompany' },
  { key: 'calendar', label: '日历', path: '/calendar' },
  { key: 'alerts', label: '紧急变动', path: '/alerts' },
  { key: 'routes', label: '航线速查', path: '/routes' },
  { key: 'archive', label: '归档', path: '/archive' },
  { key: 'sales', label: '接单信息表', path: '/sales' },
  { key: 'history', label: '历史任务', path: '/history' },
  { key: 'permissions', label: '账号与权限', path: '/permissions' },
];

export const roles: Record<RoleKey, RoleDef> = {
  admin: {
    key: 'admin', label: '操作部管理员', description: '全部 Case、全部页面、账号权限；紧急事件短信通知对象',
    pages: ['dashboard', 'todo', 'cases', 'accompany', 'calendar', 'alerts', 'routes', 'archive', 'sales', 'permissions'],
    homePage: 'dashboard', scope: 'all', mobile: false,
  },
  sales: {
    key: 'sales', label: '销售', description: '只有接单信息表：新单录入 + 自己的历史接单',
    pages: ['sales'],
    homePage: 'sales', scope: 'none', mobile: false,
  },
  ops_docs: {
    key: 'ops_docs', label: '操作员 — 前期文件', description: '只看自己负责的 Case；录单、文件 Timeline、司机安排',
    pages: ['dashboard', 'todo', 'cases', 'accompany', 'calendar', 'alerts', 'routes', 'archive', 'sales'],
    homePage: 'dashboard', scope: 'assigned_docs', mobile: false,
  },
  booking_cargo: {
    key: 'booking_cargo', label: '托运订舱', description: '只看转给自己的托运 Case；只编辑 航班与订舱',
    pages: ['dashboard', 'todo', 'calendar', 'alerts', 'archive', 'routes'],
    homePage: 'todo', scope: 'booking_cargo', mobile: false,
  },
  booking_accompany: {
    key: 'booking_accompany', label: '随机订舱', description: '只看随机 Case；找随机人、加宠物位置',
    pages: ['todo', 'calendar', 'alerts'],
    homePage: 'todo', scope: 'booking_accompany', mobile: false,
  },
  ops_post: {
    key: 'ops_post', label: '操作员 — 后段操作', description: '按入境地区划分，只看该地区的 Case；清关、收尾款、到家',
    pages: ['dashboard', 'todo', 'cases', 'accompany', 'calendar', 'alerts', 'archive'],
    homePage: 'dashboard', scope: 'post_regions', mobile: false,
  },
  finance: {
    key: 'finance', label: '财务（只读）', description: '看全部 Case 的收款状态与额外费用；一期不记账',
    pages: ['todo', 'cases', 'accompany', 'calendar', 'alerts', 'archive', 'sales'],
    homePage: 'todo', scope: 'all', mobile: false, readOnly: true,
  },
  driver: {
    key: 'driver', label: '司机', description: '只看自己的任务；手机端',
    pages: ['todo', 'alerts', 'calendar', 'history'],
    homePage: 'todo', scope: 'driver', mobile: true,
  },
};

export const ROLE_ORDER: RoleKey[] = ['admin', 'sales', 'ops_docs', 'booking_cargo', 'booking_accompany', 'ops_post', 'finance', 'driver'];

const V = { view: true, edit: false };
const E = { view: true, edit: true };
const N = { view: false, edit: false };

export const defaultPermissions: PermissionMatrix = {
  admin: { pet: E, owner: E, route: E, docs: E, flight: E, driver: E, foster: E, log: E, payment: E },
  sales: { pet: N, owner: N, route: N, docs: N, flight: N, driver: N, foster: N, log: N, payment: N },
  ops_docs: { pet: E, owner: E, route: E, docs: E, flight: V, driver: E, foster: E, log: E, payment: E },
  booking_cargo: { pet: V, owner: V, route: V, docs: V, flight: E, driver: N, foster: N, log: E, payment: N },
  booking_accompany: { pet: V, owner: V, route: V, docs: V, flight: E, driver: N, foster: N, log: E, payment: N },
  ops_post: { pet: V, owner: V, route: V, docs: V, flight: V, driver: V, foster: V, log: E, payment: E },
  finance: { pet: V, owner: V, route: V, docs: V, flight: V, driver: V, foster: V, log: V, payment: V },
  driver: { pet: N, owner: N, route: N, docs: N, flight: N, driver: V, foster: N, log: N, payment: N },
};
