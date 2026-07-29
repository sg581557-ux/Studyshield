import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ProgressBarProps { value?: number; max?: number; percentage?: number; className?: string; barClassName?: string; height?: string; }
export function ProgressBar({ value = 0, max, percentage, className, barClassName, height = 'h-2' }: ProgressBarProps) {
  const pct = percentage !== undefined ? Math.min(100, percentage) : Math.min(100, max && max > 0 ? (value / max) * 100 : 0);
  return (
    <div className={cn(`w-full ${height} rounded-full bg-base-700 overflow-hidden`, className)}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} className={cn('h-full rounded-full bg-accent', barClassName)} />
    </div>
  );
}
