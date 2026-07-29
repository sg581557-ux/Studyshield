import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Sigma, Shuffle, Star } from 'lucide-react';
import type { Formula, FormulaSubject } from '../../types';
import { allFormulas, getFormulaCategories, getChaptersByCategory, getFormulaById } from '../../data/formulas';
import { useFormulaVault } from '../../context/FormulaVaultContext';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { FormulaCard } from './FormulaCard';
import { FormulaFilters } from './FormulaFilters';
import { FavoritesSection } from './FavoritesSection';
import { QuickRevisionMode } from './QuickRevisionMode';

export function FormulaVault() {
  const { favorites: favIds, recentlyViewed: recentIds, toggleFavorite, isFavorite, addToRecentlyViewed } = useFormulaVault();

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<FormulaSubject | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string | 'All'>('All');
  const [chapterFilter, setChapterFilter] = useState<string | 'All'>('All');
  const [showQuickRevision, setShowQuickRevision] = useState(false);

  // Cascading filter options
  const categories = useMemo(
    () => (subjectFilter === 'All' ? [] : getFormulaCategories(subjectFilter)),
    [subjectFilter],
  );

  const chapters = useMemo(
    () =>
      subjectFilter !== 'All' && categoryFilter !== 'All'
        ? getChaptersByCategory(subjectFilter, categoryFilter as Formula['category'])
        : [],
    [subjectFilter, categoryFilter],
  );

  // Resolve favorites and recently viewed into Formula objects
  const favoriteFormulas = useMemo(
    () => favIds.map((id) => getFormulaById(id)).filter((f): f is Formula => f !== undefined),
    [favIds],
  );

  const recentFormulas = useMemo(
    () => recentIds.map((id) => getFormulaById(id)).filter((f): f is Formula => f !== undefined),
    [recentIds],
  );

  // Main filtering logic: subject → category → chapter → search
  const filteredFormulas = useMemo(() => {
    let result = allFormulas;

    if (subjectFilter !== 'All') {
      result = result.filter((f) => f.subject === subjectFilter);
    }
    if (categoryFilter !== 'All') {
      result = result.filter((f) => f.category === categoryFilter);
    }
    if (chapterFilter !== 'All') {
      result = result.filter((f) => f.chapter === chapterFilter);
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.formula.toLowerCase().includes(q) ||
          f.chapter.toLowerCase().includes(q) ||
          (f.notes?.toLowerCase().includes(q) ?? false) ||
          (f.jeeTip?.toLowerCase().includes(q) ?? false),
      );
    }

    return result;
  }, [subjectFilter, categoryFilter, chapterFilter, searchQuery]);

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
            <p className="text-sm text-gray-500">{allFormulas.length} formulas across all subjects</p>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowQuickRevision(true)}>
          <Shuffle size={16} />
          Quick Revision
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, formula, chapter, notes, or JEE tips..."
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
        />
      </GlassCard>

      {/* Favorites & Recently Viewed */}
      {(favoriteFormulas.length > 0 || recentFormulas.length > 0) && (
        <FavoritesSection
          favorites={favoriteFormulas}
          recentlyViewed={recentFormulas}
          onToggleFavorite={toggleFavorite}
          onView={handleView}
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
          icon={Star}
          title="No formulas found"
          message="Try adjusting your search or filters to find what you're looking for."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSubjectFilter('All');
                setCategoryFilter('All');
                setChapterFilter('All');
              }}
            >
              Clear all filters
            </Button>
          }
        />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
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
                onToggleFavorite={toggleFavorite}
                onView={handleView}
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
        />
      )}
    </div>
  );
}
