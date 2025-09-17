
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Sheet } from 'lucide-react';
import { getDataSource, setDataSource, type DataSource } from '@/repositories/datasource';

export function DataSourceSelector() {
  const value = getDataSource()
  
  return (
    <Select 
      defaultValue={value} 
      onValueChange={(v: DataSource) => { 
        setDataSource(v); 
        window.location.reload(); 
      }}
    >
      <SelectTrigger className="w-44 rounded-xl">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sheets">
          <div className="flex items-center gap-2">
            <Sheet className="h-4 w-4" />
            Google Sheets
          </div>
        </SelectItem>
        <SelectItem value="bitrix">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Bitrix24
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
