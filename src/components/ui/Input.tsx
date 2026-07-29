import { cn } from '../../lib/utils';
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('w-full px-4 py-2.5 rounded-xl bg-base-800/60 border border-white/[0.06] text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent/50 focus:bg-base-800 transition-all duration-200', className)} {...props} />;
}
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('w-full px-4 py-2.5 rounded-xl bg-base-800/60 border border-white/[0.06] text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent/50 focus:bg-base-800 transition-all duration-200 resize-none', className)} {...props} />;
}
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('select-base', className)} {...props}>{children}</select>;
}
export function Label({ children, className, htmlFor }: { children: React.ReactNode; className?: string; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className={cn('block text-sm font-medium text-gray-400 mb-1.5', className)}>{children}</label>;
}
