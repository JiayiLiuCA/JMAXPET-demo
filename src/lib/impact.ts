import type { Case, FlightChangeType, ImpactItem, Task } from '@/types';
import { addDays, diffDays, fmtDate } from '@/lib/dates';
import { userName } from '@/data/users';

/** 健康证有效期（签发后 N 天内必须出发） */
export const HEALTH_CERT_VALID_DAYS = 10;

export function computeImpact(c: Case, tasks: Task[], type: FlightChangeType, newDate: string, today: string): ImpactItem[] {
  const items: ImpactItem[] = [];
  const cancelled = type === '取消';

  // 司机任务
  const affected = tasks.filter((t) => t.case_id === c.id && !['已完成', '异常'].includes(t.status) && diffDays(today, t.date) >= 0 && ['送机', '接宠', '送 CFIA', '送医院', '采血'].includes(t.type));
  if (affected.length) {
    affected.forEach((t) => items.push({ kind: 'driver', level: 'warn', text: `司机任务「${t.type} ${fmtDate(t.date)} ${t.time_start}」（${userName(t.assignee_id)}）需${cancelled ? '取消' : '改期'}` }));
  } else {
    items.push({ kind: 'driver', level: 'info', text: '无待执行的司机任务受影响' });
  }
  if (type === '当天拒载') {
    items.push({ kind: 'driver', level: 'danger', text: '航司当天拒载，需安排司机从货站接回寄养点，并重新订舱' });
  }

  // 健康证
  if (c.health_cert_issued) {
    const expiry = addDays(c.health_cert_issued, HEALTH_CERT_VALID_DAYS);
    if (cancelled) {
      items.push({ kind: 'health_cert', level: 'warn', text: `健康证 ${fmtDate(c.health_cert_issued)} 签发，有效期至 ${fmtDate(expiry)}；新日期确定后需核对是否重办` });
    } else if (diffDays(expiry, newDate) > 0) {
      items.push({ kind: 'health_cert', level: 'danger', text: `健康证 ${fmtDate(c.health_cert_issued)} 签发，${HEALTH_CERT_VALID_DAYS} 天有效期至 ${fmtDate(expiry)}，新日期 ${fmtDate(newDate)} 已过期 → 需重新办证 + 盖章` });
    } else {
      items.push({ kind: 'health_cert', level: 'info', text: `健康证仍在有效期内（至 ${fmtDate(expiry)}），无需重办` });
    }
  } else {
    items.push({ kind: 'health_cert', level: 'info', text: '健康证尚未办理，按新日期重新排期' });
  }

  // 寄养
  if (c.foster_end) {
    if (cancelled) {
      items.push({ kind: 'foster', level: 'warn', text: `寄养原定 ${fmtDate(c.foster_end)} 结束，需与主人确认接回或续住` });
    } else {
      const extra = diffDays(c.foster_end, newDate);
      if (extra > 0) items.push({ kind: 'foster', level: 'warn', text: `寄养需延长 ${extra} 天（${fmtDate(c.foster_end)} → ${fmtDate(newDate)}），补收寄养费` });
      else items.push({ kind: 'foster', level: 'info', text: '寄养结束日无需调整' });
    }
  } else {
    items.push({ kind: 'foster', level: 'info', text: '无寄养记录' });
  }

  // 订舱 / 文件
  if (cancelled || type === '无仓位' || type === '当天拒载') {
    items.push({ kind: 'docs', level: 'warn', text: `需重新订舱${c.flights[0]?.awb ? `，原 AWB ${c.flights[0].awb} 作废` : ''}` });
  }
  return items;
}
