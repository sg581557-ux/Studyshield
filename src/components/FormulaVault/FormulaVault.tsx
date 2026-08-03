import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Sigma, Shuffle, Star, Grid, List, Target } from 'lucide-react';
import type { Formula, FormulaSubject, FormulaDifficulty, FormulaImportance, FormulaCategory } from '../../types';
import { allFormulas, getFormulaById } from '../../data/formulas';
import { useFormulaVault } from '../../context/FormulaVaultContext';
import { useUserExam } from '../../hooks/useUserExam';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { FormulaCard } from './FormulaCard';
import { FormulaFilters } from './FormulaFilters';
import { FavoritesSection } from './FavoritesSection';
import { QuickRevisionMode } from './QuickRevisionMode';

export function FormulaVault() {
  const {
    favorites: favIds,
    recentlyViewed: recentIds,
    revisionList: revisedIds,
    frequentlyUsed: freqIds,
    toggleFavorite,
    isFavorite,
    addToRecentlyViewed,
    isRevised,
    addToFrequentlyUsed,
    isFrequentlyUsed,
    markAsRevised,
  } = useFormulaVault();

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<FormulaSubject | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string | 'All'>('All');
  const [chapterFilter, setChapterFilter] = useState<string | 'All'>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<FormulaDifficulty | 'All'>('All');
  const [importanceFilter, setImportanceFilter] = useState<FormulaImportance | 'All'>('All');
  const [examFilter, setExamFilter] = useState<string | 'All'>('All');
  const [showQuickRevision, setShowQuickRevision] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // The user's target exam (from onboarding / profile). The exam filter defaults
  // to it and follows profile changes automatically; users can still switch to
  // "All Exams" (or any other exam) at any time.
  const { examId: userExamId, examName: userExamName } = useUserExam();
  useEffect(() => {
    setExamFilter(userExamId ?? 'All');
  }, [userExamId]);

  // Cascading filter options — scoped to the currently selected exam so filters
  // never offer categories/chapters that have no formulas for that exam.
  const examScoped = useMemo(
    () => (examFilter === 'All' ? allFormulas : allFormulas.filter((f) => (f.exams || []).includes(examFilter))),
    [examFilter],
  );

  const categories = useMemo(
    () =>
      subjectFilter === 'All'
        ? []
        : [...new Set(examScoped.filter((f) => f.subject === subjectFilter).map((f) => f.category).filter((c): c is FormulaCategory => Boolean(c)))].sort(),
    [examScoped, subjectFilter],
  );

  const chapters = useMemo(
    () =>
      subjectFilter !== 'All' && categoryFilter !== 'All'
        ? [...new Set(examScoped.filter((f) => f.subject === subjectFilter && f.category === categoryFilter).map((f) => f.chapter))].sort((a, b) => a.localeCompare(b))
        : [],
    [examScoped, subjectFilter, categoryFilter],
  );

  // Resolve favorites, recently viewed, and revision list into Formula objects
  const favoriteFormulas = useMemo(
    () => favIds.map((id) => getFormulaById(id)).filter((f): f is Formula => f !== undefined),
    [favIds],
  );

  const examContext = useMemo(() => {
    if (examFilter === 'All') return { label: 'All Exams', count: allFormulas.length };
    const exam = examFilter === userExamId ? userExamName : examFilter;
    const count = allFormulas.filter((f) => (f.exams || []).includes(examFilter)).length;
    return { label: exam ?? examFilter, count };
  }, [examFilter, userExamId, userExamName]);

  const recentFormulas = useMemo(
    () => recentIds.map((id) => getFormulaById(id)).filter((f): f is Formula => f !== undefined),
    [recentIds],
  );

  const revisedFormulas = useMemo(
    () => revisedIds.map((id) => getFormulaById(id)).filter((f): f is Formula => f !== undefined),
    [revisedIds],
  );

  const frequentlyUsedFormulas = useMemo(
    () => freqIds.map((id) => getFormulaById(id)).filter((f): f is Formula => f !== undefined),
    [freqIds],
  );

  // Enhanced search: searches name, formula, chapter, topic, notes, jeeTip,
  // tags, synonyms, variables (symbol + description), and units. Everything is
  // constrained to the selected exam (unless "All Exams" is active).
  const filteredFormulas = useMemo(() => {
    let result = examScoped;

    if (subjectFilter !== 'All') {
      result = result.filter((f) => f.subject === subjectFilter);
    }
    if (categoryFilter !== 'All') {
      result = result.filter((f) => f.category === categoryFilter);
    }
    if (chapterFilter !== 'All') {
      result = result.filter((f) => f.chapter === chapterFilter);
    }
    if (difficultyFilter !== 'All') {
      result = result.filter((f) => f.difficulty === difficultyFilter);
    }
    if (importanceFilter !== 'All') {
      result = result.filter((f) => f.importance === importanceFilter);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter((f) => {
        // Search name
        if (f.name.toLowerCase().includes(q)) return true;
        // Search formula text
        if (f.formula.toLowerCase().includes(q)) return true;
        // Search latex
        if (f.latex && f.latex.toLowerCase().includes(q)) return true;
        // Search chapter
        if (f.chapter.toLowerCase().includes(q)) return true;
        // Search topic
        if (f.topic.toLowerCase().includes(q)) return true;
        // Search description
        if (f.description.toLowerCase().includes(q)) return true;
        // Search notes
        if (f.notes && f.notes.toLowerCase().includes(q)) return true;
        // Search JEE tip
        if (f.jeeTip && f.jeeTip.toLowerCase().includes(q)) return true;
        // Search tags
        if (f.tags.some((t) => t.toLowerCase().includes(q))) return true;
        // Search synonyms
        if (f.synonyms && f.synonyms.some((s) => s.toLowerCase().includes(q))) return true;
        // Search variables (symbol + description + unit)
        if (f.variables.some((v) =>
          v.symbol.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          (v.unit && v.unit.toLowerCase().includes(q))
        )) return true;
        // Search units
        if (f.units && f.units.toLowerCase().includes(q)) return true;
        // Search conditions
        if (f.conditions && f.conditions.toLowerCase().includes(q)) return true;
        // Search common mistakes
        if (f.commonMistakes && f.commonMistakes.some((m) => m.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    return result;
  }, [examScoped, subjectFilter, categoryFilter, chapterFilter, difficultyFilter, importanceFilter, searchQuery]);

  const handleSubjectChange = (s: FormulaSubject | 'All') => {
    setSubjectFilter(s);
    setCategoryFilter('All');
    setChapterFilter('All');
  };

  const handleCategoryChange = (c: string | 'All') => {
    setCategoryFilter(c);
    setChapterFilter('All');
  };

  const handleView = useCallback(
    (id: string) => {
      addToRecentlyViewed(id);
    },
    [addToRecentlyViewed],
  );

  const handleMarkRevised = useCallback(
    (id: string) => {
      markAsRevised(id);
    },
    [markAsRevised],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Sigma size={24} className="text-accent-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Formula Vault</h1>
            <p className="text-sm text-gray-500">
              {examContext.count} formulas for <span className="text-accent-light">{examContext.label}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={() => setShowQuickRevision(true)}>
            <Shuffle size={16} />
            Quick Revision
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, formula, chapter, topic, tags, variables, synonyms..."
          className="pl-12 py-3.5 text-base"
        />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <FormulaFilters
          subject={subjectFilter}
          onSubjectChange={handleSubjectChange}
          category={categoryFilter}
          onCategoryChange={handleCategoryChange}
          chapter={chapterFilter}
          onChapterChange={setChapterFilter}
          categories={categories}
          chapters={chapters}
          difficulty={difficultyFilter}
          onDifficultyChange={setDifficultyFilter}
          importance={importanceFilter}
          onImportanceChange={setImportanceFilter}
          exam={examFilter}
          onExamChange={setExamFilter}
        />
      </GlassCard>

      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid size={14} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List size={14} />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>
            Showing <span className="text-gray-300 font-medium">{filteredFormulas.length}</span> formula
            {filteredFormulas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Favorites & Recently Viewed */}
      {(favoriteFormulas.length > 0 || recentFormulas.length > 0) && (
        <FavoritesSection
          favorites={favoriteFormulas}
          recentlyViewed={recentFormulas}
          onToggleFavorite={toggleFavorite}
          onView={handleView}
          isFavorite={isFavorite}
          isRevised={isRevised}
          isFrequentlyUsed={isFrequentlyUsed}
          onMarkRevised={handleMarkRevised}
          onAddToFrequentlyUsed={addToFrequentlyUsed}
        />
      )}

      {/* Results count */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>
          Showing <span className="text-gray-300 font-medium">{filteredFormulas.length}</span> formula
          {filteredFormulas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Formula grid or empty state */}
      {filteredFormulas.length === 0 ? (
        <EmptyState
          icon={<Star size={48} />}
          title="No formulas found"
          description="Try adjusting your search or filters to find what you're looking for."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSubjectFilter('All');
                setCategoryFilter('All');
                setChapterFilter('All');
                setDifficultyFilter('All');
                setImportanceFilter('All');
                setExamFilter('All');
              }}
            >
              Clear all filters
            </Button>
          }
        />
      ) : (
        <motion.div
          layout
          className={viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            : "flex flex-col gap-3"
          }
        >
          {filteredFormulas.map((formula, i) => (
            <motion.div
              key={formula.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
            >
              <FormulaCard
                formula={formula}
                isFavorite={isFavorite(formula.id)}
                isRevised={isRevised(formula.id)}
                isFrequentlyUsed={isFrequentlyUsed(formula.id)}
                onToggleFavorite={toggleFavorite}
                onView={handleView}
                onMarkRevised={handleMarkRevised}
                onAddToFrequentlyUsed={addToFrequentlyUsed}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Quick Revision overlay */}
      {showQuickRevision && (
        <QuickRevisionMode
          formulas={allFormulas}
          onExit={() => setShowQuickRevision(false)}
          onView={handleView}
          initialSubject={subjectFilter}
          initialChapter={chapterFilter}
          userExamId={userExamId}
        />
      )}
    </div>
  );
}
