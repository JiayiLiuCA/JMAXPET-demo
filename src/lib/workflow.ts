import type { Case, CaseStep, CaseType, FinalPaymentPoint, ServiceScope, Species, Stage, WorkflowStep, WorkflowTemplate } from '@/types';
import { workflows } from '@/data/workflows';
import { addDays, diffDays } from '@/lib/dates';

const P = 'ops_post' as const;
const D = 'ops_docs' as const;
const A = 'admin' as const;
const s = (key: string, label: string, owner_role: WorkflowStep['owner_role'], offset_days: number, offset_rule: string, description = '', required_docs: string[] = []): WorkflowStep =>
  ({ key, label, owner_role, offset_days, offset_rule, required_docs, description });

/** 健康证 / 检疫证拿到后的收尾流程，按 Case 类型与服务范围拼接 */
export function tailSteps(caseType: CaseType, scope: ServiceScope, payPoint: FinalPaymentPoint): WorkflowStep[] {
  const finalPay = (offset: number, rule: string) => s('final_payment', '收尾款', P, offset, rule, '核对费用明细，收齐尾款');
  if (caseType === '仅代办文件') {
    return [s('handover_docs', '文件转交主人', D, -3, '出发前 3 天', '把办好的文件交给主人自行出行'), s('archive', '归档', A, 3, '出发后 3 天')];
  }
  if (caseType === '随机') {
    return [
      s('remind_checkin', '提醒主人值机', D, -1, '出发前 1 天', '提醒提前 3 小时到柜台办理宠物随行手续，带齐文件原件'),
      s('flight_track', '航班跟踪', P, 0, '出发当天', '跟踪起飞 / 落地，同步主人'),
      s('home', '到家', P, 1, '落地当天', '确认主人和宠物已到家'),
      s('archive', '归档', A, 6, '到家后'),
    ];
  }
  if (scope === '仅订舱') {
    const list: WorkflowStep[] = [
      s('driver_airport', '送机', D, -1, '出发前 1 天', '按航司 cut-off 时间提前 4–6 小时到货站'),
      s('flight_track', '航班跟踪', P, 0, '出发当天', ''),
      s('self_customs', '自行清关 / 当地公司清关', P, 1, '落地当天', '主人自行清关或安排当地公司清关'),
      s('home', '到家', P, 1, '落地当天', ''),
      s('archive', '归档', A, 6, '到家后'),
    ];
    if (payPoint === '到家后') list.splice(4, 0, finalPay(2, '到家后 2 天内'));
    else list.unshift(finalPay(-2, '送机前收尾款'));
    return list;
  }
  // 托运 · 全包
  const list: WorkflowStep[] = [
    s('driver_airport', '送机', D, -1, '出发前 1 天', '按航司 cut-off 时间提前 4–6 小时到货站'),
    s('flight_track', '航班跟踪', P, 0, '出发当天', '跟踪起飞 / 中转 / 落地，同步主人'),
    s('customs', '清关', P, 1, '落地当天', '目的地代理清关'),
    s('transfer', '境内转运', P, 2, '清关后', '转运到最终目的地'),
    s('home', '到家', P, 3, '转运后', '交付主人，收取到家照片 / 视频'),
    s('archive', '归档', A, 8, '到家后'),
  ];
  if (payPoint === '送机前') list.unshift(finalPay(-2, '送机前收尾款'));
  else if (payPoint === '到家后') list.splice(5, 0, finalPay(4, '到家后收尾款'));
  else list.splice(3, 0, finalPay(1, '清关后收尾款'));
  return list;
}

