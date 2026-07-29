import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ModuleDashboard } from '../components/ModuleTracker/ModuleDashboard';

export default function ModuleTrackerPage() {
  return (
    <DashboardLayout>
      <ModuleDashboard />
    </DashboardLayout>
  );
}
