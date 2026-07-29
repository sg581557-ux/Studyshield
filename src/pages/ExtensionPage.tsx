import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ConnectionCard } from '../components/extension/ConnectionCard';
import { FocusSessionWidget } from '../components/extension/FocusSessionWidget';
import { BlockedAttemptsWidget } from '../components/extension/BlockedAttemptsWidget';
import { BlockedSitesManager } from '../components/extension/BlockedSitesManager';

export default function ExtensionPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Chrome Extension</h1>
          <p className="text-sm text-gray-500 mt-1">Manage focus sessions, website blocking, and view analytics</p>
        </div>
        <ConnectionCard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FocusSessionWidget />
          <div>
            <BlockedSitesManager />
          </div>
        </div>
        <BlockedAttemptsWidget />
      </div>
    </DashboardLayout>
  );
}
