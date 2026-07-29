import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Puzzle, Shield, ShieldAlert, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { useExtension } from '../../context/ExtensionContext';

export function ExtensionDashboardSection() {
  const { connectionState, focusSession, blockedAttempts, totalFocusMinutes, blockedSites } = useExtension();

  const isConnected = connectionState === 'connected';
  const isChecking = connectionState === 'checking';
  const sessionActive = focusSession.active;
  const totalBlocked = blockedAttempts.length;
  const topDomain = (() => {
    const counts = new Map<string, number>();
    for (const a of blockedAttempts) counts.set(a.domain, (counts.get(a.domain) || 0) + 1);
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  })();

  return (
    <GlassCard className="p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/5 blur-[80px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${isConnected ? 'bg-success/10 border-success/20' : isChecking ? 'bg-gray-500/10 border-gray-500/20' : 'bg-error/10 border-error/20'}`}>
              <Puzzle size={22} className={isConnected ? 'text-success-light' : isChecking ? 'text-gray-400' : 'text-error-light'} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Chrome Extension</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {isConnected ? (
                  <Badge variant="success">Connected</Badge>
                ) : isChecking ? (
                  <Badge variant="default">Detecting...</Badge>
                ) : (
                  <Badge variant="error">Not Connected</Badge>
                )}
                {sessionActive && <Badge variant="accent">Session Active</Badge>}
              </div>
            </div>
          </div>
          <Link to="/extension" className="text-sm text-accent-light hover:text-accent transition-colors flex items-center gap-1">
            Manage <ArrowRight size={14} />
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            icon={Shield}
            label="Session"
            value={sessionActive ? `${Math.floor(focusSession.remainingSeconds / 60)}m left` : 'Idle'}
            color={sessionActive ? 'text-accent-light' : 'text-gray-500'}
            bg={sessionActive ? 'bg-accent/10 border-accent/20' : 'bg-white/[0.03] border-white/[0.06]'}
          />
          <StatTile
            icon={ShieldAlert}
            label="Blocked"
            value={totalBlocked.toString()}
            color={totalBlocked > 0 ? 'text-error-light' : 'text-gray-500'}
            bg={totalBlocked > 0 ? 'bg-error/10 border-error/20' : 'bg-white/[0.03] border-white/[0.06]'}
          />
          <StatTile
            icon={Clock}
            label="Focus Time"
            value={totalFocusMinutes >= 60 ? `${Math.floor(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60}m` : `${totalFocusMinutes}m`}
            color="text-success-light"
            bg="bg-success/10 border-success/20"
          />
          <StatTile
            icon={TrendingUp}
            label="Top Blocked"
            value={topDomain || '—'}
            color={topDomain ? 'text-warning-light' : 'text-gray-500'}
            bg={topDomain ? 'bg-warning/10 border-warning/20' : 'bg-white/[0.03] border-white/[0.06]'}
          />
        </div>

        {/* Blocked Sites Preview */}
        {blockedSites.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-gray-500 mb-2">Blocking {blockedSites.length} websites during focus sessions</p>
            <div className="flex flex-wrap gap-1.5">
              {blockedSites.slice(0, 6).map((site) => (
                <span key={site} className="text-xs px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-gray-400">
                  {site}
                </span>
              ))}
              {blockedSites.length > 6 && (
                <span className="text-xs px-2 py-1 text-gray-500">+{blockedSites.length - 6} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function StatTile({ icon: Icon, label, value, color, bg }: { icon: typeof Shield; label: string; value: string; color: string; bg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl border ${bg}`}
    >
      <Icon size={16} className={color} />
      <p className="text-sm font-semibold text-white mt-1.5 truncate">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </motion.div>
  );
}