/** 模板文件部分 + 收尾部分 → 完整步骤定义 */
export function fullSteps(tpl: WorkflowTemplate, caseType: CaseType, scope: ServiceScope, payPoint: FinalPaymentPoint): WorkflowStep[] {
  let docs = tpl.steps.map((st) => ({ ...st }));
  if (caseType === '随机') docs = docs.map((st) => (st.key === 'booking' ? { ...st, key: 'accompany_booking', label: '随机订舱 / 加宠物位置', owner_role: 'booking_accompany' as const, required_docs: ['航司宠物位置确认'], description: '找随机人、向航司加宠物位置' } : st));
  if (caseType === '仅代办文件') docs = docs.filter((st) => st.key !== 'booking');
  const stampLabel = (st: WorkflowStep) => (st.key === 'stamp' ? { ...st, label: `${tpl.stamp_authority.replace(' / ', ' / ')} 盖章` } : st);
  const all = [...docs.map(stampLabel), ...tailSteps(caseType, scope, payPoint)];
  return all.map((st, i) => ({ st, i })).sort((a, b) => a.st.offset_days - b.st.offset_days || a.i - b.i).map((x) => x.st);
}

export interface BuildOpts { caseType: CaseType; scope: ServiceScope; payPoint: FinalPaymentPoint }

/** 按出发日倒推每一步计划日期；currentStepKey 之前视为完成 */
export function buildTimeline(tpl: WorkflowTemplate, opts: BuildOpts, departureDate: string, currentStepKey: string, today: string): CaseStep[] {
  const steps = fullSteps(tpl, opts.caseType, opts.scope, opts.payPoint);
  const idx = Math.max(0, steps.findIndex((x) => x.key === currentStepKey));
  return steps.map((st, i) => {
    const planned = addDays(departureDate, st.offset_days);
    const base: CaseStep['status'] = i < idx ? '完成' : i === idx ? '进行中' : '未开始';
    const status = base !== '完成' && diffDays(today, planned) < 0 ? '延误' : base;
    return {
      key: st.key, label: st.label, owner_role: st.owner_role, planned_date: planned, status,
      required_docs: st.required_docs, missing_docs: base === '完成' ? [] : st.required_docs, description: st.description, offset_rule: st.offset_rule,
      completed_at: base === '完成' ? planned : undefined,
    };
  });
}

/** 出发日变更后：未完成的步骤按新日期重排，已完成的保留 */
export function shiftTimeline(timeline: CaseStep[], tpl: WorkflowTemplate, opts: BuildOpts, newDeparture: string, today: string): CaseStep[] {
  const defs = fullSteps(tpl, opts.caseType, opts.scope, opts.payPoint);
  return timeline.map((st) => {
    if (st.status === '完成') return st;
    const def = defs.find((d) => d.key === st.key);
    const planned = def ? addDays(newDeparture, def.offset_days) : st.planned_date;
    const status = diffDays(today, planned) < 0 ? '延误' : st.status === '延误' ? (st.missing_docs.length ? '进行中' : '未开始') : st.status;
    return { ...st, planned_date: planned, status };
  });
}

/** Case 类型 / 服务范围 / 收尾款节点变更后：已完成的保留，其余按新定义重建 */
export function rebuildTimeline(timeline: CaseStep[], tpl: WorkflowTemplate, opts: BuildOpts, departure: string, today: string): { timeline: CaseStep[]; currentKey: string } {
  const defs = fullSteps(tpl, opts.caseType, opts.scope, opts.payPoint);
  const doneKeys = new Set(timeline.filter((t) => t.status === '完成').map((t) => t.key));
  const fresh = defs.map((st) => {
    const old = timeline.find((t) => t.key === st.key);
    if (old && doneKeys.has(st.key)) return old;
    const planned = addDays(departure, st.offset_days);
    return { key: st.key, label: st.label, owner_role: st.owner_role, planned_date: planned, status: '未开始' as const, required_docs: st.required_docs, missing_docs: st.required_docs, description: st.description, offset_rule: st.offset_rule };
  });
  const firstOpen = fresh.find((t) => t.status !== '完成');
  const currentKey = firstOpen?.key ?? fresh[fresh.length - 1].key;
  return { timeline: refreshTimelineStatus(fresh, today, currentKey), currentKey };
}

/** 日期拨动后刷新 延误 标记 */
export function refreshTimelineStatus(timeline: CaseStep[], today: string, currentStepKey: string): CaseStep[] {
  const idx = timeline.findIndex((x) => x.key === currentStepKey);
  return timeline.map((st, i) => {
    if (st.status === '完成') return st;
    const base: CaseStep['status'] = i === idx ? '进行中' : i < idx ? '完成' : '未开始';
    if (base === '完成') return { ...st, status: '完成', missing_docs: [] };
    const status = diffDays(today, st.planned_date) < 0 ? '延误' : base;
    return { ...st, status };
  });
}

