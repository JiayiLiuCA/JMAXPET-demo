'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export const casePath = (id: string) => `/cases/${id}`;

/** 打开 Case 详情子页面 */
export function useOpenCase() {
  const router = useRouter();
  return useCallback((id: string) => router.push(casePath(id)), [router]);
}
