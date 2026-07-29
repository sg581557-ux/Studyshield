import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { FormulaVaultData } from '../types';
import { loadFormulaVault, saveFormulaVault } from '../lib/storage';
import { useAuth } from './AuthContext';

interface FormulaVaultCtx extends FormulaVaultData {
  favorites: string[];
  recentlyViewed: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addToRecentlyViewed: (id: string) => void;
  clearRecentlyViewed: () => void;
}

const FormulaVaultContext = createContext<FormulaVaultCtx | undefined>(undefined);

export function FormulaVaultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<FormulaVaultData>({ favorites: [], recentlyViewed: [] });

  useEffect(() => {
    if (!user) { setData({ favorites: [], recentlyViewed: [] }); return; }
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

  return (
    <FormulaVaultContext.Provider value={{
      ...data,
      toggleFavorite, isFavorite, addToRecentlyViewed, clearRecentlyViewed,
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
