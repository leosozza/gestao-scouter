/**
 * Test page for Fichas Module
 * Accessible at /test-fichas
 */
import { AppShell } from '@/layouts/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { FichasModuleExample } from '@/map/fichas/examples/FichasModuleExample';

export default function TestFichasPage() {
  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="p-6 h-screen">
        <FichasModuleExample />
      </div>
    </AppShell>
  );
}
