import { motion } from 'framer-motion';
import { Star, Clock, History, CheckCircle, CircleHelp } from 'lucide-react';
import type { Formula } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { FormulaDisplay } from './LaTeXRenderer';

interface FavoritesSectionProps {
  favorites: Formula[];
  recentlyViewed: Formula[];
  onToggleFavorite: (id: string) => void;
  onView: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isRevised: (id: string) => boolean;
  isFrequentlyUsed: (id: string) => boolean;
  onMarkRevised: (id: string) => void;
  onAddToFrequentlyUsed: (id: string) => void;
}

function CompactFormulaCard({
  formula,
  isFavorite,
  isRevised,
  onToggleFavorite,
  onView,
  onMarkRevised,
}: {
  formula: Formula;
  isFavorite: boolean;
  isRevised: boolean;
  onToggleFavorite: (id: string) => void;
  onView: (id: string) => void;
  onMarkRevised: (id: string) => void;
}) {
  return (
    <GlassCard
      hover
      className="p-4 min-w-[240px] w-[240px] shrink-0 cursor-pointer flex flex-col gap-2"
      onClick={() => onView(formula.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="default" className="text-xs">{formula.subject}</Badge>
          <Badge variant="default" className="text-xs">{formula.difficulty}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRevised(formula.id);
            }}
            className="p-0.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label={isRevised ? 'Mark as not revised' : 'Mark as revised'}
            title={isRevised ? 'Mark as not revised' : 'Mark as revised'}
          >
            {isRevised ? (
              <CheckCircle size={12} className="text-success-light" />
            ) : (
              <CircleHelp size={12} className="text-gray-500 hover:text-gray-300" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(formula.id);
            }}
            className="p-0.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Toggle favorite"
          >
            <Star
              size={14}
              className={isFavorite ? 'text-warning fill-warning' : 'text-gray-600 hover:text-gray-400'}
            />
          </button>
        </div>
      </div>
      <h4 className="text-sm font-semibold text-white leading-snug truncate">{formula.name}</h4>
      <div className="font-mono text-sm text-accent-light truncate text-center py-2">
        <FormulaDisplay formula={formula} displayMode={true} />
      </div>
      <p className="text-xs text-gray-500 truncate">{formula.chapter}</p>
    </GlassCard>
  );
}

export function FavoritesSection({
  favorites,
  recentlyViewed,
  onToggleFavorite,
  onView,
  isFavorite,
  isRevised,
  onMarkRevised,
  onAddToFrequentlyUsed,
}: FavoritesSectionProps) {
  if (favorites.length === 0 && recentlyViewed.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star size={18} className="text-warning fill-warning" />
            <h2 className="text-base font-semibold text-white">Favorites</h2>
            <span className="text-xs text-gray-500">({favorites.length})</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {favorites.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <CompactFormulaCard
                  formula={f}
                  isFavorite={isFavorite(f.id)}
                  isRevised={isRevised(f.id)}
                  onToggleFavorite={onToggleFavorite}
                  onView={onView}
                  onMarkRevised={onMarkRevised}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History size={18} className="text-accent-light" />
            <h2 className="text-base font-semibold text-white">Recently Viewed</h2>
            <span className="text-xs text-gray-500">({recentlyViewed.length})</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {recentlyViewed.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <CompactFormulaCard
                  formula={f}
                  isFavorite={isFavorite(f.id)}
                  isRevised={isRevised(f.id)}
                  onToggleFavorite={onToggleFavorite}
                  onView={onView}
                  onMarkRevised={onMarkRevised}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty favorites hint */}
      {favorites.length === 0 && recentlyViewed.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock size={14} />
          <span>Tap the star icon on any formula to add it to your favorites.</span>
        </div>
      )}
    </div>
  );
}