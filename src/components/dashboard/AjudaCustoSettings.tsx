
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getAjudaCustoConfig, setAjudaCustoConfig } from "@/utils/ajudaCustoSettings";
import { DollarSign } from "lucide-react";

export const AjudaCustoSettings: React.FC = () => {
  const { toast } = useToast();
  const [values, setValues] = useState(getAjudaCustoConfig());

  useEffect(() => {
    // Carrega sempre os valores atuais do storage ao montar
    setValues(getAjudaCustoConfig());
  }, []);

  const handleSave = () => {
    const merged = setAjudaCustoConfig(values);
    setValues(merged);
    toast({
      title: "Ajuda de custo atualizada",
      description: `Próxima: R$ ${merged.proxima.toFixed(2)} • Longe: R$ ${merged.longe.toFixed(2)} • Folga Longe: R$ ${merged.folgaLonge.toFixed(2)}`
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Ajuda de Custo - Seletivas
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="ajuda-proxima">Próximas (R$)</Label>
          <Input
            id="ajuda-proxima"
            type="number"
            step="0.01"
            value={values.proxima}
            onChange={(e) => setValues((v) => ({ ...v, proxima: parseFloat(e.target.value) || 0 }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ajuda-longe">Longe (R$)</Label>
          <Input
            id="ajuda-longe"
            type="number"
            step="0.01"
            value={values.longe}
            onChange={(e) => setValues((v) => ({ ...v, longe: parseFloat(e.target.value) || 0 }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ajuda-folga-longe">Folga Remunerada Longe (R$)</Label>
          <Input
            id="ajuda-folga-longe"
            type="number"
            step="0.01"
            value={values.folgaLonge}
            onChange={(e) => setValues((v) => ({ ...v, folgaLonge: parseFloat(e.target.value) || 0 }))}
            className="mt-1"
          />
        </div>

        <div className="md:col-span-3 flex justify-end">
          <Button onClick={handleSave}>Salvar valores</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AjudaCustoSettings;