export function completeStepByKey(timeline: CaseStep[], key: string, today: string, currentStepKey: string, actor?: string): { timeline: CaseStep[]; nextKey: string } {
  const idx = timeline.findIndex((x) => x.key === key);
  const curIdx = timeline.findIndex((x) => x.key === currentStepKey);
  if (idx < 0) return { timeline, nextKey: currentStepKey };
  const nextIdx = Math.min(timeline.length - 1, Math.max(idx + 1, curIdx));
  const nextKey = timeline[nextIdx].key;
  const marked = timeline.map((st, i) => (i <= idx && st.status !== '完成' ? { ...st, completed_at: today, completed_by: actor } : st));
  return { timeline: refreshTimelineStatus(marked, today, nextKey), nextKey };
}

export const stepProgress = (timeline: CaseStep[]) => {
  const done = timeline.filter((x) => x.status === '完成').length;
  return { done, total: timeline.length, pct: Math.round((done / Math.max(1, timeline.length)) * 100) };
};

export const currentStep = (c: Pick<Case, 'timeline' | 'current_step_key'>) => c.timeline.find((t) => t.key === c.current_step_key);
export const nextStepLabel = (c: Pick<Case, 'timeline' | 'current_step_key' | 'archived'>) => (c.archived ? '结束' : currentStep(c)?.label ?? '—');

const DOC_KEYS = new Set(['chip', 'rabies', 'rabies2', 'combo', 'blood', 'kennel_apply', 'cdc_vet', 'screwworm', 'return_docs', 'uae_permit', 'aqs', 'wait180', 'other_docs', 'cdc_permit']);
const CERT_KEYS = new Set(['health_cert', 'stamp', 'quarantine_cert', 'deworm', 'handover_docs']);
const DEPART_KEYS = new Set(['driver_airport', 'flight_track', 'remind_checkin']);
const ARRIVE_KEYS = new Set(['customs', 'self_customs', 'transfer', 'final_payment', 'home']);

/** 阶段由当前步骤推导，不再手填 */
export function stageOf(c: Pick<Case, 'timeline' | 'current_step_key' | 'archived' | 'status'>): Stage {
  if (c.status === '已取消') return '已取消';
  if (c.archived || c.status === '已完成') return '完成';
  const cur = currentStep(c);
  if (!cur) return '新建';
  const k = cur.key;
  if (k === 'archive') return '完成';
  if (ARRIVE_KEYS.has(k)) return '到达';
  if (DEPART_KEYS.has(k)) return '出发';
  if (CERT_KEYS.has(k)) return '健康证 / 盖章';
  if (k === 'booking' || k === 'accompany_booking') return '待订舱';
  if (DOC_KEYS.has(k)) return c.timeline.some((t) => t.status === '完成') ? '办理文件' : '新建';
  return '办理文件';
}

export const isDocStep = (key: string) => DOC_KEYS.has(key) || CERT_KEYS.has(key);
/** 前期文件是否已办完（订舱步骤之前的所有步骤都完成） */
export function preDocsDone(c: Pick<Case, 'timeline'>) {
  const idx = c.timeline.findIndex((t) => t.key === 'booking' || t.key === 'accompany_booking');
  if (idx < 0) return false;
  return c.timeline.slice(0, idx).every((t) => t.status === '完成');
}

/** 按出发国家 / 目的国家 / 物种挑模板 */
export function pickTemplate(originCountry: string, destCountry: string, species: Species): WorkflowTemplate | undefined {
  const cn = originCountry === '中国';
  const list = workflows.filter((w) => (cn ? w.origin_region === 'CN' : w.origin_region === 'NA') && w.origin_countries.includes(originCountry) && w.dest_country === destCountry);
  return list.find((w) => w.species.includes(species)) ?? list[0] ?? workflows.find((w) => w.dest_country === destCountry && w.species.includes(species));
}
