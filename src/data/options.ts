// 状态选项（一期）
export const STAGES = ['新建', '办理文件', '待订舱', '健康证 / 盖章', '出发', '到达', '完成', '已取消'] as const;
export const STATUSES = ['进行中', '已完成', '已取消'] as const;
export const WAITINGS = ['', '主人', '医院', '文件', '芯片', '尾款', '航司', '随机人'] as const;
export const FILES_STATUSES = ['无', '部分', '处理中', '已完成', '已盖章', '错误', '已转交主人'] as const;
export const AIRLINE_CONFIRMED = ['未订', '查询中', '待确认', '已确认', '异常', '已起飞', '已到达', '不需要'] as const;
export const ACCOMPANY_STATUSES = ['未订', '正在查询', '待主人确认', '待航司确认', '已添加宠物位置', '异常'] as const;
export const DRIVER_NEEDED = ['需要', '不需要', '待定'] as const;
export const FINAL_PAYMENT_STATUSES = ['尾款未收齐', '已收齐部分尾款', '已收齐全部尾款', '不适用（随机全款）'] as const;
export const RISK_TAGS = ['时间', '寄养', '芯片', '文件', '健康', '司机'] as const;

export const DRIVER_TASK_TYPES = ['接回寄养', '接去医院送回', '接去医院送寄养', '仅接送', '送机', '接机', 'CFIA 盖章'] as const;
export const OPS_TASK_TYPES = ['约医院', '等待', '办文件'] as const;
export const TASK_TYPES = [...DRIVER_TASK_TYPES, ...OPS_TASK_TYPES] as const;
export const TASK_STATUSES = ['待确认', '已确认', '无法确认', '已出发', '已接到', '已完成', '异常'] as const;
export const DECLINE_REASONS = ['时间不行', '距离太远', '车辆不可用', '其他'] as const;
export const EXCEPTION_REASONS = ['堵车 / 预计迟到', '车辆问题', '联系不上主人', '无法找到地址', '宠物异常', '医院异常', '机场 / Cargo 异常', '其他'] as const;

// 订舱侧航变
export const FLIGHT_CHANGE_TYPES = ['改期', '取消', '当天拒载', '无仓位', '暂定新日期'] as const;
// 操作侧航变
export const OPS_FLIGHT_CHANGE_TYPES = ['本单时间暂定', '客人要求提前', '客人要求延后', '本单取消'] as const;
export const ACCOMPANY_CHANGE_TYPES = ['主人改期', '主人取消', '航司异常', '其他'] as const;

export const FEE_BEARERS = ['公司承担', '客人承担', '暂未确认'] as const;
export const CURRENCIES = ['CAD', 'USD', 'RMB'] as const;
export const CABINS = ['', '客舱', '氧舱'] as const;
export const FINAL_PAYMENT_POINTS = ['清关后', '送机前', '到家后'] as const;

export const GENDERS = ['F', 'FS', 'M', 'MN'] as const;
export const GENDER_LABEL: Record<string, string> = { F: 'F 母（未绝育）', FS: 'FS 母（已绝育）', M: 'M 公（未绝育）', MN: 'MN 公（已绝育）' };

export const SPECIES_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰' };
export const SPECIES_LABEL: Record<string, string> = { dog: '狗', cat: '猫', rabbit: '兔' };

export const AIRPORT_CITY: Record<string, string> = {
  YYZ: '多伦多', YVR: '温哥华', YUL: '蒙特利尔', JFK: '纽约', LAX: '洛杉矶', SFO: '旧金山',
  HKG: '香港', PVG: '上海', PEK: '北京', CAN: '广州', SZX: '深圳',
  FRA: '法兰克福', NRT: '东京', HND: '东京羽田', SYD: '悉尼', MEL: '墨尔本', LHR: '伦敦', DXB: '迪拜',
};
export const AIRPORT_COUNTRY: Record<string, string> = {
  YYZ: '加拿大', YVR: '加拿大', YUL: '加拿大', JFK: '美国', LAX: '美国', SFO: '美国',
  HKG: '中国香港', PVG: '中国', PEK: '中国', CAN: '中国', SZX: '中国',
  NRT: '日本', HND: '日本', SYD: '澳大利亚', MEL: '澳大利亚', LHR: '英国', DXB: '阿联酋', FRA: '德国',
};
/** 后段操作按入境地区划分 */
export const DEST_REGIONS = ['中国大陆', '香港', '加拿大', '美国', '英国', '阿联酋', '日本', '澳大利亚'] as const;
export const AIRPORT_REGION: Record<string, string> = {
  HKG: '香港', PVG: '中国大陆', PEK: '中国大陆', CAN: '中国大陆', SZX: '中国大陆',
  YYZ: '加拿大', YVR: '加拿大', YUL: '加拿大', JFK: '美国', LAX: '美国', SFO: '美国',
  LHR: '英国', DXB: '阿联酋', NRT: '日本', HND: '日本', SYD: '澳大利亚', MEL: '澳大利亚',
};

export const STATIONS = ['YYZ', 'YVR', 'JFK', 'LAX', 'PVG', 'PEK', 'CAN'] as const;
export const ENTRY_COUNTRIES = ['中国', '中国香港', '加拿大', '美国', '英国', '阿联酋', '日本', '澳大利亚'] as const;

export const CRATE_SIZES = ['IATA #100 (53×40×38)', 'IATA #200 (69×51×48)', 'IATA #300 (81×56×58)', 'IATA #400 (91×61×66)', 'IATA #500 (102×69×76)', 'IATA #700 (122×81×89)'];
