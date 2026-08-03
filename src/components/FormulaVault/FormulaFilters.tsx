import { Filter, RotateCcw } from 'lucide-react';
import type { FormulaSubject, FormulaDifficulty, FormulaImportance } from '../../types';
import { getFormulaSubjects } from '../../data/formulas';
import { examCatalog, examCategories, getExamsByCategory } from '../../data/exams';
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
  difficulty: FormulaDifficulty | 'All';
  onDifficultyChange: (d: FormulaDifficulty | 'All') => void;
  importance: FormulaImportance | 'All';
  onImportanceChange: (i: FormulaImportance | 'All') => void;
  exam: string | 'All';
  onExamChange: (e: string | 'All') => void;
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
  difficulty,
  onDifficultyChange,
  importance,
  onImportanceChange,
  exam,
  onExamChange,
}: FormulaFiltersProps) {
  const subjects = getFormulaSubjects();
  const hasActiveFilters =
    subject !== 'All' || category !== 'All' || chapter !== 'All' ||
    difficulty !== 'All' || importance !== 'All' || exam !== 'All';

  const reset = () => {
    onSubjectChange('All');
    onCategoryChange('All');
    onChapterChange('All');
    onDifficultyChange('All');
    onImportanceChange('All');
    onExamChange('All');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Filter size={15} className="text-accent-light" />
        <span className="font-medium">Filters</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div>
          <Label>Subject</Label>
          <Select
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value as FormulaSubject | 'All')}
          >
            <option value="All">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
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

        <div>
          <Label>Difficulty</Label>
          <Select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as FormulaDifficulty | 'All')}
          >
            <option value="All">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </div>

        <div>
          <Label>Importance</Label>
          <Select
            value={importance}
            onChange={(e) => onImportanceChange(e.target.value as FormulaImportance | 'All')}
          >
            <option value="All">All Importance</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </div>

        <div>
          <Label>Exam</Label>
          <Select
            value={exam}
            onChange={(e) => onExamChange(e.target.value)}
          >
            <option value="All">All Exams</option>
            {examCategories.map((cat) => {
              const exams = getExamsByCategory(cat);
              if (exams.length === 0) return null;
              return (
                <optgroup key={cat} label={cat}>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>{e.shortName || e.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
          {exam !== 'All' && (
            <p className="text-[11px] text-gray-600 mt-1">
              {examCatalog.find((e) => e.id === exam)?.name}
            </p>
          )}
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
