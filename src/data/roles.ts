import type { PermissionMatrix, RoleDef, RoleKey, SectionKey, PageKey } from '@/types';

export const SECTION_META: { key: SectionKey; label: string; index: string; owner: 'ops_docs' | 'ops_logistics' | 'booking' | 'admin' }[] = [
  { key: 'pet', label: '宠物信息 + 寄养', index: '①', owner: 'ops_docs' },
  { key: 'owner', label: '主人信息', index: '②', owner: 'ops_docs' },
  { key: 'route', label: '路线', index: '③', owner: 'admin' },
  { key: 'docs', label: '疫苗 / 文件 Timeline', index: '④', owner: 'ops_docs' },
  { key: 'flight', label: '航班与订舱', index: '⑤', owner: 'booking' },
  { key: 'driver', label: '司机与提货', index: '⑥', owner: 'ops_logistics' },
  { key: 'foster', label: '寄养日常', index: '⑦', owner: 'ops_logistics' },
  { key: 'log', label: '内部备注 / 销售交接 / 操作日志', index: '⑧', owner: 'admin' },
  { key: 'payment', label: '收款情况', index: '⑨', owner: 'admin' },
];

export const PAGE_META: { key: PageKey; label: string; path: string }[] = [
  { key: 'dashboard', label: '今日总控', path: '/dashboard' },
  { key: 'todo', label: '我的待办', path: '/todo' },
  { key: 'cases', label: 'Case 列表', path: '/cases' },
  { key: 'calendar', label: '日历', path: '/calendar' },
  { key: 'routes', label: '航线速查', path: '/routes' },
  { key: 'archive', label: '归档', path: '/archive' },
  { key: 'permissions', label: '账号与权限', path: '/permissions' },
];

export const roles: Record<RoleKey, RoleDef> = {
  admin: {
    key: 'admin', label: '管理员 / 运营主管', description: '全部 Case、全部模块、账号权限页',
    pages: ['dashboard', 'todo', 'cases', 'calendar', 'routes', 'archive', 'permissions'],
    homePage: 'dashboard', scope: 'all', mobile: false,
  },
  ops_docs: {
    key: 'ops_docs', label: '操作员 — 前期文件', description: '负责的 Case；只展开 疫苗/文件/主人信息 分区',
    pages: ['dashboard', 'todo', 'cases', 'calendar', 'routes', 'archive'],
    homePage: 'dashboard', scope: 'assigned', mobile: false,
  },
  ops_logistics: {
    key: 'ops_logistics', label: '操作员 — 接送与寄养', description: '负责的 Case；只展开 司机/寄养/接宠日志 分区',
    pages: ['dashboard', 'todo', 'cases', 'calendar', 'routes', 'archive'],
    homePage: 'dashboard', scope: 'assigned', mobile: false,
  },
  booking: {
    key: 'booking', label: '订舱', description: '只看到被指派的订舱任务；Case 只展开 航班与订舱',
    pages: ['todo', 'routes', 'calendar'],
    homePage: 'todo', scope: 'booking', mobile: false,
  },
  driver: {
    key: 'driver', label: '司机', description: '只看到自己的司机任务，手机端布局',
    pages: ['todo'],
    homePage: 'todo', scope: 'driver', mobile: true,
  },
};

const V = { view: true, edit: false };
const E = { view: true, edit: true };
const N = { view: false, edit: false };

export const defaultPermissions: PermissionMatrix = {
  admin: { pet: E, owner: E, route: E, docs: E, flight: E, driver: E, foster: E, log: E, payment: E },
  ops_docs: { pet: V, owner: E, route: V, docs: E, flight: N, driver: N, foster: N, log: V, payment: N },
  ops_logistics: { pet: E, owner: N, route: V, docs: N, flight: N, driver: E, foster: E, log: E, payment: V },
  booking: { pet: N, owner: N, route: V, docs: N, flight: E, driver: N, foster: N, log: V, payment: N },
  driver: { pet: N, owner: N, route: N, docs: N, flight: N, driver: V, foster: N, log: N, payment: N },
};
