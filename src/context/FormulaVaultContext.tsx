import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
  const [data, setData] = useState<FormulaVaultData>({
    favorites: [],
    recentlyViewed: [],
    revisionList: [],
    frequentlyUsed: [],
  });

  useEffect(() => {
    if (!user) {
      setData({ favorites: [], recentlyViewed: [], revisionList: [], frequentlyUsed: [] });
      return;
    }
    setData(loadFormulaVault(user.id));
  }, [user]);

  const persist = useCallback((nd: FormulaVaultData) => {
    setData(nd);
    if (user) saveFormulaVault(user.id, nd);
  }, [user]);

  const toggleFavorite = (id: string) => {
    const favs = data.favorites.includes(id)
      ? data.favorites.filter((f) => f !== id)
      : [...data.favorites, id];
    persist({ ...data, favorites: favs });
  };

  const isFavorite = (id: string) => data.favorites.includes(id);

  const addToRecentlyViewed = (id: string) => {
    const filtered = data.recentlyViewed.filter((r) => r !== id);
    persist({ ...data, recentlyViewed: [id, ...filtered].slice(0, 20) });
  };

  const clearRecentlyViewed = () => persist({ ...data, recentlyViewed: [] });

  const addToRevisionList = (id: string) => {
    if (data.revisionList.includes(id)) return;
    persist({ ...data, revisionList: [...data.revisionList, id] });
  };

  const removeFromRevisionList = (id: string) => {
    persist({ ...data, revisionList: data.revisionList.filter((r) => r !== id) });
  };

  const clearRevisionList = () => persist({ ...data, revisionList: [] });

  const isRevised = (id: string) => data.revisionList.includes(id);

  const addToFrequentlyUsed = (id: string) => {
    const filtered = data.frequentlyUsed.filter((f) => f !== id);
    persist({ ...data, frequentlyUsed: [id, ...filtered].slice(0, 50) });
  };

  const isFrequentlyUsed = (id: string) => data.frequentlyUsed.includes(id);

  const markAsRevised = (id: string) => {
    if (data.revisionList.includes(id)) {
      removeFromRevisionList(id);
    } else {
      addToRevisionList(id);
    }
  };

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
