import type { Task } from '@/types';

/** 任务日期分布在"今天"（2026-09-16）前后 3 周；几条正好落在 48h / 24h / 当天窗口 */
const t = (
  id: string, case_id: string, type: Task['type'], assignee_id: string, date: string, time: [string, string],
  pickup_addr: string, dest_addr: string, notes = '', status: Task['status'] = '待开始',
  reminded: Task['reminded'] = [], flags: Partial<Pick<Task, 'owner_confirmed' | 'driver_confirmed' | 'created_by'>> = {},
): Task => ({
  id, case_id, type, assignee_id, date, time_start: time[0], time_end: time[1], pickup_addr, dest_addr, notes, status,
  owner_confirmed: flags.owner_confirmed ?? true, driver_confirmed: flags.driver_confirmed ?? true, created_by: flags.created_by ?? 'u_zhang', reminded,
});

const YYZ_FOSTER = 'JMAXPET 多伦多寄养点 · 135 Bay St';
const YVR_FOSTER = 'JMAXPET 温哥华寄养点 · 149 Robson St';
const YYZ_CARGO = 'YYZ 货站 · 2580 Britannia Rd E';
const YVR_CARGO = 'YVR 货站 · 5000 Miller Rd';
const YYZ_VET = 'Downtown Vet Clinic · 88 Queen St W';
const YVR_VET = 'West End Animal Hospital · 1211 Davie St';
const CFIA_YYZ = 'CFIA Toronto · 1124 Finch Ave W';
const CFIA_YVR = 'CFIA Burnaby · 4321 Still Creek Dr';

