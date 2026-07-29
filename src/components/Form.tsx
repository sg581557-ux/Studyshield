import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'

const base = 'w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:border-brand-500 focus:outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-colors'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className || ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${base} resize-none ${props.className || ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`select-base ${props.className || ''}`} />
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{children}</label>
}
