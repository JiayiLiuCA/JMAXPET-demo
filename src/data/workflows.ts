import type { WorkflowStep, WorkflowTemplate } from '@/types';

/**
 * 文件办理 workflow 模板（按客户文档整理）。
 * 每步 offset_days 相对出发日（负数 = 出发前 N 天）；required_docs 非空 = 该步需上传附件后才能点完成。
 * 模板只含"文件 + 订舱"部分；送机 / 清关 / 收尾款 / 到家 等收尾步骤按 Case 类型（托运 / 随机 / 仅代办文件）
 * 与服务范围（全包 / 仅订舱）在 lib/workflow.ts 里拼接。
 */
const D = 'ops_docs' as const;
const B = 'booking_cargo' as const;

const step = (key: string, label: string, offset_days: number, offset_rule: string, required_docs: string[] = [], description = '', owner_role: WorkflowStep['owner_role'] = D): WorkflowStep =>
  ({ key, label, owner_role, offset_days, offset_rule, required_docs, description });

const chip = (d: number) => step('chip', '芯片', d, `出发前 ${-d} 天`, ['芯片植入证明 / 扫描照片'], '扫描确认 15 位 ISO 芯片，格式 xxx-xxx-xxx-xxx-xxx');
const rabies = (d: number, label = '狂犬疫苗', desc = '疫苗有效期需覆盖出发日') => step('rabies', label, d, `出发前 ${-d} 天`, ['狂犬疫苗证书'], desc);
const rabies2 = (d: number) => step('rabies2', '第二针狂犬', d, `第一针过期前`, ['第二针狂犬证书'], '第一针过期前接种');
const combo = (d: number, label: string) => step('combo', label, d, `出发前 ${-d} 天`, ['联合疫苗证书'], '');
const blood = (d: number, desc: string) => step('blood', '采血', d, `出发前 ${-d} 天`, ['采血单 / 血清报告'], desc);
const booking = (d: number) => step('booking', '订舱', d, `出发前 ${-d} 天`, ['AWB / 航司确认件'], '前期文件办完后转给订舱同事', B);
const health = (d: number, rule: string) => step('health_cert', '健康证', d, rule, ['健康证（兽医签发）'], '');
const stamp = (d: number, rule = '健康证后立即') => step('stamp', '盖章', d, rule, ['盖章后的健康证'], '加拿大 CFIA，美国 USDA');
const quarantine = (d: number) => step('quarantine_cert', '出入境检疫证', d, '出发前 13 天内', ['出入境检疫证'], '随时确认宠物位置');

