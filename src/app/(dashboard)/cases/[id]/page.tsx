'use client';

import { useParams } from 'next/navigation';
import { CaseDetail } from '@/components/case/CaseDetail';

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  return <CaseDetail id={params.id} />;
}
