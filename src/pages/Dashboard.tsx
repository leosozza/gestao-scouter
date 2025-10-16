import { useState } from 'react';
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { PerformanceDashboard } from '@/components/dashboard/PerformanceDashboard'
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BulkImportPanel } from '@/components/dashboard/BulkImportPanel';
import { Upload } from 'lucide-react';

export default function Dashboard() {
  const [showBulkImport, setShowBulkImport] = useState(false);

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button 
            onClick={() => setShowBulkImport(true)}
            variant="outline"
            size="lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importação Massiva (CSV)
          </Button>
        </div>

        <PerformanceDashboard />
      </div>

      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importação Massiva de Dados</DialogTitle>
            <DialogDescription>
              Carregue um arquivo CSV ou XLSX com até 300MB para importar leads em massa
            </DialogDescription>
          </DialogHeader>
          <BulkImportPanel onComplete={() => {
            setShowBulkImport(false);
            window.location.reload();
          }} />
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}