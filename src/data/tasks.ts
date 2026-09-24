import type { Task } from '@/types';

/** 任务日期分布在"今天"（2026-09-16）前后 3 周；几条正好落在 48h / 24h / 当天窗口 */
const t = (
  id: string, case_id: string, type: Task['type'], assignee_id: string, date: string, time: [string, string],
  pickup: [string, string], dest: [string, string], notes = '', status: Task['status'] = '已确认',
  reminded: Task['reminded'] = [], extra: Partial<Task> = {},
): Task => ({
  id, case_id, type, assignee_id, date, time_start: time[0], time_end: time[1],
  pickup_addr: pickup[0], pickup_phone: pickup[1], dest_addr: dest[0], dest_phone: dest[1], notes, status,
  decline_reason: '', exception_reason: '', exception_note: '', created_by: 'u_lin', reminded, change_note: '', change_acked: true, ...extra,
});

const YYZ_FOSTER: [string, string] = ['JMAXPET 多伦多寄养点 · 135 Bay St', '+1 416-555-0100'];
const YVR_FOSTER: [string, string] = ['JMAXPET 温哥华寄养点 · 149 Robson St', '+1 604-555-0100'];
const YYZ_CARGO: [string, string] = ['YYZ 货站 · 2580 Britannia Rd E', '+1 905-555-0199'];
const YVR_CARGO: [string, string] = ['YVR 货站 · 5000 Miller Rd', '+1 604-555-0199'];
const YYZ_VET: [string, string] = ['Downtown Vet Clinic · 88 Queen St W', '+1 416-555-0188'];
const YVR_VET: [string, string] = ['West End Animal Hospital · 1211 Davie St', '+1 604-555-0188'];
const CFIA_YYZ: [string, string] = ['CFIA Toronto · 1124 Finch Ave W', '+1 416-555-0177'];
const CFIA_YVR: [string, string] = ['CFIA Burnaby · 4321 Still Creek Dr', '+1 604-555-0177'];
const NONE: [string, string] = ['', ''];
const home = (n: number, station: 'YYZ' | 'YVR'): [string, string] => [station === 'YYZ' ? `${100 + n * 7} Bay St, Toronto, ON` : `${100 + n * 7} Robson St, Vancouver, BC`, `+1 ${station === 'YYZ' ? '416' : '604'}-555-01${String(n).padStart(2, '0')}`];

