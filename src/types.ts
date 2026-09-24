import type {
  STAGES, STATUSES, WAITINGS, FILES_STATUSES, AIRLINE_CONFIRMED, ACCOMPANY_STATUSES, DRIVER_NEEDED,
  FINAL_PAYMENT_STATUSES, RISK_TAGS, TASK_TYPES, TASK_STATUSES, FLIGHT_CHANGE_TYPES, OPS_FLIGHT_CHANGE_TYPES,
  EXCEPTION_REASONS, DECLINE_REASONS, FEE_BEARERS, CURRENCIES, CABINS, FINAL_PAYMENT_POINTS,
} from '@/data/options';

export type Stage = (typeof STAGES)[number];
export type CaseStatus = (typeof STATUSES)[number];
export type Waiting = (typeof WAITINGS)[number];
export type FilesStatus = (typeof FILES_STATUSES)[number];
export type AirlineConfirmed = (typeof AIRLINE_CONFIRMED)[number];
export type AccompanyStatus = (typeof ACCOMPANY_STATUSES)[number];
export type DriverNeeded = (typeof DRIVER_NEEDED)[number];
export type FinalPaymentStatus = (typeof FINAL_PAYMENT_STATUSES)[number];
export type RiskTag = (typeof RISK_TAGS)[number];
export type TaskType = (typeof TASK_TYPES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type FlightChangeType = (typeof FLIGHT_CHANGE_TYPES)[number];
export type OpsFlightChangeType = (typeof OPS_FLIGHT_CHANGE_TYPES)[number];
export type ExceptionReason = (typeof EXCEPTION_REASONS)[number];
export type DeclineReason = (typeof DECLINE_REASONS)[number];
export type FeeBearer = (typeof FEE_BEARERS)[number];
export type Currency = (typeof CURRENCIES)[number];
export type Cabin = (typeof CABINS)[number];
export type FinalPaymentPoint = (typeof FINAL_PAYMENT_POINTS)[number];

export type Species = 'dog' | 'cat' | 'rabbit';
export type Gender = 'F' | 'FS' | 'M' | 'MN';
export type CaseType = '托运' | '随机' | '仅代办文件';
export type ServiceScope = '全包' | '仅订舱';

// ---------- 角色 / 权限 ----------
export type RoleKey = 'sales' | 'admin' | 'ops_docs' | 'booking_cargo' | 'booking_accompany' | 'ops_post' | 'finance' | 'driver';
export type SectionKey = 'pet' | 'owner' | 'route' | 'docs' | 'flight' | 'driver' | 'foster' | 'log' | 'payment';
export type PageKey = 'dashboard' | 'todo' | 'cases' | 'accompany' | 'calendar' | 'alerts' | 'routes' | 'archive' | 'sales' | 'permissions' | 'history';
export type CaseScope = 'all' | 'assigned_docs' | 'booking_cargo' | 'booking_accompany' | 'post_regions' | 'driver' | 'none';

export interface User {
  id: string;
  name: string;
  role: RoleKey;
  title: string;
  color: string;
  phone: string; // 短信通知用
  station?: string; // 司机站点
  regions?: string[]; // 后段操作负责的入境地区
}

export interface RoleDef {
  key: RoleKey;
  label: string;
  description: string;
  pages: PageKey[];
  homePage: PageKey;
  scope: CaseScope;
  mobile: boolean;
  readOnly?: boolean;
}

export interface SectionPerm { view: boolean; edit: boolean }
export type PermissionMatrix = Record<RoleKey, Record<SectionKey, SectionPerm>>;

// ---------- Workflow ----------
export interface WorkflowStep {
  key: string;
  label: string;
  owner_role: RoleKey;
  offset_days: number; // 相对 departure_date，负数为出发前
  offset_rule: string;
  required_docs: string[]; // 非空 = 需上传附件才能完成
  description: string;
}
export interface WorkflowTemplate {
  id: string;
  name: string;
  short: string;
  origin_region: 'CN' | 'NA';
  origin_countries: string[];
  dest_country: string;
  species: Species[];
  stamp_authority: string;
  steps: WorkflowStep[]; // 文件部分（含订舱）
  notes?: string;
  links?: string[];
}

export type StepStatus = '未开始' | '进行中' | '完成' | '延误';
export interface CaseStep {
  key: string;
  label: string;
  owner_role: RoleKey;
  planned_date: string; // yyyy-MM-dd
  status: StepStatus;
  required_docs: string[];
  missing_docs: string[];
  description: string;
  offset_rule: string;
  completed_at?: string;
  completed_by?: string;
}

// ---------- Case ----------
export type FlightStatus = 'active' | 'superseded' | 'cancelled';
export interface Flight {
  id: string;
  airline: string;
  flight_no: string;
  from_code: string;
  to_code: string;
  dep_time: string; // ISO datetime 本地
  arr_time: string;
  awb: string;
  confirmed: boolean;
  status: FlightStatus;
  note: string; // 航变说明（被替代 / 取消原因）
  created_at: string;
}
export interface FosterDaily { date: string; note: string; by: string }

export interface Case {
  id: string;
  file_no: string;
  case_type: CaseType;
  service_scope: ServiceScope;
  template_id: string;
  archived: boolean;
  created_at: string;
  sales_order_id: string;
  // 宠物
  pet_name: string;
  species: Species;
  breed: string;
  birth_date: string;
  gender: Gender;
  weight: number;
  color: string;
  chip_no: string;
  crate_size: string;
  pet_notes: string;
  // 寄养
  foster_start: string;
  foster_end: string;
  foster_notes: string;
  foster_daily: FosterDaily[];
  // 主人
  owner_name: string;
  passport_no: string;
  owner_phone_cn: string;
  owner_phone_intl: string;
  owner_addr_cn: string;
  owner_addr_intl: string;
  owner_email: string;
  // 路线
  origin_country: string;
  origin_city: string;
  origin: string; // 出发机场 / 站点代码
  entry_airport: string; // 入境机场代码
  final_dest: string; // 最终目的地
  dest_country: string;
  dest_region: string; // 后段操作按此划分
  route: string;
  departure_date: string; // 预计出发日期；订舱确认后为实际出发日期
  departure_confirmed: boolean;
  // 运营
  status: CaseStatus;
  waiting: Waiting;
  risk_tags: RiskTag[];
  current_step_key: string;
  timeline: CaseStep[];
  final_payment_point: FinalPaymentPoint;
  // 文件
  files_status: FilesStatus;
  health_cert_issued: string;
  vacc_rabies_1: string;
  vacc_rabies_2: string;
  vacc_combo: string; // FVRCP / DHPP
  vacc_blood: string; // 采血
  vacc_notes: string;
  // 航班（托运）
  airline_confirmed: AirlineConfirmed;
  flights: Flight[];
  flight_change: OpsFlightChangeType | '';
  flight_change_note: string;
  booking_notified: boolean; // 已转给订舱
  // 随机
  accompany_needed: boolean;
  accompany_person: string;
  accompany_status: AccompanyStatus;
  accompany_notes: string;
  accompany_notes_updated: string;
  cabin: Cabin;
  // 后段
  docs_handed_to_owner: boolean;
  passport_sent: boolean;
  arrived_home: boolean;
  home_date: string;
  driver_needed: DriverNeeded;
  // 收款（只记录状态、金额与备注，不记账）
  order_amount: number;
  deposit_amount: number;
  final_amount: number;
  currency: Currency;
  final_payment_status: FinalPaymentStatus;
  payment_notes: string;
  // 日志文本
  sales_handover: string;
  pickup_log: string;
  foster_log: string;
  arrival_log: string;
  // 负责人
  ops_docs_id: string;
  booking_id: string;
  ops_post_id: string;
  sales_id: string;
}

// ---------- 任务 ----------
export interface Task {
  id: string;
  case_id: string;
  type: TaskType;
  assignee_id: string;
  date: string;
  time_start: string;
  time_end: string;
  pickup_addr: string;
  pickup_phone: string;
  dest_addr: string;
  dest_phone: string;
  notes: string;
  status: TaskStatus;
  decline_reason: string;
  exception_reason: string;
  exception_note: string;
  created_by: string;
  reminded: ('48h' | '24h' | 'today')[];
  change_note: string; // 操作部最近一次修改说明
  change_acked: boolean; // 司机已确认看到变动
  completed_at?: string;
}

// ---------- 通知 / 日志 ----------
export type NotificationKind = 'flight_change' | 'reminder' | 'task' | 'system' | 'alert' | 'sms';
export interface Notification {
  id: string;
  to_user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  case_id?: string;
  task_id?: string;
  alert_id?: string;
  created_at: string;
  read: boolean;
}

export interface CaseLog {
  id: string;
  case_id: string;
  at: string;
  actor: string;
  action: string;
}

export interface InternalNote {
  id: string;
  case_id: string;
  text: string;
  by: string;
  at: string;
}

export interface ExtraFee {
  id: string;
  case_id: string;
  date: string;
  desc: string;
  amount: number;
  currency: Currency;
  bearer: FeeBearer;
  by: string;
  at: string;
}

export type AttachmentCategory = 'step' | 'other' | 'airline';
export interface Attachment {
  id: string;
  case_id: string;
  category: AttachmentCategory;
  step_key: string; // category=step 时
  name: string;
  size: number;
  mime: string;
  uploaded_by: string;
  uploaded_at: string;
  url: string; // demo：object URL 或空
}

// ---------- 紧急变动 ----------
export type AlertKind = 'flight_change' | 'ops_flight_change' | 'task_change' | 'driver_exception' | 'driver_decline' | 'accompany_exception';
export interface Alert {
  id: string;
  case_id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  created_at: string;
  created_by: string;
  departure_date: string;
  targets: string[]; // 需要确认的人
  confirmations: Record<string, string>; // userId → ISO
  sms_to: string[];
  sms_status: 'sent' | 'mocked' | 'failed' | 'none';
  resolved: boolean; // 宠物到家后自动消失
}

export interface SmsRecord {
  id: string;
  alert_id: string;
  to_user_ids: string[];
  body: string;
  at: string;
  status: 'sent' | 'mocked' | 'failed';
  detail: string;
}

// ---------- 销售接单 ----------
export interface SalesOrder {
  id: string;
  sales_id: string;
  created_at: string;
  owner_wechat_name: string;
  owner_wechat_id: string;
  origin_text: string;
  dest_text: string;
  price_text: string; // "8000/18000"
  currency: Currency;
  order_status_text: string;
  caution: string;
  pet_name: string;
  case_id: string; // 操作部录单后关联
}

export interface Route {
  id: string;
  origin: string;
  dest: string;
  airline: string;
  airline_code: string;
  flight_no: string;
  type: '直飞' | '中转';
  via?: string;
  second_leg?: string;
  dep_time: string;
  arr_time: string;
  arr_day_offset: number;
  weekdays: string;
  restrictions: string[];
  notes: string;
}

export interface ImpactItem { kind: 'driver' | 'health_cert' | 'foster' | 'docs'; level: 'warn' | 'danger' | 'info'; text: string }
export interface ImpactReport {
  case_id: string;
  change_type: string;
  old_date: string;
  new_date: string;
  items: ImpactItem[];
  notified: string[];
  created_at: string;
}
