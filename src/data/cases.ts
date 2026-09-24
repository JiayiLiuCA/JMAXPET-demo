import type {
  AccompanyStatus, AirlineConfirmed, Cabin, Case, CaseStep, CaseType, Currency, DriverNeeded, FinalPaymentPoint, FinalPaymentStatus, Flight, Gender, RiskTag, ServiceScope, Species, Waiting,
} from '@/types';
import { workflowById } from '@/data/workflows';
import { routeById } from '@/data/routes';
import { AIRPORT_CITY, AIRPORT_COUNTRY, AIRPORT_REGION, SPECIES_EMOJI } from '@/data/options';
import { buildTimeline } from '@/lib/workflow';
import { SEED_TODAY, addDays } from '@/lib/dates';

/**
 * 所有宠物 / 主人数据均为编造。护照号、电话使用明显假的格式。
 */

interface Spec {
  id: string; file_no: string; tpl: string; type?: CaseType; scope?: ServiceScope; payPoint?: FinalPaymentPoint; n: number;
  pet: string; species: Species; breed: string; gender: Gender; weight: number; color: string; birth: string;
  owner: string;
  origin: string; entry: string; final_dest?: string; departure: string; confirmed?: boolean;
  step: string; waiting?: Waiting; risk?: RiskTag[];
  airline: AirlineConfirmed; route_id?: string; awb?: string; old_flight?: { route_id: string; date: string; note: string };
  foster?: [string, string]; foster_notes?: string;
  order: number; deposit: number; currency?: Currency; final_status?: FinalPaymentStatus;
  docs: string; sales: string; sales_order?: string; driver_needed?: DriverNeeded;
  handover?: string; pickup_log?: string; foster_log?: string; arrival_log?: string; pet_notes?: string;
  crate?: string; archived?: boolean; health_cert_issued?: string; created?: string; booking_notified?: boolean;
  accompany?: { needed: boolean; person?: string; status: AccompanyStatus; notes?: string; updated?: string; cabin?: Cabin };
  flight_change?: Case['flight_change']; flight_change_note?: string;
  docs_handed?: boolean; passport_sent?: boolean; home?: string;
}

const AREA: Record<string, { area: string; street: string; city: string }> = {
  YYZ: { area: '416', street: 'Bay St', city: 'Toronto, ON' },
  YVR: { area: '604', street: 'Robson St', city: 'Vancouver, BC' },
  JFK: { area: '212', street: 'W 34th St', city: 'New York, NY' },
  LAX: { area: '310', street: 'Wilshire Blvd', city: 'Los Angeles, CA' },
  MEL: { area: '61 3', street: 'Collins St', city: 'Melbourne, VIC' },
  LHR: { area: '44 20', street: 'Baker St', city: 'London' },
  DXB: { area: '971 4', street: 'Sheikh Zayed Rd', city: 'Dubai' },
  NRT: { area: '81 3', street: 'Ginza', city: 'Tokyo' },
};
const CN_ADDR: Record<string, string> = { HKG: '香港九龙塘窝打老道', PVG: '上海市浦东新区张江路', PEK: '北京市朝阳区望京西路', CAN: '广州市天河区珠江新城华夏路', SZX: '深圳市南山区科技园' };
const POST_BY_REGION: Record<string, string> = { 香港: 'u_zhang', 中国大陆: 'u_zhang' };

function mkFlight(id: string, routeId: string, date: string, opts: { awb?: string; confirmed: boolean; status: Flight['status']; note?: string; created?: string }): Flight[] {
  const r = routeById(routeId);
  if (!r) return [];
  const base = { awb: opts.awb ?? '', confirmed: opts.confirmed, status: opts.status, note: opts.note ?? '', created_at: opts.created ?? addDays(date, -25) };
  const dep = `${date}T${r.dep_time}:00`;
  if (r.type === '直飞') return [{ id: `${id}_f1`, airline: r.airline, flight_no: r.flight_no, from_code: r.origin, to_code: r.dest, dep_time: dep, arr_time: `${addDays(date, r.arr_day_offset)}T${r.arr_time}:00`, ...base }];
  const via = r.via ?? 'FRA';
  const leg1Arr = via === 'NRT' ? `${addDays(date, 1)}T15:40:00` : via === 'HKG' ? `${addDays(date, 1)}T05:35:00` : `${addDays(date, 1)}T07:05:00`;
  const leg2Dep = via === 'NRT' ? `${addDays(date, 1)}T18:20:00` : via === 'HKG' ? `${addDays(date, 1)}T20:30:00` : `${addDays(date, 1)}T13:50:00`;
  return [
    { id: `${id}_f1`, airline: r.airline, flight_no: r.flight_no, from_code: r.origin, to_code: via, dep_time: dep, arr_time: leg1Arr, ...base },
    { id: `${id}_f2`, airline: r.airline, flight_no: r.second_leg ?? '', from_code: via, to_code: r.dest, dep_time: leg2Dep, arr_time: `${addDays(date, r.arr_day_offset)}T${r.arr_time}:00`, ...base },
  ];
}

