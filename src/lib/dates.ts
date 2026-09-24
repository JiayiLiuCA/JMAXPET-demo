import { addDays as _addDays, differenceInCalendarDays, differenceInCalendarWeeks, format, parseISO, isValid, startOfWeek as _startOfWeek, endOfWeek as _endOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/** seed 数据的"今天" */
export const SEED_TODAY = '2026-09-16';

export const toISO = (d: Date) => format(d, 'yyyy-MM-dd');
export const parse = (iso: string) => parseISO(iso);
export const addDays = (iso: string, n: number) => toISO(_addDays(parseISO(iso), n));
/** b - a，按日历天 */
export const diffDays = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a));

const ok = (iso?: string) => !!iso && isValid(parseISO(iso));

/** 客户要求所有日期 mm/dd/yyyy */
export const fmtDate = (iso?: string) => (ok(iso) ? format(parseISO(iso!), 'MM/dd/yyyy') : iso || '—');
/** 短格式 mm/dd */
export const fmtMD = (iso?: string) => (ok(iso) ? format(parseISO(iso!), 'MM/dd') : iso || '—');
/** mm/dd/yyyy 周x */
export const fmtDateFull = (iso?: string) => (ok(iso) ? format(parseISO(iso!), 'MM/dd/yyyy EEE', { locale: zhCN }) : iso || '—');
/** mm/dd 周x */
export const fmtMDW = (iso?: string) => (ok(iso) ? format(parseISO(iso!), 'MM/dd EEE', { locale: zhCN }) : iso || '—');
export const fmtDateTime = (iso?: string) => (ok(iso) ? format(parseISO(iso!), 'MM/dd HH:mm') : iso || '—');
export const fmtTime = (iso?: string) => (ok(iso) ? format(parseISO(iso!), 'HH:mm') : iso || '—');
export const weekdayShort = (iso: string) => (ok(iso) ? format(parseISO(iso), 'EEE', { locale: zhCN }) : '');
export const fmtMonth = (iso: string) => (ok(iso) ? format(parseISO(iso), 'yyyy 年 M 月') : '未定');
export const monthKey = (iso: string) => (ok(iso) ? iso.slice(0, 7) : '');

/** 相对今天的可读文案 */
export const relativeLabel = (iso: string, today: string) => {
  if (!ok(iso)) return '未定';
  const n = diffDays(today, iso);
  if (n === 0) return '今天';
  if (n === 1) return '明天';
  if (n === -1) return '昨天';
  if (n > 0) return `${n} 天后`;
  return `${-n} 天前`;
};

export const nowISO = (today: string, time = '09:00') => `${today}T${time}:00`;

// ---------- 周（周一 ~ 周日，按实际星期） ----------
export const startOfWeek = (iso: string) => toISO(_startOfWeek(parseISO(iso), { weekStartsOn: 1 }));
export const endOfWeek = (iso: string) => toISO(_endOfWeek(parseISO(iso), { weekStartsOn: 1 }));
/** date 相对 today 在第几周：0 本周、1 下周、2 下下周、负数 = 过去 */
export const weekIndex = (today: string, date: string) => differenceInCalendarWeeks(parseISO(date), parseISO(today), { weekStartsOn: 1 });
export const weekLabel = (i: number) => (i === 0 ? '本周' : i === 1 ? '下周' : i === 2 ? '下下周' : i < 0 ? '过去' : `${i} 周后`);
export const weekRange = (today: string, i: number) => {
  const s = addDays(startOfWeek(today), i * 7);
  return { start: s, end: addDays(s, 6), label: `${fmtMD(s)} – ${fmtMD(addDays(s, 6))}` };
};
