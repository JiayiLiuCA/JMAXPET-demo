import { addDays as _addDays, differenceInCalendarDays, format, parseISO, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/** seed 数据的"今天" */
export const SEED_TODAY = '2026-09-16';

export const toISO = (d: Date) => format(d, 'yyyy-MM-dd');
export const parse = (iso: string) => parseISO(iso);
export const addDays = (iso: string, n: number) => toISO(_addDays(parseISO(iso), n));
/** b - a，按日历天 */
export const diffDays = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a));

export const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'M月d日', { locale: zhCN }) : iso;
};
export const fmtDateFull = (iso?: string) => {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'yyyy-MM-dd EEE', { locale: zhCN }) : iso;
};
export const fmtDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'M月d日 HH:mm', { locale: zhCN }) : iso;
};
export const fmtTime = (iso?: string) => {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'HH:mm') : iso;
};
export const weekdayShort = (iso: string) => format(parseISO(iso), 'EEE', { locale: zhCN });

/** 相对今天的可读文案 */
export const relativeLabel = (iso: string, today: string) => {
  const n = diffDays(today, iso);
  if (n === 0) return '今天';
  if (n === 1) return '明天';
  if (n === -1) return '昨天';
  if (n > 0) return `${n} 天后`;
  return `${-n} 天前`;
};

export const nowISO = (today: string, time = '09:00') => `${today}T${time}:00`;
