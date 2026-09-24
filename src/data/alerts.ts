import type { Alert, SmsRecord } from '@/types';

/** 紧急变动：航变 + 司机任务变动 + 司机异常，需相关人手动确认；宠物到家后才消失 */
export const seedAlerts: Alert[] = [
  {
    id: 'al01', case_id: 'c14', kind: 'flight_change', title: '航变 · Max（AC26 改期）', detail: 'AC26 10/18 → 10/20，主人已同步；健康证 / 检疫证按新日期办理',
    created_at: '2026-09-12T10:55:00', created_by: 'u_teddy', departure_date: '2026-10-20',
    targets: ['u_rita', 'u_lin', 'u_he', 'u_ben'], confirmations: { u_rita: '2026-09-12T11:20:00', u_lin: '2026-09-12T11:05:00' },
    sms_to: ['u_rita', 'u_lin', 'u_he', 'u_ben'], sms_status: 'mocked', resolved: false,
  },
  {
    id: 'al02', case_id: 'c26', kind: 'flight_change', title: '航变 · Sesame（无仓位）', detail: 'LH471 10/01 无动物仓位；备选 CX829 10/02 或 LH 10/03，需客人确认',
    created_at: '2026-09-15T16:15:00', created_by: 'u_teddy', departure_date: '2026-10-01',
    targets: ['u_rita', 'u_lin', 'u_zhang', 'u_ben'], confirmations: {},
    sms_to: ['u_rita', 'u_lin', 'u_zhang', 'u_ben'], sms_status: 'mocked', resolved: false,
  },
  {
    id: 'al03', case_id: 'c05', kind: 'task_change', title: '任务变动 · Luna 接去医院送寄养', detail: '09/17 医院改约，时间 14:00 → 15:00；司机需确认已看到',
    created_at: '2026-09-16T08:40:00', created_by: 'u_lin', departure_date: '2026-09-23',
    targets: ['u_wang', 'u_rita'], confirmations: { u_rita: '2026-09-16T08:45:00' },
    sms_to: [], sms_status: 'none', resolved: false,
  },
  {
    id: 'al04', case_id: 'c22', kind: 'driver_exception', title: '司机异常 · Momo 接回寄养', detail: '老王：DVP 堵车，预计迟到 25 分钟，已电话通知主人',
    created_at: '2026-09-15T15:10:00', created_by: 'u_wang', departure_date: '2026-09-24',
    targets: ['u_rita', 'u_lin', 'u_amy'], confirmations: { u_lin: '2026-09-15T15:12:00' },
    sms_to: ['u_rita', 'u_lin', 'u_amy'], sms_status: 'mocked', resolved: false,
  },
  {
    id: 'al05', case_id: 'c16', kind: 'accompany_exception', title: '随机异常 · Lucky', detail: '原随机人 10/12 行程取消，需重新找随机人；主人已知晓',
    created_at: '2026-09-15T18:00:00', created_by: 'u_vivian', departure_date: '2026-10-12',
    targets: ['u_rita', 'u_lin', 'u_zhang', 'u_ben'], confirmations: {},
    sms_to: ['u_rita', 'u_lin', 'u_zhang', 'u_ben'], sms_status: 'mocked', resolved: false,
  },
];

export const seedSms: SmsRecord[] = [
  { id: 'sms01', alert_id: 'al01', to_user_ids: ['u_rita', 'u_lin', 'u_he', 'u_ben'], body: '【JMAXPET 紧急】Max JM-2026-056 航变：AC26 10/18 → 10/20，请登录系统确认。', at: '2026-09-12T10:55:10', status: 'mocked', detail: 'Twilio 未配置，demo 模拟发送' },
  { id: 'sms02', alert_id: 'al02', to_user_ids: ['u_rita', 'u_lin', 'u_zhang', 'u_ben'], body: '【JMAXPET 紧急】Sesame JM-2026-068 航变：LH471 10/01 无仓位，请登录系统确认。', at: '2026-09-15T16:15:08', status: 'mocked', detail: 'Twilio 未配置，demo 模拟发送' },
  { id: 'sms03', alert_id: 'al04', to_user_ids: ['u_rita', 'u_lin', 'u_amy'], body: '【JMAXPET 紧急】Momo JM-2026-064 司机异常：堵车 / 预计迟到，请登录系统确认。', at: '2026-09-15T15:10:05', status: 'mocked', detail: 'Twilio 未配置，demo 模拟发送' },
  { id: 'sms04', alert_id: 'al05', to_user_ids: ['u_rita', 'u_lin', 'u_zhang', 'u_ben'], body: '【JMAXPET 紧急】Lucky JM-2026-058 随机异常：随机人行程取消，请登录系统确认。', at: '2026-09-15T18:00:06', status: 'mocked', detail: 'Twilio 未配置，demo 模拟发送' },
];
