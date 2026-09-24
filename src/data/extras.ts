import type { Attachment, CaseLog, ExtraFee, InternalNote, Notification } from '@/types';

/** 附件：demo 示例文件 url 为空（不可下载）；会话内上传的文件用 object URL */
const att = (id: string, case_id: string, category: Attachment['category'], step_key: string, name: string, size: number, by: string, at: string): Attachment =>
  ({ id, case_id, category, step_key, name, size, mime: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', uploaded_by: by, uploaded_at: at, url: '' });

export const seedAttachments: Attachment[] = [
  att('at01', 'c01', 'step', 'chip', 'teddy_microchip.jpg', 412000, 'u_lin', '2026-06-20T10:00:00'),
  att('at02', 'c01', 'step', 'rabies', 'teddy_rabies_cert.pdf', 188000, 'u_lin', '2026-07-02T14:20:00'),
  att('at03', 'c01', 'step', 'combo', 'teddy_dhpp.pdf', 150000, 'u_lin', '2026-07-05T09:10:00'),
  att('at04', 'c01', 'step', 'booking', 'AWB_160-12345678.pdf', 96000, 'u_teddy', '2026-08-28T10:12:00'),
  att('at05', 'c01', 'step', 'health_cert', 'teddy_health_cert.pdf', 240000, 'u_lin', '2026-09-10T16:00:00'),
  att('at06', 'c01', 'step', 'stamp', 'teddy_cfia_endorsed.pdf', 260000, 'u_lin', '2026-09-12T11:30:00'),
  att('at07', 'c01', 'airline', '', 'CX_booking_confirmation.pdf', 88000, 'u_teddy', '2026-08-28T10:15:00'),
  att('at08', 'c01', 'other', '', 'owner_passport_copy.jpg', 520000, 'u_lin', '2026-06-20T10:05:00'),
  att('at09', 'c03', 'step', 'chip', 'mochi_chip.jpg', 380000, 'u_lin', '2026-07-22T10:00:00'),
  att('at10', 'c03', 'step', 'rabies', 'mochi_rabies.pdf', 170000, 'u_lin', '2026-08-01T10:00:00'),
  att('at11', 'c03', 'step', 'health_cert', 'mochi_health_cert.pdf', 230000, 'u_lin', '2026-09-12T15:40:00'),
  att('at12', 'c05', 'step', 'chip', 'luna_chip.jpg', 350000, 'u_lin', '2026-05-26T10:00:00'),
  att('at13', 'c05', 'step', 'rabies', 'luna_rabies_1.pdf', 160000, 'u_lin', '2026-06-05T10:00:00'),
  att('at14', 'c05', 'step', 'rabies2', 'luna_rabies_2.pdf', 160000, 'u_lin', '2026-07-10T10:00:00'),
  att('at15', 'c05', 'step', 'blood', 'luna_favn_report.pdf', 210000, 'u_lin', '2026-08-01T10:00:00'),
  att('at16', 'c05', 'step', 'booking', 'AWB_014-33445566.pdf', 90000, 'u_teddy', '2026-08-29T10:00:00'),
  att('at17', 'c22', 'step', 'health_cert', 'momo_health_cert.pdf', 225000, 'u_lin', '2026-09-15T18:00:00'),
  att('at18', 'c14', 'airline', '', 'AC26_rebooking_1020.pdf', 84000, 'u_teddy', '2026-09-12T10:50:00'),
  att('at19', 'c15', 'step', 'accompany_booking', 'CX829_pet_in_cabin_request.pdf', 76000, 'u_vivian', '2026-09-14T09:30:00'),
];

export const seedNotes: InternalNote[] = [
  { id: 'nt01', case_id: 'c01', text: '主人要求每天发视频，寄养期间请每晚 8 点前发。', by: 'Amy', at: '2026-09-10T09:00:00' },
  { id: 'nt02', case_id: 'c01', text: '狗对陌生人敏感，司机接送前先打电话。', by: '小林', at: '2026-09-10T09:30:00' },
  { id: 'nt03', case_id: 'c03', text: 'CFIA 预约被取消一次，09/16 10:30 重新排上，务必今天盖章。', by: '小林', at: '2026-09-15T16:00:00' },
  { id: 'nt04', case_id: 'c03', text: '如果今天盖不上章，LH 09/20 就赶不上，备选 09/22。', by: 'Rita', at: '2026-09-15T16:10:00' },
  { id: 'nt05', case_id: 'c06', text: 'AC31 09/25 仓位待回复，若无则改 09/27。', by: 'Teddy', at: '2026-09-15T15:00:00' },
  { id: 'nt06', case_id: 'c26', text: 'LH 10/01 无仓位，备选 CX829 10/02 或 LH 10/03，需客人确认。', by: 'Teddy', at: '2026-09-15T16:15:00' },
  { id: 'nt07', case_id: 'c26', text: '客人只接受 10/01–10/03 之间出发。', by: 'Ben', at: '2026-09-15T16:30:00' },
  { id: 'nt08', case_id: 'c25', text: '尾款催了两次未回复，转运先暂停。', by: '小张', at: '2026-09-15T10:00:00' },
  { id: 'nt09', case_id: 'c31', text: '主人在考虑改成全包托运，若改则加订舱 + 送机 + 清关步骤。', by: '小林', at: '2026-09-14T11:00:00' },
  { id: 'nt10', case_id: 'c16', text: '原随机人 10/12 行程取消，重新找。', by: 'Vivian', at: '2026-09-15T18:00:00' },
];

export const seedFees: ExtraFee[] = [
  { id: 'fee01', case_id: 'c01', date: '2026-09-11', desc: '打狂犬 + 芯片', amount: 140, currency: 'CAD', bearer: '客人承担', by: '小林', at: '2026-09-11T15:00:00' },
  { id: 'fee02', case_id: 'c01', date: '2026-09-12', desc: 'CFIA 盖章费', amount: 40, currency: 'CAD', bearer: '公司承担', by: '小林', at: '2026-09-12T12:00:00' },
  { id: 'fee03', case_id: 'c05', date: '2026-09-16', desc: '寄养延长 2 天', amount: 80, currency: 'CAD', bearer: '客人承担', by: '小林', at: '2026-09-16T09:00:00' },
  { id: 'fee04', case_id: 'c22', date: '2026-09-15', desc: '买猫粮', amount: 59.45, currency: 'CAD', bearer: '暂未确认', by: '小林', at: '2026-09-15T18:30:00' },
  { id: 'fee05', case_id: 'c25', date: '2026-09-13', desc: '香港清关代理费', amount: 1200, currency: 'RMB', bearer: '客人承担', by: '小张', at: '2026-09-13T12:00:00' },
];

export const seedNotifications: Notification[] = [
  { id: 'n01', to_user_id: 'u_wang', kind: 'reminder', title: '48 小时提醒 · 接去医院送回', body: '09/18 09:30 糯米（JM-2026-053），177 Bay St → Downtown Vet Clinic', case_id: 'c11', task_id: 't07', created_at: '2026-09-16T08:00:00', read: false },
  { id: 'n02', to_user_id: 'u_wang', kind: 'reminder', title: '24 小时提醒 · CFIA 盖章', body: '09/17 09:00 Momo（JM-2026-064），带健康证原件', case_id: 'c22', task_id: 't03', created_at: '2026-09-16T08:00:00', read: false },
  { id: 'n03', to_user_id: 'u_wang', kind: 'alert', title: '任务变动 · Luna 接去医院送寄养', body: '09/17 时间 14:00 → 15:00，请在紧急变动里确认', case_id: 'c05', task_id: 't04', alert_id: 'al03', created_at: '2026-09-16T08:40:00', read: false },
  { id: 'n04', to_user_id: 'u_wang', kind: 'reminder', title: '当天提醒 · 接回寄养', body: '今天 10:00 Luna（JM-2026-046），135 Bay St → 寄养点', case_id: 'c05', task_id: 't01', created_at: '2026-09-16T07:00:00', read: true },
  { id: 'n05', to_user_id: 'u_li', kind: 'reminder', title: '24 小时提醒 · 送机', body: '09/17 08:00 豆豆（JM-2026-038）送机 YVR 货站，AC25', case_id: 'c02', task_id: 't05', created_at: '2026-09-16T08:00:00', read: false },
  { id: 'n06', to_user_id: 'u_li', kind: 'reminder', title: '48 小时提醒 · 接回寄养', body: '09/18 13:00 Bobo（JM-2026-063），大型犬带 #500 箱', case_id: 'c21', task_id: 't08', created_at: '2026-09-16T08:00:00', read: false },
  { id: 'n07', to_user_id: 'u_teddy', kind: 'task', title: '订舱任务 · Sesame', body: 'LH 10/01 无仓位，请查 CX829 10/02 或 LH 10/03 并回复', case_id: 'c26', created_at: '2026-09-15T16:20:00', read: false },
  { id: 'n08', to_user_id: 'u_teddy', kind: 'task', title: '订舱任务 · 旺财', body: 'AC31 09/25 仓位待航司回复，今天需要结果', case_id: 'c06', created_at: '2026-09-16T08:30:00', read: false },
  { id: 'n09', to_user_id: 'u_lin', kind: 'system', title: '步骤延误 · Mochi', body: 'CFIA 盖章 计划 09/14，已延误 2 天', case_id: 'c03', created_at: '2026-09-16T06:00:00', read: false },
  { id: 'n10', to_user_id: 'u_zhang', kind: 'system', title: '待收尾款 · Peanut', body: 'JM-2026-067 清关完成 3 天，尾款还没收，主人未回复', case_id: 'c25', created_at: '2026-09-16T06:00:00', read: false },
  { id: 'n11', to_user_id: 'u_zhang', kind: 'system', title: '已落地 · Biscuit', body: 'CX865 已落地 HKG，代理提货中，等海关放行', case_id: 'c24', created_at: '2026-09-15T06:30:00', read: true },
  { id: 'n12', to_user_id: 'u_rita', kind: 'alert', title: '航变 · Sesame（无仓位）', body: 'LH471 10/01 无动物仓位，请在紧急变动里确认', case_id: 'c26', alert_id: 'al02', created_at: '2026-09-15T16:15:00', read: false },
  { id: 'n13', to_user_id: 'u_rita', kind: 'sms', title: '短信已发送 · Sesame 航变', body: '已向 Rita、小林、小张、Ben 发送紧急短信（demo 模拟）', case_id: 'c26', alert_id: 'al02', created_at: '2026-09-15T16:15:08', read: true },
  { id: 'n14', to_user_id: 'u_vivian', kind: 'system', title: '随机人备注 2 天未更新 · Kiki', body: '上次更新 09/14，请补充最新进度', case_id: 'c15', created_at: '2026-09-16T09:00:00', read: false },
  { id: 'n15', to_user_id: 'u_amy', kind: 'alert', title: '司机异常 · Momo 接回寄养', body: '老王：堵车预计迟到 25 分钟；请在紧急变动里确认', case_id: 'c22', alert_id: 'al04', created_at: '2026-09-15T15:10:00', read: false },
  { id: 'n16', to_user_id: 'u_cai', kind: 'system', title: '额外费用 · Momo', body: '小林添加：09/15 买猫粮 59.45 CAD（暂未确认由谁承担）', case_id: 'c22', created_at: '2026-09-15T18:30:00', read: false },
];

let i = 0;
const l = (case_id: string, at: string, actor: string, action: string): CaseLog => ({ id: `l${String(++i).padStart(3, '0')}`, case_id, at, actor, action });

export const seedLogs: CaseLog[] = [
  l('c01', '2026-06-12T09:00:00', '系统', '由销售接单 so01（Amy）录单新建 Case，模板「加拿大 & 美国 → 香港（猫 & 狗）」'),
  l('c01', '2026-08-28T10:12:00', 'Teddy', '填写 AWB 160-12345678，航班 CX829 09/18 已确认，预计出发日期 → 实际出发日期'),
  l('c01', '2026-09-10T11:05:00', '老王', '完成任务：接回寄养（107 Bay St → 寄养点）'),
  l('c01', '2026-09-11T15:00:00', '小林', '添加额外费用：打狂犬 + 芯片 140 CAD（客人承担）'),
  l('c01', '2026-09-12T11:30:00', '小林', '上传附件 teddy_cfia_endorsed.pdf，完成步骤「CFIA / USDA 盖章」'),
  l('c01', '2026-09-15T14:00:00', '小林', '创建司机任务：送机 09/17 20:30，指派 老王'),
  l('c03', '2026-09-11T14:40:00', '小林', '医院健康证已取回，预约 CFIA 09/14'),
  l('c03', '2026-09-14T09:00:00', '系统', 'CFIA 预约被取消，步骤「CFIA / USDA 盖章」延误'),
  l('c03', '2026-09-14T09:20:00', 'Rita', '加风险标签 时间 / 文件'),
  l('c03', '2026-09-15T16:00:00', '小林', 'CFIA 重新预约 09/16 10:30'),
  l('c05', '2026-09-15T17:30:00', '小林', '创建司机任务：接回寄养 09/16 10:00、接去医院送寄养 09/17 14:00，指派 老王'),
  l('c05', '2026-09-16T08:40:00', '小林', '修改任务「接去医院送寄养 09/17」时间 14:00 → 15:00，已同步司机紧急变动'),
  l('c06', '2026-09-15T15:00:00', 'Teddy', 'AC31 09/25 仓位申请已提交，等航司回复'),
  l('c14', '2026-09-12T10:55:00', 'Teddy', '标记航变：改期，AC26 10/18 → 10/20，旧航班保留为「已替代」'),
  l('c14', '2026-09-12T10:55:00', '系统', '航变触发紧急变动 al01，短信通知 Rita、小林、小何、Ben'),
  l('c22', '2026-09-15T15:10:00', '老王', '任务「接回寄养 09/15」上报异常：堵车 / 预计迟到'),
  l('c22', '2026-09-15T16:10:00', '老王', '完成任务：接回寄养（254 Bay St → 寄养点）'),
  l('c22', '2026-09-15T18:00:00', '小林', '健康证已签发（09/15），明天送 CFIA'),
  l('c23', '2026-09-16T08:45:00', '老王', '完成任务：送机（寄养点 → YYZ 货站）'),
  l('c23', '2026-09-16T08:46:00', '系统', '司机完成「送机」，当前步骤 → 航班跟踪'),
  l('c24', '2026-09-15T06:35:00', '系统', 'CX865 已落地 HKG，航司状态改为 已到达'),
  l('c25', '2026-09-13T12:00:00', '小张', '清关完成，等尾款后转运'),
  l('c25', '2026-09-15T10:00:00', '小张', '第二次催收尾款，主人未回复'),
  l('c26', '2026-09-15T16:15:00', 'Teddy', '标记航变：无仓位，LH471 10/01；触发紧急变动 al02'),
  l('c04', '2026-09-13T15:00:00', '小周', 'USDA 认可兽医健康证已签发，准备 VEHCS 提交'),
  l('c04', '2026-09-14T09:10:00', 'Teddy', 'CX 要求补短鼻犬承诺书，航司状态改为 待确认'),
  l('c12', '2026-09-10T11:00:00', '小周', '芯片扫描读不出，通知主人带去医院复查'),
  l('c15', '2026-09-14T09:30:00', 'Vivian', '向 CX 提交宠物位置申请，随机状态 → 待航司确认'),
  l('c16', '2026-09-15T18:00:00', 'Vivian', '随机状态 → 异常：随机人行程取消；触发紧急变动 al05'),
  l('c31', '2026-09-14T11:00:00', '小林', '主人考虑改为全包托运，暂不改类型'),
];
