'use client';

import { PlaneTakeoff } from 'lucide-react';
import type { Case } from '@/types';
import { AIRPORT_CITY } from '@/data/options';
import { petEmojiOf } from '@/data/cases';
import { useAppStore } from '@/store/useAppStore';
import { useOpenCase } from '@/lib/navigation';
import { fmtDate, fmtTime } from '@/lib/dates';
import { upcomingFlights } from '@/lib/buckets';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** 近一周航班：紧凑表格 */
export function FlightTable({ cases }: { cases: Case[] }) {
  const today = useAppStore((s) => s.today);
  const openCase = useOpenCase();
  const list = upcomingFlights(cases, today);
  return (
    <section className="overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
      <header className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <PlaneTakeoff className="size-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold">近一周航班</h2>
        <span className="rounded-full bg-white px-1.5 text-xs text-muted-foreground ring-1 ring-foreground/10">{list.length}</span>
      </header>
      {list.length === 0 ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">一周内无航班</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="text-xs text-muted-foreground hover:bg-transparent">
              <TableHead className="h-8">宠物</TableHead>
              <TableHead className="h-8">航班</TableHead>
              <TableHead className="h-8">路线</TableHead>
              <TableHead className="h-8">起飞</TableHead>
              <TableHead className="h-8">倒计时</TableHead>
              <TableHead className="h-8">仓位状态</TableHead>
              <TableHead className="h-8">AWB</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map(({ c, flight, days }) => {
              const label = c.airline_confirmed === '已到达' ? '已到达' : c.airline_confirmed === '已起飞' ? '已起飞' : days < 0 ? '昨天' : days === 0 ? '今天起飞' : days === 1 ? '明天起飞' : `${days} 天后`;
              const last = c.flights[c.flights.length - 1];
              return (
                <TableRow key={c.id} onClick={() => openCase(c.id)} className="cursor-pointer">
                  <TableCell><span className="mr-1.5">{petEmojiOf(c)}</span><span className="font-medium">{c.pet_name}</span><span className="ml-1.5 font-mono text-xs text-muted-foreground">{c.file_no}</span></TableCell>
                  <TableCell className="font-mono">{flight.flight_no}{c.flights.length > 1 ? ` + ${last.flight_no}` : ''}</TableCell>
                  <TableCell className="text-xs">{flight.from_code} {AIRPORT_CITY[flight.from_code]} → {last.to_code} {AIRPORT_CITY[last.to_code]}{c.flights.length > 1 ? `（经 ${flight.to_code}）` : ''}</TableCell>
                  <TableCell className="text-sm">{fmtDate(flight.dep_time)} {fmtTime(flight.dep_time)}</TableCell>
                  <TableCell><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', days <= 1 && !['已起飞', '已到达'].includes(c.airline_confirmed) ? 'bg-warning/50 text-[#6b4f12]' : 'bg-muted text-muted-foreground')}>{label}</span></TableCell>
                  <TableCell><StatusBadge value={c.airline_confirmed} kind="airline" /></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{flight.awb || '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