export const workflows: WorkflowTemplate[] = [
  // ---------- 出发地：中国 ----------
  {
    id: 'cn_ca', name: '中国 → 加拿大（猫 & 狗）', short: '中→加', origin_region: 'CN', origin_countries: ['中国'], dest_country: '加拿大', species: ['cat', 'dog', 'rabbit'], stamp_authority: '中国海关',
    steps: [chip(-40), rabies(-35, '狂犬（未过期）'), booking(-25), quarantine(-10)],
  },
  {
    id: 'cn_us_cat', name: '中国 → 美国（猫）', short: '中→美 猫', origin_region: 'CN', origin_countries: ['中国'], dest_country: '美国', species: ['cat'], stamp_authority: '中国海关',
    steps: [chip(-40), rabies(-35, '狂犬（未过期）'), booking(-25), quarantine(-10)],
  },
  {
    id: 'cn_us_dog', name: '中国 → 美国（狗，正常文件）', short: '中→美 狗', origin_region: 'CN', origin_countries: ['中国'], dest_country: '美国', species: ['dog'], stamp_authority: '中国海关',
    steps: [
      chip(-120), rabies(-110), blood(-85, '狂犬打完至少 21 天后采血'),
      step('kennel_apply', '申请动物房', -60, '出发前 60 天', ['动物房申请回执'], ''),
      step('cdc_vet', '兽医签署 CDC 文件', -45, '出发前 45 天', ['CDC 文件（兽医签署）'], ''),
      step('screwworm', 'Screwworm 认证', -30, '出发前 30 天', ['Screwworm 认证'], ''),
      booking(-25), quarantine(-10),
      step('cdc_permit', 'CDC 入境许可', -8, '出发前 8 天', ['CDC 入境许可'], ''),
    ],
  },
  {
    id: 'cn_us_dog_return', name: '中国 → 美国（狗，返美文件）', short: '中→美 返美', origin_region: 'CN', origin_countries: ['中国'], dest_country: '美国', species: ['dog'], stamp_authority: '中国海关',
    steps: [
      chip(-40), rabies(-35, '美国狂犬', '在美接种的狂犬疫苗证书'),
      step('return_docs', '返美文件', -30, '出发前 30 天', ['返美文件'], ''),
      step('screwworm', 'Screwworm 认证', -28, '出发前 28 天', ['Screwworm 认证'], ''),
      booking(-25),
      step('cdc_permit', 'CDC 入境许可', -8, '出发前 8 天', ['CDC 入境许可'], ''),
    ],
  },
  // ---------- 出发地：北美 ----------
  {
    id: 'na_cn', name: '加拿大 & 美国 → 中国大陆（猫 & 狗）', short: '北美→中国', origin_region: 'NA', origin_countries: ['加拿大', '美国'], dest_country: '中国', species: ['cat', 'dog', 'rabbit'], stamp_authority: 'CFIA / USDA',
    steps: [chip(-120), rabies(-110, '第一针狂犬'), rabies2(-75), blood(-70, '第二针当天或第二针打完 3 周后 4 个月内'), booking(-25), health(-10, '航班出发前 13 天内'), stamp(-6)],
  },
  {
    id: 'na_hk', name: '加拿大 & 美国 → 香港（猫 & 狗）', short: '北美→香港', origin_region: 'NA', origin_countries: ['加拿大', '美国'], dest_country: '中国香港', species: ['cat', 'dog', 'rabbit'], stamp_authority: 'CFIA / USDA',
    steps: [chip(-60), rabies(-50), combo(-48, 'FVRCP / DHPP'), booking(-25), health(-10, '航班出发前 13 天内'), stamp(-6)],
  },
  {
    id: 'ca_us', name: '加拿大 → 美国（猫 & 狗）', short: '加→美', origin_region: 'NA', origin_countries: ['加拿大'], dest_country: '美国', species: ['cat', 'dog'], stamp_authority: '无需盖章',
    steps: [rabies(-30, '有效期内狂犬'), booking(-20), step('cdc_permit', 'CDC 入境许可', -10, '出发前 10 天', ['CDC 入境许可'], '犬只需要，猫可跳过')],
  },
  {
    id: 'na_uk_cat', name: '加拿大 & 美国 → 英国（猫）', short: '北美→英国 猫', origin_region: 'NA', origin_countries: ['加拿大', '美国'], dest_country: '英国', species: ['cat'], stamp_authority: 'CFIA / USDA',
    steps: [chip(-45), rabies(-40, '狂犬', '接种 21 天后方可出发'), booking(-25), health(-8, '出发前 10 天内（美国：出发前 5 天内）'), stamp(-5)],
  },
  {
    id: 'na_uk_dog', name: '加拿大 & 美国 → 英国（狗）', short: '北美→英国 狗', origin_region: 'NA', origin_countries: ['加拿大', '美国'], dest_country: '英国', species: ['dog'], stamp_authority: 'CFIA / USDA',
    steps: [chip(-45), rabies(-40, '狂犬', '接种 21 天后方可出发'), booking(-25), step('deworm', '绦虫驱虫', -4, '航班出发前 5 天内', ['驱虫记录（含 Praziquantel）'], '需包含 Praziquantel'), health(-4, '出发前 5 天内'), stamp(-3)],
  },
  {
    id: 'na_dxb_cat', name: '加拿大 & 美国 → 迪拜（猫）', short: '北美→迪拜 猫', origin_region: 'NA', origin_countries: ['加拿大', '美国'], dest_country: '阿联酋', species: ['cat'], stamp_authority: 'CFIA / USDA',
    steps: [chip(-90), rabies(-85), combo(-83, 'FVRCP'), blood(-60, '狂犬打完至少 21 天后采血'), step('uae_permit', '申请 UAE 许可', -40, '出发前 40 天', ['UAE 进口许可'], ''), booking(-25), step('deworm', '体内驱虫', -13, '航班出发前 14 天', ['驱虫记录（含 Praziquantel）'], ''), health(-2, '航班出发前 48 小时（美国：提前 9 天）'), stamp(-1)],
  },
  {
    id: 'na_dxb_dog', name: '加拿大 & 美国 → 迪拜（狗）', short: '北美→迪拜 狗', origin_region: 'NA', origin_countries: ['加拿大', '美国'], dest_country: '阿联酋', species: ['dog'], stamp_authority: 'CFIA / USDA',
    steps: [chip(-90), rabies(-85), combo(-83, 'DHPP + Lepto'), blood(-60, '狂犬打完至少 21 天后采血'), step('uae_permit', '申请 UAE 许可', -40, '出发前 40 天', ['UAE 进口许可'], ''), booking(-25), step('deworm', '体内驱虫', -13, '航班出发前 14 天', ['驱虫记录（含 Praziquantel）'], ''), health(-2, '航班出发前 48 小时（美国：提前 9 天）'), stamp(-1)],
  },
  {
    id: 'ca_jp', name: '加拿大 → 日本（猫 & 狗）', short: '加→日本', origin_region: 'NA', origin_countries: ['加拿大'], dest_country: '日本', species: ['cat', 'dog'], stamp_authority: 'CFIA',
    steps: [chip(-260), rabies(-250, '第一针狂犬'), rabies2(-220), blood(-210, '第二针当天或第二针打完 3 周后 4 个月内'), step('aqs', 'AQS 申报', -45, '出发前至少 40 天', ['AQS 申报回执'], ''), step('wait180', '180 天等待期', -30, '采血当天开始算', [], '等待期结束才能出发'), booking(-25), health(-8, '出发前 9 天内'), stamp(-5)],
  },
  {
    id: 'na_au', name: '加拿大 & 美国 → 澳洲（猫 & 狗）', short: '北美→澳洲', origin_region: 'NA', origin_countries: ['加拿大', '美国'], dest_country: '澳大利亚', species: ['cat', 'dog'], stamp_authority: 'CFIA / USDA',
    steps: [chip(-220), rabies(-210), step('other_docs', '其他文件（按官网步骤）', -100, '按官网', [], '猫狗、绝育与否差别大，按官网 step-by-step guide 办理，文件放在"其他文件"里'), booking(-30), health(-5, '出发前 5 天内'), stamp(-3)],
    notes: '澳洲比较复杂，猫狗有很大区别，绝育和没绝育也有很大区别；workflow 只保留固定的芯片、狂犬，其余按官网。',
    links: [
      'https://www.agriculture.gov.au/biosecurity-trade/cats-dogs/how-to-import/step-by-step-guides/category-3-step-by-step-guide-for-cats',
      'https://www.agriculture.gov.au/biosecurity-trade/cats-dogs/how-to-import/step-by-step-guides/category-3-step-by-step-guide-for-dogs',
    ],
  },
];

export const workflowById = (id: string) => workflows.find((w) => w.id === id);
