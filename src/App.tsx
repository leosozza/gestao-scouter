import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AIProviderRoot } from "@/components/ai/AIProviderRoot"; // <-- import nomeado correto

// Lazy load page components for better code splitting
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const ProjecaoPage = React.lazy(() => import("./pages/Projecao"));
const Leads = React.lazy(() => import("./pages/Leads"));
const Scouters = React.lazy(() => import("./pages/Scouters"));
const Pagamentos = React.lazy(() => import("./pages/Pagamentos"));
const AreaDeAbordagem = React.lazy(() => import("./pages/AreaDeAbordagem"));
const ConfiguracoesPage = React.lazy(() => import("./pages/Configuracoes"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const BitrixCallback = React.lazy(() => import("./pages/BitrixCallback"));

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
  </div>
);

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Envolve a aplicação com o provider que injeta o botão/painel global */}
        <AIProviderRoot>
          <Suspense fallback={<LoadingSpinner />}> 
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projecao" element={<ProjecaoPage />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/scouters" element={<Scouters />} />
              <Route path="/pagamentos" element={<Pagamentos />} />
              <Route path="/area-de-abordagem" element={<AreaDeAbordagem />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              <Route path="/bitrix-callback" element={<BitrixCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AIProviderRoot>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;