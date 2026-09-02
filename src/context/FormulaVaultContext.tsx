/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { FormulaVaultData } from '../types';
import { loadFormulaVault, saveFormulaVault } from '../lib/storage';
import { useAuth } from './AuthContext';

interface FormulaVaultCtx extends FormulaVaultData {
  favorites: string[];
  recentlyViewed: string[];
  revisionList: string[];
  frequentlyUsed: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addToRecentlyViewed: (id: string) => void;
  clearRecentlyViewed: () => void;
  addToRevisionList: (id: string) => void;
  removeFromRevisionList: (id: string) => void;
  clearRevisionList: () => void;
  isRevised: (id: string) => boolean;
  addToFrequentlyUsed: (id: string) => void;
  isFrequentlyUsed: (id: string) => boolean;
  markAsRevised: (id: string) => void;
}

const FormulaVaultContext = createContext<FormulaVaultCtx | undefined>(undefined);

export function FormulaVaultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<FormulaVaultData>(() => user
    ? loadFormulaVault(user.id)
    : { favorites: [], recentlyViewed: [], revisionList: [], frequentlyUsed: [] });

  useEffect(() => {
    setData(user
      ? loadFormulaVault(user.id)
      : { favorites: [], recentlyViewed: [], revisionList: [], frequentlyUsed: [] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const persist = useCallback((updater: (prev: FormulaVaultData) => FormulaVaultData) => {
    setData((prev) => {
      const nd = updater(prev);
      if (user) saveFormulaVault(user.id, nd);
      return nd;
    });
  }, [user]);

  const toggleFavorite = useCallback((id: string) => {
    persist((prev) => {
      const favs = prev.favorites.includes(id)
        ? prev.favorites.filter((f) => f !== id)
        : [...prev.favorites, id];
      return { ...prev, favorites: favs };
    });
  }, [persist]);

  const isFavorite = useCallback((id: string) => data.favorites.includes(id), [data.favorites]);

  const addToRecentlyViewed = useCallback((id: string) => {
    persist((prev) => {
      const filtered = prev.recentlyViewed.filter((r) => r !== id);
      return { ...prev, recentlyViewed: [id, ...filtered].slice(0, 20) };
    });
  }, [persist]);

  const clearRecentlyViewed = useCallback(() => persist((prev) => ({ ...prev, recentlyViewed: [] })), [persist]);

  const addToRevisionList = useCallback((id: string) => {
    persist((prev) => {
      if (prev.revisionList.includes(id)) return prev;
      return { ...prev, revisionList: [...prev.revisionList, id] };
    });
  }, [persist]);

  const removeFromRevisionList = useCallback((id: string) => {
    persist((prev) => ({ ...prev, revisionList: prev.revisionList.filter((r) => r !== id) }));
  }, [persist]);

  const clearRevisionList = useCallback(() => persist((prev) => ({ ...prev, revisionList: [] })), [persist]);

  const isRevised = useCallback((id: string) => data.revisionList.includes(id), [data.revisionList]);

  const addToFrequentlyUsed = useCallback((id: string) => {
    persist((prev) => {
      const filtered = prev.frequentlyUsed.filter((f) => f !== id);
      return { ...prev, frequentlyUsed: [id, ...filtered].slice(0, 50) };
    });
  }, [persist]);

  const isFrequentlyUsed = useCallback((id: string) => data.frequentlyUsed.includes(id), [data.frequentlyUsed]);

  const markAsRevised = useCallback((id: string) => {
    persist((prev) => {
      if (prev.revisionList.includes(id)) {
        return { ...prev, revisionList: prev.revisionList.filter((r) => r !== id) };
      }
      return { ...prev, revisionList: [...prev.revisionList, id] };
    });
  }, [persist]);

  return (
    <FormulaVaultContext.Provider value={{
      ...data,
      toggleFavorite, isFavorite, addToRecentlyViewed, clearRecentlyViewed,
      addToRevisionList, removeFromRevisionList, clearRevisionList, isRevised,
      addToFrequentlyUsed, isFrequentlyUsed, markAsRevised,
    }}>
      {children}
    </FormulaVaultContext.Provider>
  );
}

export function useFormulaVault() {
  const ctx = useContext(FormulaVaultContext);
  if (!ctx) throw new Error('useFormulaVault must be used within FormulaVaultProvider');
  return ctx;
}