export const seedTasks: Task[] = [
  // ---- 已完成（过去） ----
  t('t27', 'c01', '接回寄养', 'u_wang', '2026-09-10', ['10:00', '11:00'], home(1, 'YYZ'), YYZ_FOSTER, '带狗粮 2kg 与疫苗本原件', '已完成'),
  t('t25', 'c02', '接回寄养', 'u_li', '2026-09-12', ['09:00', '10:00'], home(2, 'YVR'), YVR_FOSTER, '', '已完成'),
  t('t28', 'c03', '接去医院送寄养', 'u_wang', '2026-09-11', ['13:00', '14:30'], YYZ_FOSTER, YYZ_VET, '办健康证', '已完成'),
  t('t26', 'c22', '接回寄养', 'u_wang', '2026-09-15', ['15:00', '16:00'], home(22, 'YYZ'), YYZ_FOSTER, '猫咪紧张，带猫薄荷', '已完成', [], { exception_reason: '堵车 / 预计迟到', exception_note: 'DVP 堵车，迟到 25 分钟，已电话通知主人' }),
  // ---- 今天（当天窗口）----
  t('t02', 'c23', '送机', 'u_wang', '2026-09-16', ['07:30', '09:30'], YYZ_FOSTER, YYZ_CARGO, 'AC27 12:15 起飞，cut-off 09:15', '已完成', ['48h', '24h', 'today']),
  t('t01', 'c05', '接回寄养', 'u_wang', '2026-09-16', ['10:00', '11:00'], home(5, 'YYZ'), YYZ_FOSTER, '入寄养，明天送医院办健康证', '已确认', ['48h', '24h', 'today']),
  t('t29', 'c03', 'CFIA 盖章', 'u_wang', '2026-09-16', ['10:30', '11:30'], YYZ_FOSTER, CFIA_YYZ, '带健康证原件；盖完章直接回寄养点', '已确认', ['48h', '24h', 'today']),
  // ---- 明天（24h 窗口）----
  t('t03', 'c22', 'CFIA 盖章', 'u_wang', '2026-09-17', ['09:00', '10:30'], YYZ_FOSTER, CFIA_YYZ, '带健康证原件 + 疫苗本', '已确认', ['48h', '24h']),
  t('t04', 'c05', '接去医院送寄养', 'u_wang', '2026-09-17', ['15:00', '16:30'], YYZ_FOSTER, YYZ_VET, '办健康证（原 14:00，医院改到 15:00）', '已确认', ['48h', '24h'], { change_note: '09/16 小林：医院改约，时间 14:00 → 15:00', change_acked: false }),
  t('t05', 'c02', '送机', 'u_li', '2026-09-17', ['08:00', '10:00'], YVR_FOSTER, YVR_CARGO, 'AC25 12:35 起飞，cut-off 09:30', '已确认', ['48h', '24h']),
  t('t06', 'c01', '送机', 'u_wang', '2026-09-17', ['20:30', '23:00'], YYZ_FOSTER, YYZ_CARGO, 'CX829 次日 01:45 起飞，cut-off 前一晚 22:45', '已确认', ['48h', '24h']),
  t('t13', 'c06', '办文件', 'u_lin', '2026-09-17', ['09:00', '12:00'], NONE, NONE, '北京口岸许可申请材料', '已确认', ['48h', '24h']),
  // ---- 后天（48h 窗口）----
  t('t07', 'c11', '接去医院送回', 'u_wang', '2026-09-18', ['09:30', '11:00'], home(11, 'YYZ'), YYZ_VET, '联合疫苗 FVRCP，打完送回家', '待确认', ['48h']),
  t('t08', 'c21', '接回寄养', 'u_li', '2026-09-18', ['13:00', '14:00'], home(21, 'YVR'), YVR_FOSTER, '大型犬 27kg，带 #500 箱', '已确认', ['48h']),
  t('t12', 'c04', '办文件', 'u_zhou', '2026-09-18', ['09:00', '12:00'], NONE, NONE, 'USDA VEHCS 提交背书', '已确认', ['48h']),
  t('t30', 'c07', '约医院', 'u_lin', '2026-09-18', ['09:00', ''], NONE, NONE, '温哥华 West End 约 09/19 办健康证', '已确认', ['48h']),
  // ---- 本周之后 ----
  t('t09', 'c07', '接去医院送回', 'u_li', '2026-09-19', ['10:00', '11:30'], home(7, 'YVR'), YVR_VET, '办健康证，办完送回主人家', '待确认'),
  t('t23', 'c05', 'CFIA 盖章', 'u_wang', '2026-09-19', ['09:00', '10:30'], YYZ_FOSTER, CFIA_YYZ, ''),
  t('t11', 'c03', '送机', 'u_wang', '2026-09-20', ['12:30', '15:00'], YYZ_FOSTER, YYZ_CARGO, 'LH471 17:25 起飞，cut-off 14:30'),
  t('t22', 'c09', '等待', 'u_zhou', '2026-09-20', ['09:00', ''], NONE, NONE, '等主人发疫苗本扫描件'),
  t('t10', 'c21', 'CFIA 盖章', 'u_li', '2026-09-22', ['09:00', '10:30'], YVR_FOSTER, CFIA_YVR, ''),
  t('t14', 'c22', '送机', 'u_wang', '2026-09-23', ['20:30', '23:00'], YYZ_FOSTER, YYZ_CARGO, 'CX829 次日 01:45 起飞'),
  t('t18', 'c12', '接去医院送回', 'u_wang', '2026-09-23', ['10:00', '11:00'], home(12, 'YYZ'), YYZ_VET, '芯片复查 + 补狂犬', '待确认'),
  t('t24', 'c16', '接去医院送回', 'u_li', '2026-09-24', ['14:00', '15:00'], home(16, 'YVR'), YVR_VET, '', '待确认'),
  t('t19', 'c15', '办文件', 'u_zhou', '2026-09-25', ['09:00', '12:00'], NONE, NONE, '确认 CX 随行政策，回复主人'),
  t('t15', 'c21', '送机', 'u_li', '2026-09-26', ['08:00', '10:00'], YVR_FOSTER, YVR_CARGO, 'AC25 12:35 起飞'),
  t('t31', 'c36', '送机', 'u_wang', '2026-09-28', ['20:30', '23:00'], home(36, 'YYZ'), YYZ_CARGO, '仅订舱 + 送机；CX829 次日 01:45', '待确认'),
  t('t17', 'c13', '办文件', 'u_lin', '2026-09-27', ['09:00', '12:00'], NONE, NONE, '上海官方医院出入境检疫证'),
  t('t16', 'c08', '接回寄养', 'u_wang', '2026-09-28', ['10:00', '11:00'], home(8, 'YYZ'), YYZ_FOSTER, '大型犬，带 #500 箱', '待确认'),
  t('t20', 'c19', '接去医院送回', 'u_wang', '2026-09-30', ['10:00', '11:00'], home(19, 'YYZ'), YYZ_VET, '狂犬第二针', '待确认'),
  t('t21', 'c18', '接去医院送回', 'u_wang', '2026-10-01', ['14:00', '15:00'], home(18, 'YYZ'), YYZ_VET, '芯片确认 + 第二针狂犬', '待确认'),
];
