import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export function Logo() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 group">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent/20 group-hover:shadow-accent/30 transition-shadow"><Shield size={20} className="text-white" /></div>
      <span className="text-lg font-semibold text-white tracking-tight">Study<span className="text-accent-light">Shield</span></span>
    </Link>
  );
}