function flightsFor(s: Spec): Flight[] {
  const list: Flight[] = [];
  if (s.old_flight) list.push(...mkFlight(`${s.id}_old`, s.old_flight.route_id, s.old_flight.date, { confirmed: false, status: 'superseded', note: s.old_flight.note }));
  if (s.route_id) {
    const confirmed = ['已确认', '已起飞', '已到达'].includes(s.airline);
    list.push(...mkFlight(s.id, s.route_id, s.departure, { awb: s.awb, confirmed, status: 'active' }));
  }
  return list;
}

function mkCase(s: Spec): Case {
  const tpl = workflowById(s.tpl)!;
  const type: CaseType = s.type ?? '托运';
  const scope: ServiceScope = s.scope ?? '全包';
  const payPoint: FinalPaymentPoint = s.payPoint ?? (scope === '仅订舱' ? '送机前' : '清关后');
  let timeline: CaseStep[] = buildTimeline(tpl, { caseType: type, scope, payPoint }, s.departure, s.step, SEED_TODAY);
  if (s.archived) timeline = timeline.map((st) => ({ ...st, status: '完成', missing_docs: [], completed_at: st.planned_date }));
  const done = (key: string) => timeline.find((t) => t.key === key)?.status === '完成';
  const planned = (key: string) => timeline.find((t) => t.key === key)?.planned_date ?? '';
  const outbound = AIRPORT_COUNTRY[s.origin] !== '中国';
  const meta = AREA[outbound ? s.origin : s.entry] ?? AREA.YYZ;
  const cnCity = CN_ADDR[outbound ? s.entry : s.origin] ?? CN_ADDR.PVG;
  const nn = String(s.n).padStart(2, '0');
  const certKey = tpl.steps.some((x) => x.key === 'health_cert') ? 'health_cert' : 'quarantine_cert';
  const filesStatus: Case['files_status'] = s.archived ? '已转交主人' : s.docs_handed ? '已转交主人' : done('stamp') ? '已盖章' : done(certKey) ? '已完成' : done('booking') || done('accompany_booking') ? '处理中' : done('rabies') ? '部分' : '无';
  const rabiesDate = done('rabies') ? planned('rabies') : '';
  const region = AIRPORT_REGION[s.entry] ?? '中国大陆';
  const r = s.route_id ? routeById(s.route_id) : undefined;
  const currency: Currency = s.currency ?? (['JFK', 'LAX'].includes(s.origin) ? 'USD' : outbound ? 'CAD' : 'RMB');
  const isAccompany = type === '随机';
  const finalStatus: FinalPaymentStatus = s.final_status ?? (isAccompany ? '不适用（随机全款）' : s.archived ? '已收齐全部尾款' : '尾款未收齐');
  return {
    id: s.id, file_no: s.file_no, case_type: type, service_scope: scope, template_id: tpl.id, archived: !!s.archived,
    created_at: s.created ?? addDays(s.departure, -95), sales_order_id: s.sales_order ?? '',
    pet_name: s.pet, species: s.species, breed: s.breed, birth_date: s.birth, gender: s.gender, weight: s.weight, color: s.color,
    chip_no: `900-${String(11000 + s.n * 79).slice(0, 3)}-${String(1000 + s.n * 7).slice(0, 3)}-${String(100 + s.n * 3).padStart(3, '0')}-${String(s.n * 13).padStart(3, '0')}`,
    crate_size: s.crate ?? (s.weight > 20 ? 'IATA #500 (102×69×76)' : s.weight > 9 ? 'IATA #400 (91×61×66)' : s.weight > 5 ? 'IATA #300 (81×56×58)' : 'IATA #200 (69×51×48)'),
    pet_notes: s.pet_notes ?? '',
    foster_start: s.foster?.[0] ?? '', foster_end: s.foster?.[1] ?? '',
    foster_notes: s.foster_notes ?? (s.foster ? '每日 2 餐，自带粮；出发前一天洗澡' : ''),
    foster_daily: s.foster ? [
      { date: s.foster[0], note: '入住，精神状态良好，食欲正常', by: '小林' },
      { date: addDays(s.foster[0], 1), note: '早晚各遛 20 分钟，排便正常，已发视频给主人', by: '小林' },
    ].filter((d) => d.date <= SEED_TODAY) : [],
    owner_name: s.owner,
    passport_no: `E${String(12345600 + s.n).padStart(8, '0')}`,
    owner_phone_cn: `+86 138-0000-01${nn}`,
    owner_phone_intl: `+1 ${meta.area}-555-01${nn}`,
    owner_addr_cn: `${cnCity} ${s.n * 3} 号`,
    owner_addr_intl: `${100 + s.n * 7} ${meta.street}, ${meta.city}`,
    owner_email: `owner${nn}@example.com`,
    origin_country: AIRPORT_COUNTRY[s.origin] ?? '加拿大', origin_city: AIRPORT_CITY[s.origin] ?? s.origin, origin: s.origin,
    entry_airport: s.entry, final_dest: s.final_dest ?? AIRPORT_CITY[s.entry] ?? s.entry,
    dest_country: AIRPORT_COUNTRY[s.entry] ?? '中国', dest_region: region,
    route: `${s.origin} → ${s.entry}${r ? ` · ${r.flight_no}${r.type === '中转' ? ` 经 ${r.via}` : ' 直飞'}` : ''}`,
    departure_date: s.departure, departure_confirmed: s.confirmed ?? ['已确认', '已起飞', '已到达'].includes(s.airline),
    status: s.archived ? '已完成' : '进行中', waiting: s.waiting ?? '', risk_tags: s.risk ?? [],
    current_step_key: s.archived ? 'archive' : s.step, timeline, final_payment_point: payPoint,
    files_status: filesStatus,
    health_cert_issued: s.health_cert_issued ?? (done(certKey) ? planned(certKey) : ''),
    vacc_rabies_1: rabiesDate, vacc_rabies_2: done('rabies2') ? planned('rabies2') : '',
    vacc_combo: done('combo') ? planned('combo') : '', vacc_blood: done('blood') ? planned('blood') : '',
    vacc_notes: done('blood') ? '血清报告合格' : '',
    airline_confirmed: isAccompany ? '不需要' : s.airline, flights: flightsFor(s),
    flight_change: s.flight_change ?? '', flight_change_note: s.flight_change_note ?? '',
    booking_notified: s.booking_notified ?? (done('booking') || ['查询中', '待确认', '已确认', '已起飞', '已到达'].includes(s.airline)),
    accompany_needed: s.accompany?.needed ?? false, accompany_person: s.accompany?.person ?? '', accompany_status: s.accompany?.status ?? '未订',
    accompany_notes: s.accompany?.notes ?? '', accompany_notes_updated: s.accompany?.updated ?? '', cabin: s.accompany?.cabin ?? '',
    docs_handed_to_owner: s.docs_handed ?? !!s.archived, passport_sent: s.passport_sent ?? done('customs'), arrived_home: !!s.home || !!s.archived, home_date: s.home ?? (s.archived ? planned('home') : ''),
    driver_needed: s.driver_needed ?? (isAccompany || type === '仅代办文件' ? '不需要' : '需要'),
    order_amount: s.order, deposit_amount: s.deposit, final_amount: s.order - s.deposit, currency, final_payment_status: finalStatus,
    payment_notes: isAccompany ? '随机全款接单前已收' : finalStatus === '已收齐全部尾款' ? '全款已收' : '定金已收；尾款按节点收',
    sales_handover: s.handover ?? `客人经微信咨询，已确认路线 ${s.origin} → ${s.entry}，报价含代办文件${type === '托运' ? '与国内清关' : ''}。`,
    pickup_log: s.pickup_log ?? '', foster_log: s.foster_log ?? '', arrival_log: s.arrival_log ?? '',
    ops_docs_id: s.docs, booking_id: type === '仅代办文件' ? '' : isAccompany ? 'u_vivian' : 'u_teddy',
    ops_post_id: POST_BY_REGION[region] ?? 'u_he', sales_id: s.sales,
  };
}

