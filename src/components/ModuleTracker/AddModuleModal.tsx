import { useState } from 'react';
import type { StudyModule, ModuleDifficulty } from '../../types';
import { Modal } from '../ui/Modal';
import { Input, Select, Label } from '../ui/Input';
import { Button } from '../ui/Button';

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (m: Omit<StudyModule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  subjects: string[];
  chapters: string[];
}

interface FormState {
  subject: string;
  chapter: string;
  moduleName: string;
  totalExercises: number;
  totalQuestions: number;
  difficulty: ModuleDifficulty;
  targetDate: string;
  dailyQuestionTarget: number;
}

const initialState: FormState = {
  subject: '',
  chapter: '',
  moduleName: '',
  totalExercises: 0,
  totalQuestions: 0,
  difficulty: 'medium',
  targetDate: '',
  dailyQuestionTarget: 50,
};

export function AddModuleModal({ isOpen, onClose, onAdd, subjects, chapters }: AddModuleModalProps) {
  const [form, setForm] = useState<FormState>(initialState);

  const update = (key: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject || !form.chapter || !form.moduleName) return;

    onAdd({
      subject: form.subject,
      chapter: form.chapter,
      moduleName: form.moduleName,
      totalExercises: form.totalExercises,
      completedExercises: 0,
      totalQuestions: form.totalQuestions,
      solvedQuestions: 0,
      wrongQuestions: 0,
      revisionQuestions: 0,
      difficulty: form.difficulty,
      status: 'not-started',
      targetDate: form.targetDate || undefined,
      dailyQuestionTarget: form.dailyQuestionTarget,
    });

    setForm(initialState);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Module" wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select
              id="subject"
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              required
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="chapter">Chapter</Label>
            <Input
              id="chapter"
              list="chapter-list"
              value={form.chapter}
              onChange={(e) => update('chapter', e.target.value)}
              placeholder="Enter or select chapter"
              required
            />
            <datalist id="chapter-list">
              {chapters.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <Label htmlFor="moduleName">Module Name</Label>
          <Input
            id="moduleName"
            value={form.moduleName}
            onChange={(e) => update('moduleName', e.target.value)}
            placeholder="e.g. Exercise 1.1 — Kinematics"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="totalExercises">Total Exercises</Label>
            <Input
              id="totalExercises"
              type="number"
              min={0}
              value={form.totalExercises}
              onChange={(e) => update('totalExercises', parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="totalQuestions">Total Questions</Label>
            <Input
              id="totalQuestions"
              type="number"
              min={0}
              value={form.totalQuestions}
              onChange={(e) => update('totalQuestions', parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              id="difficulty"
              value={form.difficulty}
              onChange={(e) => update('difficulty', e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="targetDate">Target Date (optional)</Label>
            <Input
              id="targetDate"
              type="date"
              value={form.targetDate}
              onChange={(e) => update('targetDate', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="dailyTarget">Daily Question Target</Label>
          <Input
            id="dailyTarget"
            type="number"
            min={1}
            value={form.dailyQuestionTarget}
            onChange={(e) => update('dailyQuestionTarget', parseInt(e.target.value, 10) || 0)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Add Module
          </Button>
        </div>
      </form>
    </Modal>
  );
}