export const seedTasks: Task[] = [
  // ---- 已完成（过去） ----
  t('t27', 'c01', '接宠', 'u_wang', '2026-09-10', ['10:00', '11:00'], '107 Bay St, Toronto, ON', YYZ_FOSTER, '带狗粮 2kg 与疫苗本原件', '已完成'),
  t('t25', 'c02', '接宠', 'u_li', '2026-09-12', ['09:00', '10:00'], '114 Robson St, Vancouver, BC', YVR_FOSTER, '', '已完成'),
  t('t28', 'c03', '送医院', 'u_wang', '2026-09-11', ['13:00', '14:30'], YYZ_FOSTER, YYZ_VET, '办健康证', '已完成'),
  t('t26', 'c22', '接宠', 'u_wang', '2026-09-15', ['15:00', '16:00'], '254 Bay St, Toronto, ON', YYZ_FOSTER, '猫咪紧张，带猫薄荷', '已完成'),
  // ---- 今天（当天窗口）----
  t('t02', 'c23', '送机', 'u_wang', '2026-09-16', ['07:30', '09:30'], YYZ_FOSTER, YYZ_CARGO, 'AC27 12:15 起飞，cut-off 09:15', '已完成', ['48h', '24h', 'today']),
  t('t01', 'c05', '接宠', 'u_wang', '2026-09-16', ['10:00', '11:00'], '135 Bay St, Toronto, ON', YYZ_FOSTER, '入寄养，明天送医院办健康证', '待开始', ['48h', '24h', 'today']),
  // ---- 明天（24h 窗口）----
  t('t03', 'c22', '送 CFIA', 'u_wang', '2026-09-17', ['09:00', '10:30'], YYZ_FOSTER, CFIA_YYZ, '带健康证原件 + 疫苗本', '待开始', ['48h', '24h']),
  t('t04', 'c05', '送医院', 'u_wang', '2026-09-17', ['14:00', '15:30'], YYZ_FOSTER, YYZ_VET, '办 IHC 健康证', '待开始', ['48h', '24h']),
  t('t05', 'c02', '送机', 'u_li', '2026-09-17', ['08:00', '10:00'], YVR_FOSTER, YVR_CARGO, 'AC25 12:35 起飞，cut-off 09:30', '待开始', ['48h', '24h']),
  t('t06', 'c01', '送机', 'u_wang', '2026-09-17', ['20:30', '23:00'], YYZ_FOSTER, YYZ_CARGO, 'CX829 次日 01:45 起飞，cut-off 前一晚 22:45', '待开始', ['48h', '24h']),
  t('t13', 'c06', '办文件', 'u_lin', '2026-09-17', ['09:00', '12:00'], '', '', '调档 + 北京口岸许可申请', '待开始', ['48h', '24h']),
  // ---- 后天（48h 窗口）----
  t('t07', 'c11', '采血', 'u_wang', '2026-09-18', ['09:30', '11:00'], '177 Bay St, Toronto, ON', YYZ_VET, 'FAVN 采血，空腹', '待开始', ['48h']),
  t('t08', 'c21', '接宠', 'u_li', '2026-09-18', ['13:00', '14:00'], '247 Robson St, Vancouver, BC', YVR_FOSTER, '大型犬 27kg，带 #500 箱', '待开始', ['48h']),
  t('t12', 'c04', '办文件', 'u_zhou', '2026-09-18', ['09:00', '12:00'], '', '', 'USDA VEHCS 提交背书', '待开始', ['48h']),
  // ---- 本周之后 ----
  t('t09', 'c07', '送医院', 'u_li', '2026-09-19', ['10:00', '11:30'], '149 Robson St, Vancouver, BC', YVR_VET, '办健康证', '待开始', [], { owner_confirmed: false }),
  t('t23', 'c05', '送 CFIA', 'u_wang', '2026-09-19', ['09:00', '10:30'], YYZ_FOSTER, CFIA_YYZ, '', '待开始'),
  t('t11', 'c03', '送机', 'u_wang', '2026-09-20', ['12:30', '15:00'], YYZ_FOSTER, YYZ_CARGO, 'LH471 17:25 起飞，cut-off 14:30', '待开始'),
  t('t22', 'c09', '办文件', 'u_zhou', '2026-09-20', ['09:00', '12:00'], '', '', '许可申请（等主人疫苗本）', '待开始'),
  t('t10', 'c21', '送 CFIA', 'u_li', '2026-09-22', ['09:00', '10:30'], YVR_FOSTER, CFIA_YVR, '', '待开始'),
  t('t14', 'c22', '送机', 'u_wang', '2026-09-23', ['20:30', '23:00'], YYZ_FOSTER, YYZ_CARGO, 'CX829 次日 01:45 起飞', '待开始'),
  t('t18', 'c12', '送医院', 'u_wang', '2026-09-23', ['10:00', '11:00'], '184 Bay St, Toronto, ON', YYZ_VET, '芯片复查 + 补狂犬', '待开始', [], { owner_confirmed: false, driver_confirmed: false }),
  t('t24', 'c16', '送医院', 'u_li', '2026-09-24', ['14:00', '15:00'], '212 Robson St, Vancouver, BC', YVR_VET, '', '待开始', [], { driver_confirmed: false }),
  t('t19', 'c15', '办文件', 'u_zhou', '2026-09-25', ['09:00', '12:00'], '', '', '确认 CX 随行政策，回复主人', '待开始'),
  t('t15', 'c21', '送机', 'u_li', '2026-09-26', ['08:00', '10:00'], YVR_FOSTER, YVR_CARGO, 'AC25 12:35 起飞', '待开始'),
  t('t17', 'c13', '办文件', 'u_lin', '2026-09-27', ['09:00', '12:00'], '', '', '上海官方医院健康证', '待开始'),
  t('t16', 'c08', '接宠', 'u_wang', '2026-09-28', ['10:00', '11:00'], '156 Bay St, Toronto, ON', YYZ_FOSTER, '大型犬，带 #500 箱', '待开始', [], { owner_confirmed: false, driver_confirmed: false }),
  t('t20', 'c19', '送医院', 'u_wang', '2026-09-30', ['10:00', '11:00'], '233 Bay St, Toronto, ON', YYZ_VET, '狂犬第二针', '待开始', [], { driver_confirmed: false }),
  t('t21', 'c18', '送医院', 'u_wang', '2026-10-01', ['14:00', '15:00'], '226 Bay St, Toronto, ON', YYZ_VET, '芯片确认', '待开始', [], { owner_confirmed: false, driver_confirmed: false }),
];
