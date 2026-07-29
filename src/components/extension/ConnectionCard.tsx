import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, CheckCircle2, XCircle, Loader2, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useExtension } from '../../context/ExtensionContext';
import type { ExtensionConnectionState } from '../../types';

const CHROME_STORE_URL = 'https://chromewebstore.google.com';

export function ConnectionCard() {
  const { connectionState, reconnect, focusSession } = useExtension();

  const config: Record<ExtensionConnectionState, { icon: typeof Puzzle; color: string; bg: string; label: string; desc: string }> = {
    checking: { icon: Loader2, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', label: 'Checking...', desc: 'Looking for the StudyShield extension' },
    connected: { icon: CheckCircle2, color: 'text-success-light', bg: 'bg-success/10 border-success/20', label: 'Connected', desc: 'Extension is active and syncing' },
    disconnected: { icon: XCircle, color: 'text-error-light', bg: 'bg-error/10 border-error/20', label: 'Not Connected', desc: 'Install the extension to enable website blocking' },
  };

  const current = config[connectionState];
  const isChecking = connectionState === 'checking';
  const isConnected = connectionState === 'connected';
  const isDisconnected = connectionState === 'disconnected';
  const sessionActive = focusSession.active;
  const lostDuringSession = !isConnected && sessionActive;

  return (
    <GlassCard className="p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-accent/5 blur-[60px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${current.bg}`}>
              <current.icon size={24} className={`${current.color} ${isChecking ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Chrome Extension</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={isConnected ? 'success' : isDisconnected ? 'error' : 'default'}>
                  {current.label}
                </Badge>
                {isConnected && sessionActive && <Badge variant="accent">Session Active</Badge>}
              </div>
            </div>
          </div>
          <Puzzle size={28} className="text-gray-600" />
        </div>

        <p className="text-sm text-gray-400 mb-4">{current.desc}</p>

        <AnimatePresence>
          {lostDuringSession && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 flex items-start gap-2.5"
            >
              <AlertTriangle size={18} className="text-error-light flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error-light">Extension disconnected during active session!</p>
                <p className="text-xs text-gray-400 mt-0.5">Website blocking is no longer active. Reconnect to resume blocking.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {isDisconnected && (
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Button size="sm"><Download size={16} /> Install Extension</Button>
            </a>
          )}
          {(isDisconnected || isConnected) && (
            <Button variant="secondary" size="sm" onClick={reconnect}>
              <RefreshCw size={16} /> Reconnect
            </Button>
          )}
          {isChecking && (
            <Button variant="ghost" size="sm" disabled>
              <Loader2 size={16} className="animate-spin" /> Detecting...
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
