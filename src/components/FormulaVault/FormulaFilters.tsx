import { Filter, RotateCcw } from 'lucide-react';
import type { FormulaSubject } from '../../types';
import { Select, Label } from '../ui/Input';
import { Button } from '../ui/Button';

interface FormulaFiltersProps {
  subject: FormulaSubject | 'All';
  onSubjectChange: (s: FormulaSubject | 'All') => void;
  category: string | 'All';
  onCategoryChange: (c: string | 'All') => void;
  chapter: string | 'All';
  onChapterChange: (c: string | 'All') => void;
  categories: string[];
  chapters: string[];
}

export function FormulaFilters({
  subject,
  onSubjectChange,
  category,
  onCategoryChange,
  chapter,
  onChapterChange,
  categories,
  chapters,
}: FormulaFiltersProps) {
  const hasActiveFilters = subject !== 'All' || category !== 'All' || chapter !== 'All';

  const reset = () => {
    onSubjectChange('All');
    onCategoryChange('All');
    onChapterChange('All');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Filter size={15} className="text-accent-light" />
        <span className="font-medium">Filters</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div>
          <Label>Subject</Label>
          <Select
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value as FormulaSubject | 'All')}
          >
            <option value="All">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Mathematics">Mathematics</option>
          </Select>
        </div>

        <div>
          <Label>Category</Label>
          <Select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            disabled={categories.length === 0}
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Chapter</Label>
          <Select
            value={chapter}
            onChange={(e) => onChapterChange(e.target.value)}
            disabled={chapters.length === 0}
          >
            <option value="All">All Chapters</option>
            {chapters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={reset}
          disabled={!hasActiveFilters}
          className="h-[42px]"
        >
          <RotateCcw size={15} />
          Reset
        </Button>
      </div>
    </div>
  );
}
