import type { SalesOrder } from '@/types';

/** 销售接单信息表：主人微信、定金尾款、注意事项；操作部录单后关联 case_id */
export const seedSalesOrders: SalesOrder[] = [
  { id: 'so01', sales_id: 'u_amy', created_at: '2026-06-12', owner_wechat_name: '思远 Sy', owner_wechat_id: 'chen_siyuan_88', origin_text: '多伦多 → 香港', dest_text: '香港九龙塘', price_text: '8000/18000', currency: 'RMB', order_status_text: '泰迪 6kg，9 月中出发，全包托运', caution: '主人要求每天发视频；狗对陌生人敏感，接宠时请提前电话', pet_name: 'Teddy', case_id: 'c01' },
  { id: 'so02', sales_id: 'u_amy', created_at: '2026-07-20', owner_wechat_name: 'Siqi', owner_wechat_id: 'liusiqi_0530', origin_text: '多伦多 → 上海', dest_text: '上海浦东', price_text: '1500/3100', currency: 'CAD', order_status_text: '英短猫，老客户介绍，9 月下旬', caution: '猫晕车，接宠请放软垫', pet_name: 'Luna', case_id: 'c05' },
  { id: 'so03', sales_id: 'u_ben', created_at: '2026-08-02', owner_wechat_name: '韩雪', owner_wechat_id: 'hx_toronto', origin_text: '多伦多 → 香港', dest_text: '香港', price_text: '1500/3000', currency: 'CAD', order_status_text: '泰迪 6kg，10 月初出发，接受 LH 中转', caution: '客人只接受 10/01–10/03 之间出发', pet_name: 'Sesame', case_id: 'c26' },
  { id: 'so04', sales_id: 'u_ben', created_at: '2026-08-10', owner_wechat_name: 'Ruoxi', owner_wechat_id: 'xu_ruoxi', origin_text: '多伦多 → 香港', dest_text: '香港', price_text: '3200/0', currency: 'CAD', order_status_text: '主人随行同机，代办文件 + 加宠物位置，全款已收', caution: '主人 09/30 CX829，已自购机票', pet_name: 'Kiki', case_id: 'c15' },
  { id: 'so05', sales_id: 'u_amy', created_at: '2026-09-14', owner_wechat_name: 'Zihao D', owner_wechat_id: 'dzh_nyc', origin_text: '纽约 → 上海', dest_text: '上海', price_text: '1000/2800', currency: 'USD', order_status_text: '新客户，泰迪 5kg，11 月中；定金未付', caution: '定金未付前不排资源', pet_name: 'Pudding', case_id: 'c20' },
  // ---- 未录单（操作部还没建 Case）----
  { id: 'so06', sales_id: 'u_amy', created_at: '2026-09-15', owner_wechat_name: '小鱼', owner_wechat_id: 'xiaoyu_sh', origin_text: '上海 → 多伦多', dest_text: '多伦多 North York', price_text: '12000/20000', currency: 'RMB', order_status_text: '布偶猫 4kg，11 月底或 12 月初，全包', caution: '主人在国内，沟通用微信；落地后需要送到家', pet_name: '', case_id: '' },
  { id: 'so07', sales_id: 'u_ben', created_at: '2026-09-16', owner_wechat_name: 'Kevin W', owner_wechat_id: 'kevinw_van', origin_text: '温哥华 → 香港', dest_text: '香港', price_text: '1500/3000', currency: 'CAD', order_status_text: '柯基 12kg，10 月底，全包托运', caution: '狗有轻微分离焦虑，寄养时需要多陪', pet_name: '球球', case_id: '' },
  { id: 'so08', sales_id: 'u_amy', created_at: '2026-09-16', owner_wechat_name: 'Grace', owner_wechat_id: 'grace_2024', origin_text: '多伦多 → 迪拜', dest_text: '迪拜', price_text: '2000/4200', currency: 'CAD', order_status_text: '猫，明年 1 月，先咨询', caution: '', pet_name: '', case_id: '' },
];
