import type {
  AirlineConfirmed, Case, DriverNeeded, Flight, NextStep, Priority, RiskTag, Stage, Waiting, CaseStep,
} from '@/types';
import { workflowById } from '@/data/workflows';
import { routeById } from '@/data/routes';
import { AIRPORT_CITY } from '@/data/options';
import { buildTimeline } from '@/lib/workflow';
import { SEED_TODAY, addDays } from '@/lib/dates';

/**
 * 所有宠物 / 主人数据均为编造。护照号、电话使用明显假的格式。
 */

type PayPlan = 'full' | 'deposit' | 'deposit_part' | 'none';

interface Spec {
  id: string; file_no: string; template_id: string; n: number;
  pet: string; species: 'dog' | 'cat'; breed: string; gender: '公' | '母'; weight: number; color: string; birth: string;
  owner: string;
  origin: string; dest: string; departure: string;
  step: string; stage: Stage; next_step: NextStep; priority: Priority; deadline: string; waiting?: Waiting; risk?: RiskTag[];
  airline: AirlineConfirmed; route_id?: string; awb?: string;
  foster?: [string, string]; foster_notes?: string; med_count?: number;
  pay: PayPlan;
  docs: string; logistics: string; booking: string; driver_needed: DriverNeeded;
  handover?: string; pickup_log?: string; foster_log?: string; arrival_log?: string; notes?: string;
  crate?: string; archived?: boolean; health_cert_issued?: string; created?: string;
}

const AREA: Record<string, { area: string; street: string; city: string }> = {
  YYZ: { area: '416', street: 'Bay St', city: 'Toronto, ON' },
  YVR: { area: '604', street: 'Robson St', city: 'Vancouver, BC' },
  JFK: { area: '212', street: 'W 34th St', city: 'New York, NY' },
  LAX: { area: '310', street: 'Wilshire Blvd', city: 'Los Angeles, CA' },
  MEL: { area: '61 3', street: 'Collins St', city: 'Melbourne, VIC' },
};
const CN_ADDR: Record<string, string> = {
  HKG: '香港九龙塘窝打老道',
  PVG: '上海市浦东新区张江路',
  PEK: '北京市朝阳区望京西路',
  CAN: '广州市天河区珠江新城华夏路',
};
const DEST_COUNTRY: Record<string, string> = { HKG: '中国', PVG: '中国', PEK: '中国', CAN: '中国', YYZ: '加拿大', YVR: '加拿大', MEL: '澳大利亚' };
const DEST_REGION: Record<string, string> = { HKG: '香港', PVG: '上海', PEK: '北京', CAN: '广州', YYZ: '多伦多', YVR: '温哥华', MEL: '墨尔本' };

function flightsFor(s: Spec): Flight[] {
  if (!s.route_id) return [];
  const r = routeById(s.route_id);
  if (!r) return [];
  const confirmed = ['已确认', '已改期', '已起飞', '已到达', '不需要'].includes(s.airline);
  const awb = s.awb ?? '';
  const dep = `${s.departure}T${r.dep_time}:00`;
  if (r.type === '直飞') {
    return [{ id: `${s.id}_f1`, airline: r.airline, flight_no: r.flight_no, from_code: r.origin, to_code: r.dest, dep_time: dep, arr_time: `${addDays(s.departure, r.arr_day_offset)}T${r.arr_time}:00`, awb, confirmed }];
  }
  const via = r.via ?? 'FRA';
  const leg1Arr = via === 'NRT' ? `${addDays(s.departure, 1)}T15:40:00` : via === 'HKG' ? `${s.departure}T13:20:00` : `${addDays(s.departure, 1)}T07:05:00`;
  const leg2Dep = via === 'NRT' ? `${addDays(s.departure, 1)}T18:20:00` : via === 'HKG' ? `${s.departure}T20:30:00` : `${addDays(s.departure, 1)}T13:50:00`;
  return [
    { id: `${s.id}_f1`, airline: r.airline, flight_no: r.flight_no, from_code: r.origin, to_code: via, dep_time: dep, arr_time: leg1Arr, awb, confirmed },
    { id: `${s.id}_f2`, airline: r.airline, flight_no: r.second_leg ?? '', from_code: via, to_code: r.dest, dep_time: leg2Dep, arr_time: `${addDays(s.departure, r.arr_day_offset)}T${r.arr_time}:00`, awb, confirmed },
  ];
}

