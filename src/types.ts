import type {
  PRIORITIES, STAGES, NEXT_STEPS, STATUSES, WAITINGS, FILES_STATUSES, AIRLINE_CONFIRMED, DRIVER_NEEDED,
  PAYMENT_STATUSES, FINAL_PAYMENT_STATUSES, RISK_TAGS, TASK_TYPES, TASK_STATUSES, FLIGHT_CHANGE_TYPES,
} from '@/data/options';

export type Priority = (typeof PRIORITIES)[number];
export type Stage = (typeof STAGES)[number];
export type NextStep = (typeof NEXT_STEPS)[number];
export type CaseStatus = (typeof STATUSES)[number];
export type Waiting = (typeof WAITINGS)[number];
export type FilesStatus = (typeof FILES_STATUSES)[number];
export type AirlineConfirmed = (typeof AIRLINE_CONFIRMED)[number];
export type DriverNeeded = (typeof DRIVER_NEEDED)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type FinalPaymentStatus = (typeof FINAL_PAYMENT_STATUSES)[number];
export type RiskTag = (typeof RISK_TAGS)[number];
export type TaskType = (typeof TASK_TYPES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type FlightChangeType = (typeof FLIGHT_CHANGE_TYPES)[number];

// ---------- 角色 / 权限 ----------
export type RoleKey = 'admin' | 'ops_docs' | 'ops_logistics' | 'booking' | 'driver';
export type SectionKey = 'pet' | 'owner' | 'route' | 'docs' | 'flight' | 'driver' | 'foster' | 'log' | 'payment';
export type PageKey = 'dashboard' | 'todo' | 'cases' | 'calendar' | 'routes' | 'permissions' | 'archive';
export type CaseScope = 'all' | 'assigned' | 'booking' | 'driver';

export interface User {
  id: string;
  name: string;
  role: RoleKey;
  title: string;
  color: string; // 头像底色
  station?: string; // 司机站点
}

export interface RoleDef {
  key: RoleKey;
  label: string;
  description: string;
  pages: PageKey[];
  homePage: PageKey;
  scope: CaseScope;
  mobile: boolean;
}

export interface SectionPerm { view: boolean; edit: boolean }
export type PermissionMatrix = Record<RoleKey, Record<SectionKey, SectionPerm>>;

// ---------- Workflow ----------
export interface WorkflowStep {
  key: string;
  label: string;
  owner_role: RoleKey;
  offset_days: number; // 相对 departure_date，负数为出发前
  offset_rule: string; // 人类可读规则
  required_docs: string[];
  description: string;
}
export interface WorkflowTemplate {
  id: string;
  name: string;
  short: string;
  origin_country: string;
  dest_country: string;
  mode: '托运' | '随行';
  stamp_authority: string;
  steps: WorkflowStep[];
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
}

// ---------- Case ----------
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
}
export interface FosterDaily { date: string; note: string; by: string }

export interface Case {
  id: string;
  file_no: string;
  template_id: string;
  archived: boolean;
  created_at: string;
  // 宠物
  pet_name: string;
  species: 'dog' | 'cat';
  breed: string;
  birth_date: string;
  gender: '公' | '母';
  weight: number;
  color: string;
  chip_no: string;
  crate_no: string;
  // 寄养
  foster_start: string;
  foster_end: string;
  foster_med_count: number;
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
  origin: string;
  dest_country: string;
  dest_region: string;
  route: string;
  departure_date: string;
  // 运营
  stage: Stage;
  next_step: NextStep;
  deadline: string;
  waiting: Waiting;
  priority: Priority;
  status: CaseStatus;
  risk_tags: RiskTag[];
  current_step_key: string;
  timeline: CaseStep[];
  // 文件
  files_status: FilesStatus;
  expected_vaccine_date: string;
  expected_blood_draw_date: string;
  expected_health_cert_date: string;
  health_cert_issued: string; // 健康证签发日（空=未办）
  // 疫苗
  vacc_rabies_1: string;
  vacc_rabies_2: string;
  vacc_fvrcp: string;
  vacc_favn: string;
  vacc_ihc: string;
  vacc_notes: string;
  // 航班
  airline_confirmed: AirlineConfirmed;
  flights: Flight[];
  // 司机
  driver_needed: DriverNeeded;
  // 收款情况（只记录，不做提醒、不管明细）
  payment_status: PaymentStatus;
  final_payment_status: FinalPaymentStatus;
  payment_notes: string;
  // 日志文本
  sales_handover: string;
  pickup_log: string;
  foster_log: string;
  arrival_log: string;
  notes_extra: string;
  // 负责人
  ops_docs_id: string;
  ops_logistics_id: string;
  booking_id: string;
}

// ---------- 任务 / 通知 / 日志 ----------
export interface Task {
  id: string;
  case_id: string;
  type: TaskType;
  assignee_id: string;
  date: string;
  time_start: string;
  time_end: string;
  pickup_addr: string;
  dest_addr: string;
  notes: string;
  status: TaskStatus;
  owner_confirmed: boolean;
  driver_confirmed: boolean;
  created_by: string;
  reminded: ('48h' | '24h' | 'today')[];
}

export type NotificationKind = 'flight_change' | 'reminder' | 'task' | 'system';
export interface Notification {
  id: string;
  to_user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  case_id?: string;
  task_id?: string;
  created_at: string; // ISO
  read: boolean;
}

export interface CaseLog {
  id: string;
  case_id: string;
  at: string; // ISO
  actor: string;
  action: string;
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
  change_type: FlightChangeType;
  old_date: string;
  new_date: string;
  items: ImpactItem[];
  notified: string[]; // user ids
  created_at: string;
}
