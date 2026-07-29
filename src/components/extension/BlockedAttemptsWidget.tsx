import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Globe, Trash2, TrendingUp, Clock } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { useExtension } from '../../context/ExtensionContext';

export function BlockedAttemptsWidget() {
  const { blockedAttempts, clearBlockedAttempts } = useExtension();

  const total = blockedAttempts.length;

  const domainCounts = new Map<string, number>();
  for (const a of blockedAttempts) {
    domainCounts.set(a.domain, (domainCounts.get(a.domain) || 0) + 1);
  }
  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCount = topDomains.length > 0 ? topDomains[0][1] : 1;

  const recentAttempts = blockedAttempts.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center">
              <ShieldAlert size={20} className="text-error-light" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{total}</p>
              <p className="text-xs text-gray-500">Total Blocked Attempts</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-accent-light" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{domainCounts.size}</p>
              <p className="text-xs text-gray-500">Unique Domains Blocked</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
              <Clock size={20} className="text-success-light" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{Math.round(total * 0.5)}</p>
              <p className="text-xs text-gray-500">Est. Minutes Saved</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Top Blocked Domains */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-accent-light" />
            <h3 className="text-lg font-semibold text-white">Most Frequently Blocked</h3>
          </div>
          {total > 0 && (
            <Button variant="ghost" size="sm" onClick={clearBlockedAttempts}>
              <Trash2 size={14} /> Clear
            </Button>
          )}
        </div>

        {topDomains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Globe size={28} className="text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No blocked attempts yet. Start a focus session to see analytics.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topDomains.map(([domain, count], i) => (
              <div key={domain} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-200">{domain}</span>
                    <span className="text-xs text-gray-500">{count} {count === 1 ? 'attempt' : 'attempts'}</span>
                  </div>
                  <ProgressBar
                    percentage={(count / maxCount) * 100}
                    height="h-1.5"
                    barClassName={i === 0 ? 'bg-error' : i === 1 ? 'bg-warning' : 'bg-accent'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Recent Attempts Log */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-gray-400" />
          <h3 className="text-lg font-semibold text-white">Recent Blocked Attempts</h3>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldAlert size={28} className="text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No recent attempts logged.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {recentAttempts.map((attempt) => (
                <motion.div
                  key={attempt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <ShieldAlert size={14} className="text-error-light flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{attempt.url}</p>
                    <p className="text-xs text-gray-500">{new Date(attempt.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <Badge variant="error">{attempt.domain}</Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