/** 收款情况只记录状态与备注，不做提醒、不管明细（客户另有 invoice / 记账软件） */
function paymentsFor(s: Spec): Pick<Case, 'payment_status' | 'final_payment_status' | 'payment_notes'> {
  switch (s.pay) {
    case 'full':
      return { payment_status: '已收齐', final_payment_status: '全部尾款已收齐', payment_notes: '全款已收，invoice 已开' };
    case 'deposit':
      return { payment_status: '已收齐', final_payment_status: '未收齐', payment_notes: '定金已收；尾款到家后收' };
    case 'deposit_part':
      return { payment_status: '已收齐', final_payment_status: '已收齐一部分', payment_notes: '定金 + 尾款一期已收；尾款二期到家后收' };
    default:
      return { payment_status: '必填费用未收', final_payment_status: '未收齐', payment_notes: '定金未付，先不排资源' };
  }
}

function mkCase(s: Spec): Case {
  const tpl = workflowById(s.template_id)!;
  let timeline: CaseStep[] = buildTimeline(tpl, s.departure, s.step, SEED_TODAY);
  if (s.archived) timeline = timeline.map((st) => ({ ...st, status: '完成', missing_docs: [] }));
  const idx = tpl.steps.findIndex((x) => x.key === s.step);
  const done = (key: string) => { const i = tpl.steps.findIndex((x) => x.key === key); return i >= 0 && (s.archived || i < idx); };
  const planned = (key: string) => timeline.find((t) => t.key === key)?.planned_date ?? '';
  const outbound = !['PVG', 'HKG'].includes(s.origin);
  const meta = AREA[outbound ? s.origin : s.dest] ?? AREA.YYZ;
  const cnCity = CN_ADDR[outbound ? s.dest : s.origin] ?? CN_ADDR.PVG;
  const nn = String(s.n).padStart(2, '0');
  const healthKey = tpl.steps.some((x) => x.key === 'hospital') ? 'hospital' : 'health_cert';
  const stampKey = tpl.steps.find((x) => ['cfia', 'usda', 'cn_quarantine'].includes(x.key))?.key ?? 'cfia';
  const filesStatus: Case['files_status'] = s.archived ? '已发' : done(stampKey) ? '已盖章' : done(healthKey) ? '已完成' : done('permit') || done('booking') ? '处理中' : done('rabies') ? '部分' : '无';
  const rabiesDate = done('rabies') ? planned('rabies') : '';
  const rabies2 = s.species === 'dog' && done('wait21') ? addDays(planned('rabies'), 21) : '';
  const healthIssued = s.health_cert_issued ?? (done(healthKey) ? planned(healthKey) : '');
  const pay = paymentsFor(s);
  return {
    id: s.id,
    file_no: s.file_no,
    template_id: s.template_id,
    archived: !!s.archived,
    created_at: s.created ?? addDays(s.departure, -95),
    pet_name: s.pet,
    species: s.species,
    breed: s.breed,
    birth_date: s.birth,
    gender: s.gender,
    weight: s.weight,
    color: s.color,
    chip_no: `9000${String(11000000000 + s.n * 7919).slice(0, 11)}`,
    crate_no: s.crate ?? (s.weight > 20 ? 'IATA #500 (102×69×76)' : s.weight > 9 ? 'IATA #400 (91×61×66)' : s.weight > 5 ? 'IATA #300 (81×56×58)' : 'IATA #200 (69×51×48)'),
    foster_start: s.foster?.[0] ?? '',
    foster_end: s.foster?.[1] ?? '',
    foster_med_count: s.med_count ?? 0,
    foster_notes: s.foster_notes ?? (s.foster ? '每日 2 餐，自带粮；出发前一天洗澡' : ''),
    foster_daily: s.foster ? [
      { date: s.foster[0], note: '入住，精神状态良好，食欲正常', by: '小张' },
      { date: addDays(s.foster[0], 1), note: '早晚各遛 20 分钟，排便正常，已发视频给主人', by: '小张' },
    ].filter((d) => d.date <= SEED_TODAY) : [],
    owner_name: s.owner,
    passport_no: `E${String(12345600 + s.n).padStart(8, '0')}`,
    owner_phone_cn: `+86 138-0000-01${nn}`,
    owner_phone_intl: `+1 ${meta.area}-555-01${nn}`,
    owner_addr_cn: `${cnCity} ${s.n * 3} 号`,
    owner_addr_intl: `${100 + s.n * 7} ${meta.street}, ${meta.city}`,
    owner_email: `owner${nn}@example.com`,
    origin: s.origin,
    dest_country: DEST_COUNTRY[s.dest] ?? '中国',
    dest_region: DEST_REGION[s.dest] ?? s.dest,
    route: `${s.origin} → ${s.dest}${s.route_id ? ` · ${routeById(s.route_id)?.flight_no}${routeById(s.route_id)?.type === '中转' ? ` 经 ${routeById(s.route_id)?.via}` : ' 直飞'}` : ''}`,
    departure_date: s.departure,
    stage: s.stage,
    next_step: s.next_step,
    deadline: s.deadline,
    waiting: s.waiting ?? '',
    priority: s.priority,
    status: s.archived ? '已完成' : '进行中',
    risk_tags: s.risk ?? [],
    current_step_key: s.archived ? 'archive' : s.step,
    timeline,
    files_status: filesStatus,
    expected_vaccine_date: planned('rabies'),
    expected_blood_draw_date: planned('favn') || planned('rnatt'),
    expected_health_cert_date: planned(healthKey),
    health_cert_issued: healthIssued,
    vacc_rabies_1: rabiesDate,
    vacc_rabies_2: rabies2,
    vacc_fvrcp: s.species === 'cat' && rabiesDate ? addDays(rabiesDate, -14) : '',
    vacc_favn: done('favn') ? planned('favn') : done('rnatt') ? planned('rnatt') : '',
    vacc_ihc: healthIssued,
    vacc_notes: done('serum') ? 'FAVN 0.8 IU/ml 合格' : done('favn') ? '血清已寄 KSU，等报告' : '',
    airline_confirmed: s.airline,
    flights: flightsFor(s),
    driver_needed: s.driver_needed,
    ...pay,
    sales_handover: s.handover ?? `客人经微信咨询，已确认路线 ${s.origin} → ${s.dest}，报价含代办文件与国内清关。`,
    pickup_log: s.pickup_log ?? '',
    foster_log: s.foster_log ?? '',
    arrival_log: s.arrival_log ?? '',
    notes_extra: s.notes ?? '',
    ops_docs_id: s.docs,
    ops_logistics_id: s.logistics,
    booking_id: s.booking,
  };
}

