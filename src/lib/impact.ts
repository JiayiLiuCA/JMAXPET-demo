import type { Case, ImpactItem, Task } from '@/types';
import { addDays, diffDays, fmtMD } from '@/lib/dates';
import { userName } from '@/data/users';
import { isDriverTask } from '@/lib/permissions';

/** 健康证有效期（签发后 N 天内必须出发） */
export const HEALTH_CERT_VALID_DAYS = 10;

export function computeImpact(c: Case, tasks: Task[], type: string, newDate: string, today: string): ImpactItem[] {
  const items: ImpactItem[] = [];
  const cancelled = type === '取消' || type === '本单取消';

  const affected = tasks.filter((t) => t.case_id === c.id && isDriverTask(t.type) && !['已完成', '异常', '无法确认'].includes(t.status) && diffDays(today, t.date) >= 0);
  if (affected.length) affected.forEach((t) => items.push({ kind: 'driver', level: 'warn', text: `司机任务「${t.type} ${fmtMD(t.date)} ${t.time_start}」（${userName(t.assignee_id)}）需${cancelled ? '取消' : '改期'}` }));
  else items.push({ kind: 'driver', level: 'info', text: '无待执行的司机任务受影响' });
  if (type === '当天拒载') items.push({ kind: 'driver', level: 'danger', text: '航司当天拒载，需安排司机从货站接回寄养点，并重新订舱' });

  if (c.health_cert_issued) {
    const expiry = addDays(c.health_cert_issued, HEALTH_CERT_VALID_DAYS);
    if (cancelled) items.push({ kind: 'health_cert', level: 'warn', text: `健康证 ${fmtMD(c.health_cert_issued)} 签发，有效期至 ${fmtMD(expiry)}；新日期确定后需核对是否重办` });
    else if (diffDays(expiry, newDate) > 0) items.push({ kind: 'health_cert', level: 'danger', text: `健康证 ${fmtMD(c.health_cert_issued)} 签发，${HEALTH_CERT_VALID_DAYS} 天有效期至 ${fmtMD(expiry)}，新日期 ${fmtMD(newDate)} 已过期 → 需重新办证 + 盖章` });
    else items.push({ kind: 'health_cert', level: 'info', text: `健康证仍在有效期内（至 ${fmtMD(expiry)}），无需重办` });
  } else {
    items.push({ kind: 'health_cert', level: 'info', text: '健康证尚未办理，按新日期重新排期' });
  }

  if (c.foster_end) {
    if (cancelled) items.push({ kind: 'foster', level: 'warn', text: `寄养原定 ${fmtMD(c.foster_end)} 结束，需与主人确认接回或续住` });
    else {
      const extra = diffDays(c.foster_end, newDate);
      if (extra > 0) items.push({ kind: 'foster', level: 'warn', text: `寄养需延长 ${extra} 天（${fmtMD(c.foster_end)} → ${fmtMD(newDate)}），补收寄养费` });
      else items.push({ kind: 'foster', level: 'info', text: '寄养结束日无需调整' });
    }
  } else {
    items.push({ kind: 'foster', level: 'info', text: '无寄养记录' });
  }

  const awb = c.flights.find((f) => f.status === 'active')?.awb;
  if (cancelled || type === '无仓位' || type === '当天拒载') items.push({ kind: 'docs', level: 'warn', text: `需重新订舱${awb ? `，原 AWB ${awb} 作废` : ''}` });
  return items;
}
