import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, FileText, Pencil, Sigma } from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Input, Label, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { useUserData } from '../context/UserDataContext';
import { uid } from '../lib/utils';
import type { FormulaSheetDoc } from '../types';

interface FormulaRow {
  id: string;
  name: string;
  formula: string;
  note?: string;
}

export default function FormulaSheetsPage() {
  return (
    <DashboardLayout>
      <FormulaSheetsContent />
    </DashboardLayout>
  );
}

function FormulaSheetsContent() {
  const { formulaSheets, addFormulaSheet, updateFormulaSheet, deleteFormulaSheet } = useUserData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FormulaSheetDoc | null>(null);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (sheet: FormulaSheetDoc) => { setEditing(sheet); setModalOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Formula Sheets</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your formula collections</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          New Formula Sheet
        </Button>
      </div>

      {formulaSheets.length === 0 ? (
        <GlassCard>
          <EmptyState icon={Sigma} title="No formula sheets yet" message="Create your first formula sheet to organize important formulas by subject." action={<Button onClick={openCreate}><Plus size={16} />New Formula Sheet</Button>} />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {formulaSheets.map((sheet) => (
              <motion.div key={sheet.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
                <GlassCard hover className="p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <FileText size={18} className="text-purple-light flex-shrink-0" />
                      <h3 className="text-base font-semibold text-white">{sheet.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(sheet)} className="p-1.5 rounded-lg text-gray-400 hover:text-accent-light hover:bg-accent/10 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteFormulaSheet(sheet.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <Badge variant="purple" className="mb-3 self-start">{sheet.subject}</Badge>
                  <div className="space-y-2 flex-1 overflow-hidden">
                    {sheet.formulas.slice(0, 3).map((f) => (
                      <div key={f.id} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-xs font-medium text-gray-300">{f.name}</p>
                        <p className="text-sm text-accent-light font-mono mt-0.5 truncate">{f.formula}</p>
                      </div>
                    ))}
                    {sheet.formulas.length > 3 && (
                      <p className="text-xs text-gray-500 text-center pt-1">+{sheet.formulas.length - 3} more formulas</p>
                    )}
                    {sheet.formulas.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-2">No formulas yet</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-3">{sheet.formulas.length} formulas · Updated {new Date(sheet.updatedAt).toLocaleDateString()}</p>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <FormulaSheetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSave={(title, subject, formulas) => {
          if (editing) {
            updateFormulaSheet(editing.id, { title, subject, formulas });
          } else {
            addFormulaSheet({ title, subject, formulas });
          }
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function FormulaSheetModal({ isOpen, onClose, editing, onSave }: { isOpen: boolean; onClose: () => void; editing: FormulaSheetDoc | null; onSave: (title: string, subject: string, formulas: FormulaRow[]) => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [formulas, setFormulas] = useState<FormulaRow[]>([]);

  // Sync state when modal opens
  const [prevOpen, setPrevOpen] = useState(false);
  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setTitle(editing?.title ?? '');
    setSubject(editing?.subject ?? '');
    setFormulas(editing?.formulas.map((f) => ({ ...f })) ?? [{ id: uid(), name: '', formula: '', note: '' }]);
  }
  if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  const addFormula = () => {
    setFormulas([...formulas, { id: uid(), name: '', formula: '', note: '' }]);
  };

  const removeFormula = (id: string) => {
    setFormulas(formulas.filter((f) => f.id !== id));
  };

  const updateFormula = (id: string, field: keyof FormulaRow, value: string) => {
    setFormulas(formulas.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) return;
    const cleanFormulas = formulas.filter((f) => f.name.trim() && f.formula.trim());
    onSave(title.trim(), subject.trim(), cleanFormulas);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Formula Sheet' : 'Create Formula Sheet'} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fs-title">Title</Label>
            <Input id="fs-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Physics Formulas" required autoFocus />
          </div>
          <div>
            <Label htmlFor="fs-subject">Subject</Label>
            <Input id="fs-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics" required />
          </div>
        </div>

        {/* Formula list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Formulas</Label>
            <Button type="button" variant="secondary" size="sm" onClick={addFormula}>
              <Plus size={14} />
              Add Formula
            </Button>
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {formulas.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No formulas added yet. Click "Add Formula" to start.</p>
            ) : (
              <AnimatePresence>
                {formulas.map((formula, index) => (
                  <motion.div key={formula.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">Formula {index + 1}</span>
                        <button type="button" onClick={() => removeFormula(formula.id)} className="p-1 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={formula.name} onChange={(e) => updateFormula(formula.id, 'name', e.target.value)} placeholder="Formula name" />
                        <Input value={formula.formula} onChange={(e) => updateFormula(formula.id, 'formula', e.target.value)} placeholder="Formula (e.g. F = ma)" className="font-mono" />
                      </div>
                      <Textarea rows={1} value={formula.note ?? ''} onChange={(e) => updateFormula(formula.id, 'note', e.target.value)} placeholder="Optional note..." />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editing ? 'Save Changes' : 'Create Sheet'}</Button>
        </div>
      </form>
    </Modal>
  );
}