const specs: Spec[] = [
  // ---------- 即将出发 / 本周 ----------
  { id: 'c01', file_no: 'JM-2026-041', template_id: 'ca_cn_cargo', n: 1, pet: 'Teddy', species: 'dog', breed: '泰迪', gender: '公', weight: 6.2, color: '棕色', birth: '2022-03-14', owner: '陈思远', origin: 'YYZ', dest: 'HKG', departure: '2026-09-18', step: 'driver_airport', stage: '核机中', next_step: '送机', priority: '即将出发', deadline: '2026-09-17', airline: '已确认', route_id: 'r01', awb: '160-12345678', foster: ['2026-09-10', '2026-09-18'], pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', handover: '客人通过小红书咨询，已确认 9/18 CX829，尾款到家后收。', pickup_log: '9/10 老王接宠，状态良好，带狗粮 2kg 及疫苗本原件。', foster_log: '每日 2 餐，早晚各遛 20 分钟。', health_cert_issued: '2026-09-10' },
  { id: 'c02', file_no: 'JM-2026-038', template_id: 'ca_cn_cargo', n: 2, pet: '豆豆', species: 'dog', breed: '柯基', gender: '母', weight: 11.4, color: '三色', birth: '2021-07-02', owner: '王梓涵', origin: 'YVR', dest: 'PVG', departure: '2026-09-17', step: 'driver_airport', stage: '核机中', next_step: '送机', priority: '即将出发', deadline: '2026-09-16', airline: '已确认', route_id: 'r04', awb: '014-77812345', foster: ['2026-09-12', '2026-09-17'], pay: 'full', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', pickup_log: '9/12 老李接宠，主人交代早上不要喂太多。', health_cert_issued: '2026-09-09' },
  { id: 'c03', file_no: 'JM-2026-035', template_id: 'ca_cn_cargo', n: 3, pet: 'Mochi', species: 'cat', breed: '布偶', gender: '公', weight: 4.8, color: '蓝双色', birth: '2023-01-20', owner: '李婉晴', origin: 'YYZ', dest: 'HKG', departure: '2026-09-20', step: 'cfia', stage: '核机中', next_step: '盖章', priority: '紧急', deadline: '2026-09-16', waiting: '文件', risk: ['文件', '时间'], airline: '已确认', route_id: 'r06', awb: '020-55667788', foster: ['2026-09-11', '2026-09-20'], pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', notes: 'CFIA 预约被取消一次，9/16 重新排上，务必今天盖章，否则赶不上 9/20 LH。', health_cert_issued: '2026-09-12' },
  { id: 'c04', file_no: 'JM-2026-044', template_id: 'us_cn_cargo', n: 4, pet: '可乐', species: 'dog', breed: '法斗', gender: '公', weight: 12.8, color: '奶油色', birth: '2022-11-05', owner: '张浩然', origin: 'LAX', dest: 'HKG', departure: '2026-09-22', step: 'usda', stage: '核机中', next_step: '盖章', priority: '即将出发', deadline: '2026-09-18', waiting: '航司', risk: ['健康'], airline: '待确认', route_id: 'r11', pay: 'deposit_part', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要', notes: '短鼻犬，CX 需提交 snub-nose 承诺书；箱体需比标准大一号。主人自送 LAX 货站。', health_cert_issued: '2026-09-13' },
  { id: 'c05', file_no: 'JM-2026-046', template_id: 'ca_cn_cargo', n: 5, pet: 'Luna', species: 'cat', breed: '英短', gender: '母', weight: 3.9, color: '蓝色', birth: '2023-05-30', owner: '刘思琪', origin: 'YYZ', dest: 'PVG', departure: '2026-09-23', step: 'hospital', stage: '核机中', next_step: '办健康证', priority: '今天做', deadline: '2026-09-16', airline: '已确认', route_id: 'r03', awb: '014-33445566', foster: ['2026-09-16', '2026-09-23'], pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', handover: '客人是老客户介绍，今天接宠入寄养，明天送医院办健康证。' },
  { id: 'c06', file_no: 'JM-2026-047', template_id: 'ca_cn_cargo', n: 6, pet: '旺财', species: 'cat', breed: '田园猫', gender: '公', weight: 5.1, color: '橘色', birth: '2020-09-09', owner: '赵文博', origin: 'YYZ', dest: 'PEK', departure: '2026-09-25', step: 'booking', stage: '落实置', next_step: '订舱', priority: '今天做', deadline: '2026-09-16', waiting: '航司', airline: '查询中', route_id: 'r05', pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', notes: 'AC31 9/25 仓位待回复，若无则改 9/27。' },
  { id: 'c07', file_no: 'JM-2026-049', template_id: 'ca_cn_cargo', n: 7, pet: 'Simba', species: 'cat', breed: '美短', gender: '公', weight: 4.4, color: '银虎斑', birth: '2022-08-18', owner: '周雨桐', origin: 'YVR', dest: 'HKG', departure: '2026-09-28', step: 'hospital', stage: '落实置', next_step: '约医院', priority: '明天做', deadline: '2026-09-17', waiting: '医院', airline: '已确认', route_id: 'r02', awb: '160-22334455', pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要' },
  { id: 'c08', file_no: 'JM-2026-050', template_id: 'ca_cn_cargo', n: 8, pet: 'Bella', species: 'dog', breed: '金毛', gender: '母', weight: 28.5, color: '金色', birth: '2021-02-11', owner: '孙嘉怡', origin: 'YYZ', dest: 'PVG', departure: '2026-10-02', step: 'booking', stage: '落实置', next_step: '订舱', priority: '明天做', deadline: '2026-09-17', airline: '未订', route_id: 'r03', foster: ['2026-09-28', '2026-10-02'], pay: 'deposit', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', notes: '28.5kg 大型犬，需 #500 箱；AC 夏季高温限制 9 月底解除后再订。' },
  { id: 'c09', file_no: 'JM-2026-051', template_id: 'us_cn_cargo', n: 9, pet: 'Coco', species: 'dog', breed: '泰迪', gender: '母', weight: 5.5, color: '香槟色', birth: '2023-03-03', owner: '吴俊杰', origin: 'JFK', dest: 'HKG', departure: '2026-10-05', step: 'permit', stage: '等待文件', next_step: '申请许可证', priority: '未来 7 天', deadline: '2026-09-20', waiting: '主人', risk: ['文件'], airline: '未订', route_id: 'r09', pay: 'deposit', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要', notes: '主人还没发疫苗本扫描件，已催两次。' },
  { id: 'c10', file_no: 'JM-2026-052', template_id: 'ca_cn_cargo', n: 10, pet: 'Milo', species: 'dog', breed: '柴犬', gender: '公', weight: 10.2, color: '赤色', birth: '2022-06-25', owner: '郑一诺', origin: 'YVR', dest: 'PVG', departure: '2026-10-08', step: 'serum', stage: '等待文件', next_step: '等血清', priority: '未来 7 天', deadline: '2026-09-22', airline: '未订', route_id: 'r08', pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要' },
  { id: 'c11', file_no: 'JM-2026-053', template_id: 'ca_cn_cargo', n: 11, pet: '糯米', species: 'cat', breed: '布偶', gender: '母', weight: 4.1, color: '海豹双色', birth: '2024-01-15', owner: '黄雅婷', origin: 'YYZ', dest: 'HKG', departure: '2026-10-10', step: 'favn', stage: '办理签证', next_step: '采血', priority: '未来 7 天', deadline: '2026-09-18', airline: '未订', route_id: 'r01', pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要' },
  { id: 'c12', file_no: 'JM-2026-054', template_id: 'ca_cn_cargo', n: 12, pet: 'Oreo', species: 'dog', breed: '西高地', gender: '公', weight: 8.3, color: '白色', birth: '2021-12-01', owner: '何思成', origin: 'YYZ', dest: 'HKG', departure: '2026-10-15', step: 'rabies', stage: '办理签证', next_step: '补狂犬', priority: '未来 14 天', deadline: '2026-09-30', risk: ['芯片'], airline: '未订', route_id: 'r01', pay: 'deposit', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', notes: '芯片扫描读不出，需医院复查；若需重植则狂犬要重打。' },
  { id: 'c13', file_no: 'JM-2026-055', template_id: 'cn_ca_cargo', n: 13, pet: 'Nala', species: 'cat', breed: '美短', gender: '母', weight: 4.0, color: '银渐层', birth: '2022-04-04', owner: '林子涵', origin: 'PVG', dest: 'YYZ', departure: '2026-10-06', step: 'health_cert', stage: '等待文件', next_step: '办健康证', priority: '未来 7 天', deadline: '2026-09-27', airline: '已确认', route_id: 'r16', awb: '014-99001122', pay: 'deposit_part', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要', handover: '上海端合作伙伴负责送机，多伦多落地后老王接机送主人家。' },
  { id: 'c14', file_no: 'JM-2026-056', template_id: 'cn_ca_cargo', n: 14, pet: 'Max', species: 'dog', breed: '金毛', gender: '公', weight: 31.0, color: '金色', birth: '2020-10-10', owner: '杨博文', origin: 'PVG', dest: 'YVR', departure: '2026-10-20', step: 'booking', stage: '办理签证', next_step: '订舱', priority: '未来 30 天', deadline: '2026-09-30', airline: '查询中', route_id: 'r17', pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要', notes: 'AC26 原 10/18 改期至 10/20，已同步主人。' },
  { id: 'c15', file_no: 'JM-2026-057', template_id: 'ca_cn_accompany', n: 15, pet: 'Kiki', species: 'cat', breed: '英短', gender: '母', weight: 3.6, color: '蓝白', birth: '2023-09-01', owner: '徐若曦', origin: 'YYZ', dest: 'HKG', departure: '2026-09-30', step: 'airline_policy', stage: '落实置', next_step: '问客人时间', priority: '未来 7 天', deadline: '2026-09-19', airline: '不需要', route_id: 'r01', pay: 'full', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要', handover: '主人随行同机，我们只代办文件 + 提醒值机。' },
  { id: 'c16', file_no: 'JM-2026-058', template_id: 'ca_cn_accompany', n: 16, pet: 'Lucky', species: 'dog', breed: '柯基', gender: '公', weight: 12.0, color: '黄白', birth: '2022-02-02', owner: '马嘉伟', origin: 'YVR', dest: 'HKG', departure: '2026-10-12', step: 'permit', stage: '等待文件', next_step: '申请许可证', priority: '未来 14 天', deadline: '2026-09-28', airline: '不需要', route_id: 'r14', pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要' },
  { id: 'c17', file_no: 'JM-2026-059', template_id: 'us_cn_cargo', n: 17, pet: 'Ginger', species: 'cat', breed: '美短', gender: '母', weight: 4.6, color: '橘白', birth: '2021-11-11', owner: '朱晓萌', origin: 'LAX', dest: 'CAN', departure: '2026-09-19', step: 'driver_airport', stage: '核机中', next_step: '问客人时间', priority: '即将出发', deadline: '2026-09-18', airline: '已确认', route_id: 'r12', awb: '784-11223344', pay: 'full', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要', notes: '主人自送 LAX 货站，需提醒 9/18 19:00 前到。', health_cert_issued: '2026-09-11' },
  { id: 'c18', file_no: 'JM-2026-060', template_id: 'ca_cn_cargo', n: 18, pet: 'Tofu', species: 'dog', breed: '法斗', gender: '母', weight: 11.5, color: '虎斑', birth: '2023-06-06', owner: '谢雨欣', origin: 'YYZ', dest: 'PVG', departure: '2026-10-25', step: 'chip', stage: '办理签证', next_step: '调档', priority: '未来 30 天', deadline: '2026-10-01', risk: ['芯片'], airline: '查询中', route_id: 'r07', pay: 'deposit', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', notes: '短鼻犬，AC 不接；改查 LH 经 FRA。' },
  { id: 'c19', file_no: 'JM-2026-061', template_id: 'ca_cn_cargo', n: 19, pet: 'Snow', species: 'cat', breed: '布偶', gender: '公', weight: 4.9, color: '蓝重点', birth: '2024-03-08', owner: '曹静怡', origin: 'YYZ', dest: 'PEK', departure: '2026-11-05', step: 'wait21', stage: '办理签证', next_step: '第二针', priority: '未来 30 天', deadline: '2026-10-05', airline: '未订', route_id: 'r05', pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要' },
  { id: 'c20', file_no: 'JM-2026-062', template_id: 'us_cn_cargo', n: 20, pet: 'Pudding', species: 'dog', breed: '泰迪', gender: '公', weight: 4.8, color: '红棕', birth: '2023-10-10', owner: '邓子豪', origin: 'JFK', dest: 'PVG', departure: '2026-11-12', step: 'chip', stage: '新建', next_step: '调档', priority: '待定', deadline: '2026-10-10', airline: '未订', route_id: 'r10', pay: 'none', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '待定', handover: '新客户，定金未付，先不排资源。', created: '2026-09-14' },
  { id: 'c21', file_no: 'JM-2026-063', template_id: 'ca_cn_cargo', n: 21, pet: 'Bobo', species: 'dog', breed: '金毛', gender: '公', weight: 27.0, color: '浅金', birth: '2021-05-05', owner: '宋佳琪', origin: 'YVR', dest: 'PVG', departure: '2026-09-26', step: 'hospital', stage: '核机中', next_step: '办健康证', priority: '未来 7 天', deadline: '2026-09-20', airline: '已确认', route_id: 'r04', awb: '014-55443322', foster: ['2026-09-18', '2026-09-26'], pay: 'deposit_part', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要' },
  { id: 'c22', file_no: 'JM-2026-064', template_id: 'ca_cn_cargo', n: 22, pet: 'Momo', species: 'cat', breed: '田园猫', gender: '母', weight: 3.8, color: '三花', birth: '2022-12-12', owner: '唐雨萱', origin: 'YYZ', dest: 'HKG', departure: '2026-09-24', step: 'cfia', stage: '核机中', next_step: '盖章', priority: '明天做', deadline: '2026-09-17', airline: '已确认', route_id: 'r01', awb: '160-66778899', foster: ['2026-09-15', '2026-09-24'], pay: 'deposit_part', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', pickup_log: '9/15 老王接宠，猫咪有点紧张，已放猫薄荷。', health_cert_issued: '2026-09-15' },
  { id: 'c23', file_no: 'JM-2026-065', template_id: 'ca_cn_cargo', n: 23, pet: 'Hazel', species: 'cat', breed: '英短', gender: '公', weight: 4.3, color: '银点', birth: '2022-07-07', owner: '高天宇', origin: 'YYZ', dest: 'PVG', departure: '2026-09-16', step: 'flight_track', stage: '出发', next_step: '跟航班', priority: '即将出发', deadline: '2026-09-16', airline: '已起飞', route_id: 'r03', awb: '014-11223344', foster: ['2026-09-09', '2026-09-16'], pay: 'full', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', pickup_log: '9/16 07:30 老王送机，08:40 交货 AC Cargo。', health_cert_issued: '2026-09-07' },
  { id: 'c24', file_no: 'JM-2026-066', template_id: 'ca_cn_cargo', n: 24, pet: 'Biscuit', species: 'dog', breed: '柯基', gender: '公', weight: 10.8, color: '三色', birth: '2022-09-09', owner: '罗欣怡', origin: 'YVR', dest: 'HKG', departure: '2026-09-14', step: 'customs', stage: '到达', next_step: '清关', priority: '今天做', deadline: '2026-09-16', airline: '已到达', route_id: 'r02', awb: '160-88990011', foster: ['2026-09-08', '2026-09-14'], pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', arrival_log: '9/15 06:10 落地 HKG，代理已提货，等海关放行。', health_cert_issued: '2026-09-05' },
  { id: 'c25', file_no: 'JM-2026-067', template_id: 'ca_cn_cargo', n: 25, pet: 'Peanut', species: 'dog', breed: '柴犬', gender: '公', weight: 9.7, color: '黑色', birth: '2021-08-08', owner: '蒋伟豪', origin: 'YYZ', dest: 'HKG', departure: '2026-09-12', step: 'final_payment', stage: '到达', next_step: '收尾款', priority: '紧急', deadline: '2026-09-15', waiting: '尾款', airline: '已到达', route_id: 'r01', awb: '160-12312312', foster: ['2026-09-05', '2026-09-12'], pay: 'deposit', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', arrival_log: '9/13 到家，主人已收到；尾款催了两次未回复。', health_cert_issued: '2026-09-04' },
  { id: 'c26', file_no: 'JM-2026-068', template_id: 'ca_cn_cargo', n: 26, pet: 'Sesame', species: 'dog', breed: '泰迪', gender: '母', weight: 5.9, color: '灰色', birth: '2022-05-20', owner: '韩雪', origin: 'YYZ', dest: 'HKG', departure: '2026-10-01', step: 'booking', stage: '落实置', next_step: '订舱', priority: '紧急', deadline: '2026-09-16', waiting: '航司', risk: ['时间'], airline: '查询中', route_id: 'r06', pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', notes: 'LH 10/1 无仓位，备选 CX829 10/2 或 LH 10/3，需客人确认。' },
  { id: 'c27', file_no: 'JM-2026-069', template_id: 'us_cn_cargo', n: 27, pet: 'Cookie', species: 'dog', breed: '西高地', gender: '母', weight: 7.9, color: '白色', birth: '2022-10-30', owner: '冯思涵', origin: 'LAX', dest: 'HKG', departure: '2026-10-18', step: 'serum', stage: '等待文件', next_step: '等血清', priority: '未来 14 天', deadline: '2026-09-29', airline: '未订', route_id: 'r11', pay: 'deposit', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要' },
  { id: 'c28', file_no: 'JM-2026-070', template_id: 'cn_au_cargo', n: 28, pet: 'Yuki', species: 'cat', breed: '布偶', gender: '母', weight: 4.5, color: '蓝双色', birth: '2023-02-14', owner: '董晨曦', origin: 'PVG', dest: 'MEL', departure: '2026-11-20', step: 'rnatt_wait', stage: '办理签证', next_step: '申请许可证', priority: '暂缓', deadline: '2026-09-21', airline: '未订', route_id: 'r19', pay: 'deposit', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要', notes: 'RNATT 180 天等待期中，10 月初可申请 DAFF 许可。' },
  // ---------- 归档 ----------
  { id: 'a01', file_no: 'JM-2026-012', template_id: 'ca_cn_cargo', n: 31, pet: 'Lulu', species: 'dog', breed: '泰迪', gender: '母', weight: 5.0, color: '杏色', birth: '2021-04-04', owner: '郭子墨', origin: 'YYZ', dest: 'HKG', departure: '2026-06-20', step: 'archive', stage: '完成', next_step: '结束', priority: '待定', deadline: '', airline: '已到达', route_id: 'r01', awb: '160-00112233', foster: ['2026-06-13', '2026-06-20'], pay: 'full', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', archived: true, arrival_log: '6/21 到家，主人好评。' },
  { id: 'a02', file_no: 'JM-2026-015', template_id: 'ca_cn_cargo', n: 32, pet: 'Tiger', species: 'cat', breed: '美短', gender: '公', weight: 5.2, color: '棕虎斑', birth: '2020-06-06', owner: '沈梦琪', origin: 'YVR', dest: 'PVG', departure: '2026-07-03', step: 'archive', stage: '完成', next_step: '结束', priority: '待定', deadline: '', airline: '已到达', route_id: 'r04', awb: '014-00445566', pay: 'full', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', archived: true, arrival_log: '7/4 到家。' },
  { id: 'a03', file_no: 'JM-2026-019', template_id: 'cn_ca_cargo', n: 33, pet: 'Mango', species: 'dog', breed: '柯基', gender: '母', weight: 11.0, color: '黄白', birth: '2022-01-01', owner: '潘俊熙', origin: 'PVG', dest: 'YYZ', departure: '2026-07-15', step: 'archive', stage: '完成', next_step: '结束', priority: '待定', deadline: '', airline: '已到达', route_id: 'r16', awb: '014-00778899', pay: 'full', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', archived: true, arrival_log: '7/15 落地 YYZ，CFIA 检查 40 分钟放行，老王送到家。' },
  { id: 'a04', file_no: 'JM-2026-022', template_id: 'ca_cn_cargo', n: 34, pet: '多多', species: 'cat', breed: '英短', gender: '公', weight: 4.7, color: '蓝色', birth: '2022-03-03', owner: '彭欣然', origin: 'YYZ', dest: 'PEK', departure: '2026-08-01', step: 'archive', stage: '完成', next_step: '结束', priority: '待定', deadline: '', airline: '已到达', route_id: 'r05', awb: '014-00998877', pay: 'full', docs: 'u_zhou', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '需要', archived: true, arrival_log: '8/2 到家，北京免隔离。' },
  { id: 'a05', file_no: 'JM-2026-009', template_id: 'cn_au_cargo', n: 35, pet: 'Rocky', species: 'dog', breed: '金毛', gender: '公', weight: 30.2, color: '金色', birth: '2019-12-12', owner: '袁浩宇', origin: 'PVG', dest: 'MEL', departure: '2026-05-30', step: 'archive', stage: '完成', next_step: '结束', priority: '待定', deadline: '', airline: '已到达', route_id: 'r19', awb: '160-00332211', pay: 'full', docs: 'u_lin', logistics: 'u_zhang', booking: 'u_teddy', driver_needed: '不需要', archived: true, arrival_log: '6/10 墨尔本隔离结束，主人接回。' },
];

export const seedCases: Case[] = specs.map(mkCase);
export const caseById = (cases: Case[], id: string) => cases.find((c) => c.id === id);
export const petEmojiOf = (c: Pick<Case, 'species'>) => (c.species === 'cat' ? '🐱' : '🐶');
export const cityOf = (code: string) => AIRPORT_CITY[code] ?? code;
