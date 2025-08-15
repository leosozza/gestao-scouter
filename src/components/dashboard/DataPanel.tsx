
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeatLoader } from 'react-spinners';

interface DataPanelProps {
  isLoading: boolean;
  processedData?: {
    tables: {
      scouters: Array<{
        scouter: string;
        fichas: number;
        meta: number;
        progresso: number;
        receita: number;
      }>;
      projetos: Array<{
        projeto: string;
        fichas: number;
        meta: number;
        progresso: number;
        receita: number;
      }>;
    };
  } | null;
}

export const DataPanel = ({ isLoading, processedData }: DataPanelProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <BeatLoader color="#4ade80" />
      </div>
    );
  }

  const tables = processedData?.tables || { scouters: [], projetos: [] };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados dos Scouters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Scouter</th>
                  <th className="text-left p-2">Fichas</th>
                  <th className="text-left p-2">Meta</th>
                  <th className="text-left p-2">Progresso</th>
                  <th className="text-left p-2">Receita</th>
                </tr>
              </thead>
              <tbody>
                {tables.scouters.map((scouter, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-medium">{scouter.scouter}</td>
                    <td className="p-2">{scouter.fichas}</td>
                    <td className="p-2">{scouter.meta}</td>
                    <td className="p-2">{scouter.progresso.toFixed(1)}%</td>
                    <td className="p-2">R$ {scouter.receita.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados dos Projetos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Projeto</th>
                  <th className="text-left p-2">Fichas</th>
                  <th className="text-left p-2">Meta</th>
                  <th className="text-left p-2">Progresso</th>
                  <th className="text-left p-2">Receita</th>
                </tr>
              </thead>
              <tbody>
                {tables.projetos.map((projeto, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-medium">{projeto.projeto}</td>
                    <td className="p-2">{projeto.fichas}</td>
                    <td className="p-2">{projeto.meta}</td>
                    <td className="p-2">{projeto.progresso.toFixed(1)}%</td>
                    <td className="p-2">R$ {projeto.receita.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
