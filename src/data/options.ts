// 状态选项 —— 与现有系统 optionMeta 保持一致
export const PRIORITIES = ['紧急', '今天做', '明天做', '未来 7 天', '未来 14 天', '未来 30 天', '即将出发', '暂缓', '待定'] as const;
export const STAGES = ['新建', '办理签证', '等待文件', '落实置', '核机中', '出发', '到达', '完成', '已取消'] as const;
export const NEXT_STEPS = ['调档', '补狂犬', '补疫苗', '第二针', '采血', '等血清', '申请许可证', '约医院', '催医院', '办健康证', '盖章', '最终检查', '订舱', '问司机', '问客人时间', '接宠', '催视频', '收尾款', '送机', '跟航班', '清关', '到家', '结束'] as const;
export const STATUSES = ['进行中', '已完成', '已取消'] as const;
export const WAITINGS = ['', '主人', '医院', '文件', '芯片', '尾款', '航司'] as const;
export const FILES_STATUSES = ['无', '部分', '处理中', '已完成', '已盖章', '错误', '已发'] as const;
export const AIRLINE_CONFIRMED = ['未订', '查询中', '待确认', '已确认', '已改期', '已取消', '已起飞', '已到达', '不需要'] as const;
export const DRIVER_NEEDED = ['需要', '不需要', '待定'] as const;
export const PAYMENT_STATUSES = ['必填费用未收', '已收齐', '部分已收'] as const;
export const FINAL_PAYMENT_STATUSES = ['全部尾款已收齐', '已收齐一部分', '未收齐'] as const;
export const RISK_TAGS = ['时间', '寄养', '芯片', '文件', '健康', '司机'] as const;
export const TASK_TYPES = ['接宠', '送医院', '送 CFIA', '送机', '办文件', '采血'] as const;
export const TASK_STATUSES = ['待开始', '已出发', '已接到', '已到医院', '已完成', '异常'] as const;
export const FLIGHT_CHANGE_TYPES = ['改期', '取消', '当天拒载', '无仓位'] as const;

export const BREED_EMOJI: Record<string, string> = {
  美短: '🐱', 英短: '🐱', 布偶: '🐈', 田园猫: '🐈', 金毛: '🦮', 柯基: '🐕', 柴犬: '🐕', 泰迪: '🐩', 法斗: '🐶', 西高地: '🐶',
};
export const AIRPORT_CITY: Record<string, string> = {
  YYZ: '多伦多', YVR: '温哥华', JFK: '纽约', LAX: '洛杉矶', HKG: '香港', PVG: '上海', PEK: '北京', CAN: '广州',
  FRA: '法兰克福', NRT: '东京', SYD: '悉尼', MEL: '墨尔本', YUL: '蒙特利尔', SFO: '旧金山',
};
