
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Copy, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const BitrixOAuthHelper = () => {
  const [domain, setDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();

  const generateAuthUrl = () => {
    if (!domain || !clientId || !clientSecret) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos antes de gerar a URL",
        variant: "destructive"
      });
      return;
    }

    const baseUrl = domain.replace(/https?:\/\//, '').replace(/\/$/, '');
    const callbackUrl = `${window.location.origin}/bitrix-callback`;
    
    const authUrl = new URL(`https://${baseUrl}/oauth/authorize/`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', callbackUrl);
    authUrl.searchParams.append('scope', 'crm');
    authUrl.searchParams.append('state', btoa(JSON.stringify({ 
      domain: baseUrl, 
      client_id: clientId, 
      client_secret: clientSecret 
    })));

    // Abrir em nova janela
    const popup = window.open(
      authUrl.toString(), 
      'bitrix-oauth', 
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      // Fallback se popup foi bloqueado
      window.location.href = authUrl.toString();
    }
  };

  const copyCallbackUrl = () => {
    const callbackUrl = `${window.location.origin}/bitrix-callback`;
    navigator.clipboard.writeText(callbackUrl);
    toast({
      title: "Copiado!",
      description: "URL de callback copiada para a área de transferência"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistente OAuth Bitrix24</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Este assistente irá gerar a URL de autorização OAuth e processar o callback automaticamente.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div>
            <Label htmlFor="oauth-domain">Domínio do Bitrix24</Label>
            <Input
              id="oauth-domain"
              placeholder="maxsystem.bitrix24.com.br"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="oauth-client-id">Client ID (ID do Aplicativo)</Label>
            <Input
              id="oauth-client-id"
              placeholder="local.689f3e46a14f92.86357412"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="oauth-client-secret">Client Secret (Chave do Aplicativo)</Label>
            <Input
              id="oauth-client-secret"
              type="password"
              placeholder="lyVHt4dqH7QRpRxdXyVnY56sKzLnEnJDrdXMiR7B9iy6Y8tnPb"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>URL de Callback (use esta no seu app Bitrix24)</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/bitrix-callback`}
                className="bg-muted"
              />
              <Button size="sm" variant="outline" onClick={copyCallbackUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button onClick={generateAuthUrl} className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />
          Gerar URL de Autorização e Abrir
        </Button>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Passos:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Configure seu aplicativo local no Bitrix24 com a URL de callback acima</li>
              <li>Preencha os campos Client ID e Client Secret</li>
              <li>Clique em "Gerar URL de Autorização"</li>
              <li>Autorize o aplicativo no Bitrix24</li>
              <li>Copie o Refresh Token da página de callback</li>
              <li>Use o Refresh Token na configuração da integração</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
