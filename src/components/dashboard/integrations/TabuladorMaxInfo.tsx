import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, GitBranch, Zap } from "lucide-react";

export function TabuladorMaxInfo() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Sincronização Automática com TabuladorMax
            </CardTitle>
            <Badge className="bg-green-100 text-green-800">
              Ativo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Zap className="h-5 w-5 mt-0.5 text-primary" />
            <div>
              <h4 className="font-medium mb-1">Integração Automática</h4>
              <p className="text-sm text-muted-foreground">
                Este sistema busca dados diretamente do Supabase do TabuladorMax, que já possui
                triggers automáticos para sincronizar fichas com o Bitrix24. Não é necessário
                configurar integrações adicionais.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Como funciona:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Fichas são criadas no TabuladorMax pelos scouters</li>
              <li>Trigger automático sincroniza com Bitrix24</li>
              <li>Este sistema busca as fichas do mesmo Supabase</li>
              <li>Dados sempre sincronizados em tempo real</li>
            </ol>
          </div>

          <Button variant="outline" asChild className="w-full">
            <a 
              href="https://github.com/leosozza/tabuladormax" 
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Repositório TabuladorMax
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações do Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Project ID:</div>
            <div className="text-muted-foreground font-mono">ngestyxtopvfeyenyvgt</div>
            
            <div className="font-medium">URL:</div>
            <div className="text-muted-foreground font-mono text-xs">
              https://ngestyxtopvfeyenyvgt.supabase.co
            </div>
            
            <div className="font-medium">Tabela Principal:</div>
            <div className="text-muted-foreground">fichas</div>
            
            <div className="font-medium">RLS Ativo:</div>
            <Badge variant="outline" className="w-fit">Sim</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