const specs: Spec[] = [
  // ---------- 本周出发 / 即将出发 ----------
  { id: 'c01', file_no: 'JM-2026-041', tpl: 'na_hk', n: 1, pet: 'Teddy', species: 'dog', breed: '泰迪', gender: 'M', weight: 6.2, color: '棕色', birth: '2022-03-14', owner: '陈思远', origin: 'YYZ', entry: 'HKG', departure: '2026-09-18', step: 'driver_airport', airline: '已确认', route_id: 'r01', awb: '160-12345678', foster: ['2026-09-10', '2026-09-18'], order: 26000, deposit: 8000, currency: 'RMB', docs: 'u_lin', sales: 'u_amy', sales_order: 'so01', handover: '客人通过小红书咨询，已确认 9/18 CX829，尾款清关后收；主人要求每天发视频。', pickup_log: '09/10 老王接回寄养，状态良好，带狗粮 2kg 及疫苗本原件。', foster_log: '每日 2 餐，早晚各遛 20 分钟。', health_cert_issued: '2026-09-10' },
  { id: 'c02', file_no: 'JM-2026-038', tpl: 'na_cn', n: 2, pet: '豆豆', species: 'dog', breed: '柯基', gender: 'FS', weight: 11.4, color: '三色', birth: '2021-07-02', owner: '王梓涵', origin: 'YVR', entry: 'PVG', departure: '2026-09-17', step: 'driver_airport', airline: '已确认', route_id: 'r04', awb: '014-77812345', foster: ['2026-09-12', '2026-09-17'], order: 5200, deposit: 5200, currency: 'CAD', final_status: '已收齐全部尾款', docs: 'u_zhou', sales: 'u_ben', pickup_log: '09/12 老李接回寄养，主人交代早上不要喂太多。', health_cert_issued: '2026-09-09' },
  { id: 'c03', file_no: 'JM-2026-035', tpl: 'na_hk', n: 3, pet: 'Mochi', species: 'cat', breed: '布偶', gender: 'MN', weight: 4.8, color: '蓝双色', birth: '2023-01-20', owner: '李婉晴', origin: 'YYZ', entry: 'HKG', departure: '2026-09-20', step: 'stamp', waiting: '文件', risk: ['文件', '时间'], airline: '已确认', route_id: 'r06', awb: '020-55667788', foster: ['2026-09-11', '2026-09-20'], order: 4800, deposit: 1500, currency: 'CAD', docs: 'u_lin', sales: 'u_amy', health_cert_issued: '2026-09-12', pet_notes: 'CFIA 预约被取消一次，09/16 重新排上，务必今天盖章，否则赶不上 09/20 LH。' },
  { id: 'c04', file_no: 'JM-2026-044', tpl: 'na_hk', n: 4, pet: '可乐', species: 'dog', breed: '法斗', gender: 'M', weight: 12.8, color: '奶油色', birth: '2022-11-05', owner: '张浩然', origin: 'LAX', entry: 'HKG', departure: '2026-09-22', step: 'stamp', waiting: '航司', risk: ['健康'], airline: '待确认', route_id: 'r11', order: 3600, deposit: 1200, currency: 'USD', final_status: '已收齐部分尾款', docs: 'u_zhou', sales: 'u_ben', driver_needed: '不需要', health_cert_issued: '2026-09-13', pet_notes: '短鼻犬，CX 需提交 snub-nose 承诺书；箱体需比标准大一号。主人自送 LAX 货站。' },
  { id: 'c05', file_no: 'JM-2026-046', tpl: 'na_cn', n: 5, pet: 'Luna', species: 'cat', breed: '英短', gender: 'F', weight: 3.9, color: '蓝色', birth: '2023-05-30', owner: '刘思琪', origin: 'YYZ', entry: 'PVG', departure: '2026-09-23', step: 'health_cert', airline: '已确认', route_id: 'r03', awb: '014-33445566', foster: ['2026-09-16', '2026-09-23'], order: 4600, deposit: 1500, currency: 'CAD', docs: 'u_lin', sales: 'u_amy', sales_order: 'so02', handover: '老客户介绍，今天接宠入寄养，明天送医院办健康证。定金 1500 已收。' },
  { id: 'c06', file_no: 'JM-2026-047', tpl: 'na_cn', n: 6, pet: '旺财', species: 'cat', breed: '田园猫', gender: 'MN', weight: 5.1, color: '橘色', birth: '2020-09-09', owner: '赵文博', origin: 'YYZ', entry: 'PEK', departure: '2026-09-25', step: 'booking', waiting: '航司', airline: '查询中', route_id: 'r05', order: 4600, deposit: 1500, currency: 'CAD', docs: 'u_lin', sales: 'u_amy', pet_notes: 'AC31 09/25 仓位待回复，若无则改 09/27。' },
  { id: 'c07', file_no: 'JM-2026-049', tpl: 'na_hk', n: 7, pet: 'Simba', species: 'cat', breed: '美短', gender: 'MN', weight: 4.4, color: '银虎斑', birth: '2022-08-18', owner: '周雨桐', origin: 'YVR', entry: 'HKG', departure: '2026-09-28', step: 'health_cert', waiting: '医院', airline: '已确认', route_id: 'r02', awb: '160-22334455', order: 4300, deposit: 1500, currency: 'CAD', docs: 'u_lin', sales: 'u_ben' },
  { id: 'c08', file_no: 'JM-2026-050', tpl: 'na_cn', n: 8, pet: 'Bella', species: 'dog', breed: '金毛', gender: 'FS', weight: 28.5, color: '金色', birth: '2021-02-11', owner: '孙嘉怡', origin: 'YYZ', entry: 'PVG', departure: '2026-10-02', step: 'booking', airline: '未订', route_id: 'r03', foster: ['2026-09-28', '2026-10-02'], order: 6800, deposit: 2000, currency: 'CAD', docs: 'u_zhou', sales: 'u_amy', booking_notified: false, pet_notes: '28.5kg 大型犬，需 #500 箱；AC 夏季高温限制 9 月底解除后再订。' },
  { id: 'c09', file_no: 'JM-2026-051', tpl: 'na_hk', n: 9, pet: 'Coco', species: 'dog', breed: '泰迪', gender: 'F', weight: 5.5, color: '香槟色', birth: '2023-03-03', owner: '吴俊杰', origin: 'JFK', entry: 'HKG', departure: '2026-10-05', step: 'combo', waiting: '主人', risk: ['文件'], airline: '未订', route_id: 'r09', order: 3400, deposit: 1000, currency: 'USD', docs: 'u_zhou', sales: 'u_ben', driver_needed: '不需要', pet_notes: '主人还没发疫苗本扫描件，已催两次。' },
  { id: 'c10', file_no: 'JM-2026-052', tpl: 'na_cn', n: 10, pet: 'Milo', species: 'dog', breed: '柴犬', gender: 'M', weight: 10.2, color: '赤色', birth: '2022-06-25', owner: '郑一诺', origin: 'YVR', entry: 'PVG', departure: '2026-10-08', step: 'booking', airline: '未订', route_id: 'r08', order: 5600, deposit: 1800, currency: 'CAD', docs: 'u_lin', sales: 'u_ben' },
  { id: 'c11', file_no: 'JM-2026-053', tpl: 'na_hk', n: 11, pet: '糯米', species: 'cat', breed: '布偶', gender: 'F', weight: 4.1, color: '海豹双色', birth: '2024-01-15', owner: '黄雅婷', origin: 'YYZ', entry: 'HKG', departure: '2026-10-10', step: 'combo', airline: '未订', route_id: 'r01', order: 4300, deposit: 1500, currency: 'CAD', docs: 'u_lin', sales: 'u_amy' },
  { id: 'c12', file_no: 'JM-2026-054', tpl: 'na_hk', n: 12, pet: 'Oreo', species: 'dog', breed: '西高地', gender: 'MN', weight: 8.3, color: '白色', birth: '2021-12-01', owner: '何思成', origin: 'YYZ', entry: 'HKG', departure: '2026-10-15', step: 'rabies', risk: ['芯片'], airline: '未订', route_id: 'r01', order: 4500, deposit: 1500, currency: 'CAD', docs: 'u_zhou', sales: 'u_amy', pet_notes: '芯片扫描读不出，需医院复查；若需重植则狂犬要重打。' },
  { id: 'c13', file_no: 'JM-2026-055', tpl: 'cn_ca', n: 13, pet: 'Nala', species: 'cat', breed: '美短', gender: 'FS', weight: 4.0, color: '银渐层', birth: '2022-04-04', owner: '林子涵', origin: 'PVG', entry: 'YYZ', departure: '2026-10-06', step: 'quarantine_cert', airline: '已确认', route_id: 'r16', awb: '014-99001122', order: 32000, deposit: 12000, currency: 'RMB', final_status: '已收齐部分尾款', docs: 'u_lin', sales: 'u_amy', driver_needed: '不需要', handover: '上海端合作伙伴负责送机，多伦多落地后老王接机送主人家。' },
  { id: 'c14', file_no: 'JM-2026-056', tpl: 'cn_ca', n: 14, pet: 'Max', species: 'dog', breed: '金毛', gender: 'M', weight: 31.0, color: '金色', birth: '2020-10-10', owner: '杨博文', origin: 'PVG', entry: 'YVR', departure: '2026-10-20', step: 'quarantine_cert', airline: '已确认', route_id: 'r17', awb: '014-55667700', old_flight: { route_id: 'r17', date: '2026-10-18', note: '09/12 航司改期 10/18 → 10/20' }, order: 36000, deposit: 12000, currency: 'RMB', docs: 'u_lin', sales: 'u_ben', driver_needed: '不需要', pet_notes: 'AC26 原 10/18 改期至 10/20，已同步主人。' },
  // ---------- 随机 ----------
  { id: 'c15', file_no: 'JM-2026-057', tpl: 'na_hk', type: '随机', n: 15, pet: 'Kiki', species: 'cat', breed: '英短', gender: 'F', weight: 3.6, color: '蓝白', birth: '2023-09-01', owner: '徐若曦', origin: 'YYZ', entry: 'HKG', departure: '2026-09-30', confirmed: true, step: 'health_cert', airline: '不需要', route_id: 'r01', order: 3200, deposit: 3200, currency: 'CAD', docs: 'u_zhou', sales: 'u_ben', sales_order: 'so04', accompany: { needed: false, status: '待航司确认', notes: '09/14 主人已购 CX829 09/30 机票，等航司确认宠物位置', updated: '2026-09-14', cabin: '客舱' }, handover: '主人随行同机，我们代办文件 + 向航司加宠物位置；全款已收。' },
  { id: 'c16', file_no: 'JM-2026-058', tpl: 'na_hk', type: '随机', n: 16, pet: 'Lucky', species: 'dog', breed: '柯基', gender: 'M', weight: 12.0, color: '黄白', birth: '2022-02-02', owner: '马嘉伟', origin: 'YVR', entry: 'HKG', departure: '2026-10-12', step: 'accompany_booking', waiting: '随机人', airline: '不需要', route_id: 'r14', order: 4800, deposit: 4800, currency: 'CAD', docs: 'u_lin', sales: 'u_ben', accompany: { needed: true, status: '正在查询', notes: '09/15 找到一位 10/12 AC7 的乘客，等对方回复', updated: '2026-09-15', cabin: '氧舱' } },
  { id: 'c29', file_no: 'JM-2026-071', tpl: 'na_cn', type: '随机', n: 29, pet: '芝麻', species: 'cat', breed: '田园猫', gender: 'MN', weight: 4.2, color: '黑色', birth: '2021-06-18', owner: '许安琪', origin: 'YYZ', entry: 'PVG', departure: '2026-10-03', confirmed: true, step: 'health_cert', airline: '不需要', route_id: 'r03', order: 4200, deposit: 4200, currency: 'CAD', docs: 'u_zhou', sales: 'u_amy', accompany: { needed: true, person: '刘女士（AC27 10/03）', status: '已添加宠物位置', notes: '09/10 随机人已确认，航司已加宠物位置，客舱', updated: '2026-09-10', cabin: '客舱' } },
  { id: 'c30', file_no: 'JM-2026-072', tpl: 'ca_us', type: '随机', n: 30, pet: 'Pepper', species: 'dog', breed: '泰迪', gender: 'F', weight: 4.9, color: '黑色', birth: '2023-04-12', owner: '罗子轩', origin: 'YYZ', entry: 'LAX', departure: '2026-10-25', step: 'rabies', airline: '不需要', route_id: 'r26', order: 1800, deposit: 1800, currency: 'CAD', docs: 'u_zhou', sales: 'u_amy', accompany: { needed: false, status: '未订', notes: '', cabin: '' } },
  // ---------- 仅代办文件 ----------
  { id: 'c31', file_no: 'JM-2026-073', tpl: 'na_cn', type: '仅代办文件', n: 31, pet: '汤圆', species: 'rabbit', breed: '荷兰垂耳兔', gender: 'F', weight: 1.8, color: '灰白', birth: '2024-02-20', owner: '苏晴', origin: 'YYZ', entry: 'PVG', departure: '2026-10-09', step: 'blood', airline: '不需要', order: 1500, deposit: 1500, currency: 'CAD', final_status: '已收齐全部尾款', docs: 'u_lin', sales: 'u_ben', driver_needed: '不需要', handover: '主人自己订机票自己走，我们只代办文件；办理过程中主人考虑改成全包托运，随时可能改类型。' },
  // ---------- 其他国家 ----------
  { id: 'c17', file_no: 'JM-2026-059', tpl: 'na_hk', n: 17, pet: 'Ginger', species: 'cat', breed: '美短', gender: 'FS', weight: 4.6, color: '橘白', birth: '2021-11-11', owner: '朱晓萌', origin: 'LAX', entry: 'CAN', final_dest: '广州', departure: '2026-09-19', step: 'driver_airport', airline: '已确认', route_id: 'r12', awb: '784-11223344', order: 3600, deposit: 3600, currency: 'USD', final_status: '已收齐全部尾款', docs: 'u_zhou', sales: 'u_ben', driver_needed: '不需要', health_cert_issued: '2026-09-11', pet_notes: '主人自送 LAX 货站，需提醒 09/18 19:00 前到。' },
  { id: 'c18', file_no: 'JM-2026-060', tpl: 'na_cn', n: 18, pet: 'Tofu', species: 'dog', breed: '法斗', gender: 'FS', weight: 11.5, color: '虎斑', birth: '2023-06-06', owner: '谢雨欣', origin: 'YYZ', entry: 'PVG', departure: '2026-10-25', step: 'rabies2', risk: ['芯片'], airline: '查询中', route_id: 'r07', order: 6200, deposit: 2000, currency: 'CAD', docs: 'u_zhou', sales: 'u_amy', pet_notes: '短鼻犬，AC 不接；改查 LH 经 FRA。' },
  { id: 'c19', file_no: 'JM-2026-061', tpl: 'na_cn', n: 19, pet: 'Snow', species: 'cat', breed: '布偶', gender: 'M', weight: 4.9, color: '蓝重点', birth: '2024-03-08', owner: '曹静怡', origin: 'YYZ', entry: 'PEK', departure: '2026-11-05', step: 'rabies2', airline: '未订', route_id: 'r05', order: 4800, deposit: 1500, currency: 'CAD', docs: 'u_lin', sales: 'u_amy' },
  { id: 'c20', file_no: 'JM-2026-062', tpl: 'na_cn', n: 20, pet: 'Pudding', species: 'dog', breed: '泰迪', gender: 'M', weight: 4.8, color: '红棕', birth: '2023-10-10', owner: '邓子豪', origin: 'JFK', entry: 'PVG', departure: '2026-11-12', step: 'chip', airline: '未订', route_id: 'r10', order: 3800, deposit: 0, currency: 'USD', docs: 'u_zhou', sales: 'u_amy', sales_order: 'so05', driver_needed: '待定', handover: '新客户，定金未付，先不排资源。', created: '2026-09-14' },
  { id: 'c21', file_no: 'JM-2026-063', tpl: 'na_cn', n: 21, pet: 'Bobo', species: 'dog', breed: '金毛', gender: 'M', weight: 27.0, color: '浅金', birth: '2021-05-05', owner: '宋佳琪', origin: 'YVR', entry: 'PVG', departure: '2026-09-26', step: 'health_cert', airline: '已确认', route_id: 'r04', awb: '014-55443322', foster: ['2026-09-18', '2026-09-26'], order: 6800, deposit: 2000, currency: 'CAD', final_status: '已收齐部分尾款', docs: 'u_lin', sales: 'u_ben' },
  { id: 'c22', file_no: 'JM-2026-064', tpl: 'na_hk', n: 22, pet: 'Momo', species: 'cat', breed: '田园猫', gender: 'F', weight: 3.8, color: '三花', birth: '2022-12-12', owner: '唐雨萱', origin: 'YYZ', entry: 'HKG', departure: '2026-09-24', step: 'stamp', airline: '已确认', route_id: 'r01', awb: '160-66778899', foster: ['2026-09-15', '2026-09-24'], order: 4300, deposit: 1500, currency: 'CAD', final_status: '已收齐部分尾款', docs: 'u_lin', sales: 'u_amy', pickup_log: '09/15 老王接回寄养，猫咪有点紧张，已放猫薄荷。', health_cert_issued: '2026-09-15' },
  { id: 'c23', file_no: 'JM-2026-065', tpl: 'na_cn', n: 23, pet: 'Hazel', species: 'cat', breed: '英短', gender: 'MN', weight: 4.3, color: '银点', birth: '2022-07-07', owner: '高天宇', origin: 'YYZ', entry: 'PVG', departure: '2026-09-16', step: 'flight_track', airline: '已起飞', route_id: 'r03', awb: '014-11223344', foster: ['2026-09-09', '2026-09-16'], order: 4600, deposit: 4600, currency: 'CAD', final_status: '已收齐全部尾款', docs: 'u_zhou', sales: 'u_amy', pickup_log: '09/16 07:30 老王送机，08:40 交货 AC Cargo。', health_cert_issued: '2026-09-07' },
  { id: 'c24', file_no: 'JM-2026-066', tpl: 'na_hk', n: 24, pet: 'Biscuit', species: 'dog', breed: '柯基', gender: 'M', weight: 10.8, color: '三色', birth: '2022-09-09', owner: '罗欣怡', origin: 'YVR', entry: 'HKG', departure: '2026-09-14', step: 'customs', airline: '已到达', route_id: 'r02', awb: '160-88990011', foster: ['2026-09-08', '2026-09-14'], order: 4500, deposit: 1500, currency: 'CAD', docs: 'u_lin', sales: 'u_ben', arrival_log: '09/15 06:10 落地 HKG，代理已提货，等海关放行。', health_cert_issued: '2026-09-05', passport_sent: false },
  { id: 'c25', file_no: 'JM-2026-067', tpl: 'na_hk', n: 25, pet: 'Peanut', species: 'dog', breed: '柴犬', gender: 'M', weight: 9.7, color: '黑色', birth: '2021-08-08', owner: '蒋伟豪', origin: 'YYZ', entry: 'HKG', departure: '2026-09-12', step: 'final_payment', waiting: '尾款', airline: '已到达', route_id: 'r01', awb: '160-12312312', foster: ['2026-09-05', '2026-09-12'], order: 4500, deposit: 1500, currency: 'CAD', docs: 'u_zhou', sales: 'u_amy', arrival_log: '09/13 清关完成，等尾款后转运到家；尾款催了两次未回复。', health_cert_issued: '2026-09-04', passport_sent: true },
  { id: 'c26', file_no: 'JM-2026-068', tpl: 'na_hk', n: 26, pet: 'Sesame', species: 'dog', breed: '泰迪', gender: 'FS', weight: 5.9, color: '灰色', birth: '2022-05-20', owner: '韩雪', origin: 'YYZ', entry: 'HKG', departure: '2026-10-01', step: 'booking', waiting: '航司', risk: ['时间'], airline: '查询中', route_id: 'r06', order: 4500, deposit: 1500, currency: 'CAD', docs: 'u_lin', sales: 'u_ben', sales_order: 'so03', pet_notes: 'LH 10/01 无仓位，备选 CX829 10/02 或 LH 10/03，需客人确认。' },
  { id: 'c27', file_no: 'JM-2026-069', tpl: 'na_hk', n: 27, pet: 'Cookie', species: 'dog', breed: '西高地', gender: 'F', weight: 7.9, color: '白色', birth: '2022-10-30', owner: '冯思涵', origin: 'LAX', entry: 'HKG', departure: '2026-10-18', step: 'booking', airline: '未订', route_id: 'r11', order: 3400, deposit: 1000, currency: 'USD', docs: 'u_zhou', sales: 'u_ben', driver_needed: '不需要' },
  { id: 'c28', file_no: 'JM-2026-070', tpl: 'na_au', n: 28, pet: 'Yuki', species: 'cat', breed: '布偶', gender: 'FS', weight: 4.5, color: '蓝双色', birth: '2023-02-14', owner: '董晨曦', origin: 'YYZ', entry: 'MEL', departure: '2026-11-20', step: 'other_docs', airline: '未订', route_id: 'r23', order: 9800, deposit: 3000, currency: 'CAD', docs: 'u_lin', sales: 'u_amy', driver_needed: '不需要', pet_notes: 'RNATT 180 天等待期中，10 月初可申请 DAFF 许可。' },
  { id: 'c32', file_no: 'JM-2026-074', tpl: 'na_uk_dog', n: 32, pet: 'Rocky', species: 'dog', breed: '边牧', gender: 'MN', weight: 18.5, color: '黑白', birth: '2021-09-30', owner: '梁若雪', origin: 'YYZ', entry: 'LHR', final_dest: '伦敦', departure: '2026-10-11', step: 'booking', airline: '查询中', route_id: 'r20', order: 5800, deposit: 2000, currency: 'CAD', docs: 'u_zhou', sales: 'u_ben', pet_notes: '英国只收货运；出发前 5 天内绦虫驱虫 + 健康证。' },
  { id: 'c33', file_no: 'JM-2026-075', tpl: 'na_dxb_cat', n: 33, pet: 'Nemo', species: 'cat', breed: '布偶', gender: 'M', weight: 4.4, color: '海豹手套', birth: '2023-08-08', owner: '沈一凡', origin: 'YYZ', entry: 'DXB', final_dest: '迪拜', departure: '2026-10-28', step: 'uae_permit', airline: '未订', route_id: 'r21', order: 6200, deposit: 2000, currency: 'CAD', docs: 'u_lin', sales: 'u_amy' },
  { id: 'c34', file_no: 'JM-2026-076', tpl: 'ca_jp', n: 34, pet: 'Sora', species: 'dog', breed: '柴犬', gender: 'F', weight: 9.1, color: '赤色', birth: '2022-01-25', owner: '田中美咲', origin: 'YYZ', entry: 'NRT', final_dest: '东京', departure: '2026-11-15', step: 'aqs', airline: '未订', route_id: 'r22', order: 7200, deposit: 2500, currency: 'CAD', docs: 'u_zhou', sales: 'u_ben' },
  { id: 'c35', file_no: 'JM-2026-077', tpl: 'cn_us_dog', n: 35, pet: 'Bruno', species: 'dog', breed: '拉布拉多', gender: 'MN', weight: 29.0, color: '黑色', birth: '2020-05-05', owner: '陈嘉豪', origin: 'PVG', entry: 'LAX', final_dest: '洛杉矶', departure: '2026-11-08', step: 'kennel_apply', airline: '未订', route_id: 'r25', order: 38000, deposit: 12000, currency: 'RMB', docs: 'u_lin', sales: 'u_amy', driver_needed: '不需要' },
  { id: 'c36', file_no: 'JM-2026-078', tpl: 'na_cn', scope: '仅订舱', n: 36, pet: '奶茶', species: 'cat', breed: '英短', gender: 'F', weight: 4.0, color: '蓝金渐层', birth: '2023-11-11', owner: '方泽宇', origin: 'YYZ', entry: 'SZX', final_dest: '深圳', departure: '2026-09-29', step: 'stamp', airline: '已确认', route_id: 'r01', awb: '160-99887766', order: 3200, deposit: 1000, currency: 'CAD', docs: 'u_zhou', sales: 'u_ben', driver_needed: '需要', health_cert_issued: '2026-09-16', handover: '仅订舱 + 送机，主人在深圳自行清关；送机前收尾款。' },
  // ---------- 归档 ----------
  { id: 'a01', file_no: 'JM-2026-012', tpl: 'na_hk', n: 41, pet: 'Lulu', species: 'dog', breed: '泰迪', gender: 'FS', weight: 5.0, color: '杏色', birth: '2021-04-04', owner: '郭子墨', origin: 'YYZ', entry: 'HKG', departure: '2026-06-20', step: 'archive', airline: '已到达', route_id: 'r01', awb: '160-00112233', foster: ['2026-06-13', '2026-06-20'], order: 4300, deposit: 1500, currency: 'CAD', docs: 'u_lin', sales: 'u_amy', archived: true, arrival_log: '06/21 到家，主人好评。' },
  { id: 'a02', file_no: 'JM-2026-015', tpl: 'na_cn', n: 42, pet: 'Tiger', species: 'cat', breed: '美短', gender: 'MN', weight: 5.2, color: '棕虎斑', birth: '2020-06-06', owner: '沈梦琪', origin: 'YVR', entry: 'PVG', departure: '2026-07-03', step: 'archive', airline: '已到达', route_id: 'r04', awb: '014-00445566', order: 4600, deposit: 1500, currency: 'CAD', docs: 'u_zhou', sales: 'u_ben', archived: true, arrival_log: '07/04 到家。' },
  { id: 'a03', file_no: 'JM-2026-019', tpl: 'cn_ca', n: 43, pet: 'Mango', species: 'dog', breed: '柯基', gender: 'F', weight: 11.0, color: '黄白', birth: '2022-01-01', owner: '潘俊熙', origin: 'PVG', entry: 'YYZ', departure: '2026-07-15', step: 'archive', airline: '已到达', route_id: 'r16', awb: '014-00778899', order: 32000, deposit: 12000, currency: 'RMB', docs: 'u_lin', sales: 'u_amy', archived: true, arrival_log: '07/15 落地 YYZ，CFIA 检查 40 分钟放行，老王送到家。' },
  { id: 'a04', file_no: 'JM-2026-022', tpl: 'na_cn', n: 44, pet: '多多', species: 'cat', breed: '英短', gender: 'M', weight: 4.7, color: '蓝色', birth: '2022-03-03', owner: '彭欣然', origin: 'YYZ', entry: 'PEK', departure: '2026-08-01', step: 'archive', airline: '已到达', route_id: 'r05', awb: '014-00998877', order: 4800, deposit: 1500, currency: 'CAD', docs: 'u_zhou', sales: 'u_amy', archived: true, arrival_log: '08/02 到家，北京免隔离。' },
  { id: 'a05', file_no: 'JM-2026-009', tpl: 'na_hk', type: '随机', n: 45, pet: 'Rocky', species: 'dog', breed: '金毛', gender: 'M', weight: 30.2, color: '金色', birth: '2019-12-12', owner: '袁浩宇', origin: 'YYZ', entry: 'HKG', departure: '2026-08-20', step: 'archive', airline: '不需要', route_id: 'r01', order: 3600, deposit: 3600, currency: 'CAD', docs: 'u_lin', sales: 'u_ben', archived: true, accompany: { needed: false, status: '已添加宠物位置', cabin: '氧舱' }, arrival_log: '08/21 主人随行落地香港，到家。' },
];

export const seedCases: Case[] = specs.map(mkCase);
export const caseById = (cases: Case[], id: string) => cases.find((c) => c.id === id);
export const petEmojiOf = (c: Pick<Case, 'species'>) => SPECIES_EMOJI[c.species] ?? '🐾';
export const petLabel = (c: Pick<Case, 'species' | 'pet_name'>) => `${petEmojiOf(c)} ${c.pet_name}`;
export const cityOf = (code: string) => AIRPORT_CITY[code] ?? code;
