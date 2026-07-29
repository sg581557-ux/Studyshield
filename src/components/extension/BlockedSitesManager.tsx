import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Globe, Shield, Lock, Clock } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { useExtension } from '../../context/ExtensionContext';

export function BlockedSitesManager() {
  const { blockedSites, addBlockedSite, removeBlockedSite, strictMode, setStrictMode, focusSession } = useExtension();
  const [newSite, setNewSite] = useState('');

  const handleAdd = () => {
    if (newSite.trim()) {
      addBlockedSite(newSite.trim());
      setNewSite('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const isStrictLocked = focusSession.active && strictMode;

  return (
    <div className="space-y-6">
      {/* Blocked Sites List */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-accent-light" />
            <h3 className="text-lg font-semibold text-white">Blocked Websites</h3>
          </div>
          <Badge variant="default">{blockedSites.length} sites</Badge>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. youtube.com"
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={!newSite.trim()}>
            <Plus size={16} /> Add
          </Button>
        </div>

        {blockedSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Shield size={28} className="text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No blocked websites. Add sites above to block them during focus sessions.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {blockedSites.map((site) => (
                <motion.div
                  key={site}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]"
                >
                  <Globe size={12} className="text-gray-500" />
                  <span className="text-sm text-gray-200">{site}</span>
                  <button
                    onClick={() => removeBlockedSite(site)}
                    disabled={isStrictLocked}
                    className="text-gray-500 hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={isStrictLocked ? 'Cannot remove during strict mode session' : 'Remove'}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>

      {/* Strict Mode Settings */}
      <GlassCard className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${strictMode ? 'bg-purple/10 border-purple/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <Lock size={20} className={strictMode ? 'text-purple-light' : 'text-gray-500'} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Strict Mode</h3>
              <p className="text-sm text-gray-400 mt-1">
                When enabled, the extension cannot be disabled or paused during an active focus session. Blocking continues until the session ends from the website.
              </p>
              {isStrictLocked && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Lock size={12} className="text-purple-light" />
                  <span className="text-xs text-purple-light">Locked during active session</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setStrictMode(!strictMode)}
            disabled={isStrictLocked}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${strictMode ? 'bg-purple' : 'bg-base-600'}`}
          >
            <motion.div
              layout
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
              animate={{ left: strictMode ? '26px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </GlassCard>

      {/* Focus Time Stats */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-accent-light" />
          <h3 className="text-lg font-semibold text-white">Focus Time</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-3xl font-bold text-white">{Math.floor(useExtension().totalFocusMinutes / 60)}h {useExtension().totalFocusMinutes % 60}m</p>
            <p className="text-xs text-gray-500 mt-1">Total Focus Time</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-3xl font-bold text-white">{blockedSites.length}</p>
            <p className="text-xs text-gray-500 mt-1">Sites in Blocklist</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
