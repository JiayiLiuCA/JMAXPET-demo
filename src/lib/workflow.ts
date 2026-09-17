import type { CaseStep, WorkflowTemplate } from '@/types';
import { addDays, diffDays } from '@/lib/dates';

/**
 * 按 departure_date 倒推每一步计划日期，生成 Timeline。
 * currentStepKey 之前的步骤视为完成，当前步进行中，之后未开始；
 * 未完成且计划日期已过 → 延误。
 */
export function buildTimeline(
  template: WorkflowTemplate,
  departureDate: string,
  currentStepKey: string,
  today: string,
): CaseStep[] {
  const idx = Math.max(0, template.steps.findIndex((s) => s.key === currentStepKey));
  return template.steps.map((s, i) => {
    const planned = addDays(departureDate, s.offset_days);
    const base: CaseStep['status'] = i < idx ? '完成' : i === idx ? '进行中' : '未开始';
    const status = base !== '完成' && diffDays(today, planned) < 0 ? '延误' : base;
    return {
      key: s.key,
      label: s.label,
      owner_role: s.owner_role,
      planned_date: planned,
      status,
      required_docs: s.required_docs,
      missing_docs: base === '完成' ? [] : s.required_docs,
      description: s.description,
      offset_rule: s.offset_rule,
    };
  });
}

/** 出发日变更后：未完成的步骤按新日期重排，已完成的保留 */
export function shiftTimeline(timeline: CaseStep[], template: WorkflowTemplate, newDeparture: string, today: string): CaseStep[] {
  return timeline.map((st) => {
    if (st.status === '完成') return st;
    const def = template.steps.find((s) => s.key === st.key);
    const planned = def ? addDays(newDeparture, def.offset_days) : st.planned_date;
    const status = diffDays(today, planned) < 0 ? '延误' : st.status === '延误' ? (st.missing_docs.length ? '进行中' : '未开始') : st.status;
    return { ...st, planned_date: planned, status };
  });
}

/** 日期拨动后刷新 延误 标记 */
export function refreshTimelineStatus(timeline: CaseStep[], today: string, currentStepKey: string): CaseStep[] {
  const idx = timeline.findIndex((s) => s.key === currentStepKey);
  return timeline.map((st, i) => {
    if (st.status === '完成') return st;
    const base: CaseStep['status'] = i === idx ? '进行中' : i < idx ? '完成' : '未开始';
    if (base === '完成') return { ...st, status: '完成', missing_docs: [] };
    const status = diffDays(today, st.planned_date) < 0 ? '延误' : base;
    return { ...st, status };
  });
}

/** 推进到下一步 */
export function advanceStep(timeline: CaseStep[], currentStepKey: string, today: string): { timeline: CaseStep[]; nextKey: string } {
  const idx = timeline.findIndex((s) => s.key === currentStepKey);
  const nextIdx = Math.min(timeline.length - 1, idx + 1);
  const nextKey = timeline[nextIdx].key;
  return { timeline: refreshTimelineStatus(timeline, today, nextKey), nextKey };
}

export function completeStepByKey(timeline: CaseStep[], key: string, today: string, currentStepKey: string): { timeline: CaseStep[]; nextKey: string } {
  const idx = timeline.findIndex((s) => s.key === key);
  const curIdx = timeline.findIndex((s) => s.key === currentStepKey);
  if (idx < 0) return { timeline, nextKey: currentStepKey };
  // 完成到 key 为止的所有步骤，当前步变为下一步
  const nextIdx = Math.min(timeline.length - 1, Math.max(idx + 1, curIdx));
  const nextKey = timeline[nextIdx].key;
  return { timeline: refreshTimelineStatus(timeline, today, nextKey), nextKey };
}

export const stepProgress = (timeline: CaseStep[]) => {
  const done = timeline.filter((s) => s.status === '完成').length;
  return { done, total: timeline.length, pct: Math.round((done / Math.max(1, timeline.length)) * 100) };
};
