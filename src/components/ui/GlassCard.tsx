import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> { children: ReactNode; className?: string; hover?: boolean; }
export function GlassCard({ children, className, hover = false, ...props }: GlassCardProps) {
  return <motion.div className={cn('glass', hover && 'glass-hover', className)} {...props}>{children}</motion.div>;
}
