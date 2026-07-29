import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

type Variant = 'default'|'success'|'warning'|'error'|'accent'|'purple'|'blue';
interface BadgeProps { children: ReactNode; variant?: Variant; className?: string; }
const variants: Record<Variant, string> = {
  default: 'bg-white/[0.06] text-gray-300 border-white/[0.08]',
  success: 'bg-success/10 text-success-light border-success/20',
  warning: 'bg-warning/10 text-warning-light border-warning/20',
  error: 'bg-error/10 text-error-light border-error/20',
  accent: 'bg-accent/10 text-accent-light border-accent/20',
  purple: 'bg-purple/10 text-purple-light border-purple/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};
export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', variants[variant], className)}>{children}</span>;
}
