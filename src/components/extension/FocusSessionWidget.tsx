import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Shield, ShieldOff, Lock } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input, Label } from '../ui/Input';
import { useExtension } from '../../context/ExtensionContext';

const PRESETS = [15, 25, 50, 90];

export function FocusSessionWidget() {
  const { focusSession, startFocusSession, stopFocusSession, strictMode, setStrictMode, connectionState } = useExtension();
  const [duration, setDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState('');

  const isActive = focusSession.active;
  const remaining = focusSession.remainingSeconds;
  const total = focusSession.durationMinutes * 60;
  const progress = total > 0 ? 1 - remaining / total : 0;
  const circumference = 2 * Math.PI * 70;
  const dashOffset = circumference * (1 - progress);

  const displayMin = Math.floor(remaining / 60);
  const displaySec = remaining % 60;

  const handleStart = () => {
    const dur = customDuration ? parseInt(customDuration, 10) : duration;
    if (dur > 0 && dur <= 300) {
      startFocusSession(dur, focusSession.blockedSites.length > 0 ? focusSession.blockedSites : [], strictMode);
    }
  };

  const handleStop = () => stopFocusSession();

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className={isActive ? 'text-accent-light' : 'text-gray-500'} />
          <h2 className="text-lg font-semibold text-white">Focus Session</h2>
        </div>
        {isActive ? (
          <Badge variant="accent">Active</Badge>
        ) : (
          <Badge variant="default">Idle</Badge>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex justify-center mb-4">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle cx="80" cy="80" r="70" fill="none" stroke="url(#focusGradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 1s linear' }} />
                  <defs>
                    <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white tabular-nums">{displayMin}:{displaySec.toString().padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500 mt-1">remaining</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-4">
              {strictMode && (
                <Badge variant="purple"><Lock size={10} /> Strict Mode</Badge>
              )}
              <Badge variant="default">{focusSession.blockedSites.length} sites blocked</Badge>
            </div>

            <div className="flex justify-center">
              <Button variant="danger" size="md" onClick={handleStop}>
                <Square size={16} /> End Session
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex justify-center gap-2 mb-4">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => { setDuration(m); setCustomDuration(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${duration === m && !customDuration ? 'bg-accent/10 text-accent-light border border-accent/20' : 'bg-white/[0.03] text-gray-400 border border-white/[0.06] hover:text-white'}`}
                >
                  {m}m
                </button>
              ))}
            </div>

            <div className="mb-4">
              <Label>Custom duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={300}
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder={`Default: ${duration}m`}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-4">
              <div className="flex items-center gap-2">
                {strictMode ? <Lock size={16} className="text-purple-light" /> : <ShieldOff size={16} className="text-gray-500" />}
                <div>
                  <p className="text-sm font-medium text-white">Strict Mode</p>
                  <p className="text-xs text-gray-500">Cannot disable extension during session</p>
                </div>
              </div>
              <button
                onClick={() => setStrictMode(!strictMode)}
                className={`relative w-10 h-5 rounded-full transition-colors ${strictMode ? 'bg-purple' : 'bg-base-600'}`}
              >
                <motion.div
                  layout
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
                  animate={{ left: strictMode ? '22px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            <div className="flex justify-center">
              <Button size="md" onClick={handleStart} disabled={connectionState === 'checking'}>
                <Play size={16} /> Start Focus Session
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
