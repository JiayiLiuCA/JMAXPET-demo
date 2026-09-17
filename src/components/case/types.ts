import type { Case, User } from '@/types';

export interface SectionProps {
  c: Case;
  canEdit: boolean;
  user: User;
}
