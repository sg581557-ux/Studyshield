import { useState, useMemo, useRef, useEffect } from 'react'
import { useDebounce } from '../lib/hooks'
import { EXAM_DATA, getSubjectsForExam } from '../lib/examData'

interface ChapterSelectorProps {
  examName: string
  selectedChapters: string[]
  onChange: (chapters: string[]) => void
  maxSelections?: number
  placeholder?: string
}

export default function ChapterSelector({
  examName,
  selectedChapters,
  onChange,
  maxSelections,
  placeholder = 'Search chapters...',
}: ChapterSelectorProps) {
  const [search, setSearch] = useState('')
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 200)

  const subjects = useMemo(() => getSubjectsForExam(examName), [examName])

  const filteredSubjects = useMemo(() => {
    if (!debouncedSearch.trim()) return subjects
    const q = debouncedSearch.toLowerCase()
    return subjects
      .map((s) => ({ ...s, chapters: s.chapters.filter((c) => c.toLowerCase().includes(q)) }))
      .filter((s) => s.chapters.length > 0)
  }, [subjects, debouncedSearch])

  const toggleChapter = (key: string) => {
    if (selectedChapters.includes(key)) {
      onChange(selectedChapters.filter((c) => c !== key))
    } else {
      if (maxSelections && selectedChapters.length >= maxSelections) return
      onChange([...selectedChapters, key])
    }
  }

  const toggleSubject = (subjectName: string, chapters: string[]) => {
    const allKeys = chapters.map((c) => `${examName}||${subjectName}||${c}`)
    const allSelected = allKeys.every((k) => selectedChapters.includes(k))
    if (allSelected) {
      onChange(selectedChapters.filter((c) => !allKeys.includes(c)))
    } else {
      const newKeys = allKeys.filter((k) => !selectedChapters.includes(k))
      const remaining = maxSelections ? maxSelections - selectedChapters.length : newKeys.length
      onChange([...selectedChapters, ...newKeys.slice(0, remaining)])
    }
  }

  useEffect(() => {
    if (debouncedSearch && filteredSubjects.length > 0 && expandedSubject === null) {
      setExpandedSubject(filteredSubjects[0].name)
    }
  }, [debouncedSearch, filteredSubjects, expandedSubject])

  if (!examName) {
    return <p className="text-sm text-neutral-500 p-4 text-center">Select an exam first to see chapters.</p>
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder={placeholder} />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">{selectedChapters.length} selected{maxSelections ? ` / ${maxSelections}` : ''}</span>
        {selectedChapters.length > 0 && (
          <button onClick={() => onChange([])} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Clear all</button>
        )}
      </div>

      <div className="max-h-[350px] overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        {filteredSubjects.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            {debouncedSearch ? 'No chapters found matching your search.' : 'No chapters available.'}
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredSubjects.map((subject) => {
              const isExpanded = expandedSubject === subject.name || !!debouncedSearch
              const allKeys = subject.chapters.map((c) => `${examName}||${subject.name}||${c}`)
              const selectedCount = allKeys.filter((k) => selectedChapters.includes(k)).length
              const allSelected = selectedCount === allKeys.length
              const partialSelected = selectedCount > 0 && !allSelected

              return (
                <div key={subject.name}>
                  <div className="flex items-center gap-2 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer" onClick={() => setExpandedSubject(isExpanded ? null : subject.name)}>
                    <button onClick={(e) => { e.stopPropagation(); toggleSubject(subject.name, subject.chapters) }} className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all flex-shrink-0 ${allSelected ? 'bg-primary-600 border-primary-600 text-white' : partialSelected ? 'bg-primary-200 border-primary-400 text-primary-700' : 'border-neutral-300 dark:border-neutral-700'}`}>
                      {allSelected && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      {partialSelected && <span className="text-xs">−</span>}
                    </button>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white flex-1">{subject.name}</span>
                    <span className="text-xs text-neutral-400">{selectedCount}/{allKeys.length}</span>
                    <span className="text-neutral-400 text-sm">{isExpanded ? '−' : '+'}</span>
                  </div>
                  {isExpanded && (
                    <div className="pl-8 pb-2 animate-slide-down">
                      {subject.chapters.map((chapter) => {
                        const key = `${examName}||${subject.name}||${chapter}`
                        const isSelected = selectedChapters.includes(key)
                        return (
                          <button key={chapter} onClick={() => toggleChapter(key)} className={`flex w-full items-center gap-2 py-1.5 px-2 text-left text-sm rounded-lg transition-all ${isSelected ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50'}`}>
                            <span className={`flex h-4 w-4 items-center justify-center rounded border transition-all flex-shrink-0 ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-neutral-300 dark:border-neutral-700'}`}>
                              {isSelected && <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </span>
                            <span className="flex-1 truncate">{chapter}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
