import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Lazy load page components for better code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjecaoPage = lazy(() => import("./pages/Projecao"));
const Leads = lazy(() => import("./pages/Leads"));
const Scouters = lazy(() => import("./pages/Scouters"));
const Pagamentos = lazy(() => import("./pages/Pagamentos"));
const AreaDeAbordagem = lazy(() => import("./pages/AreaDeAbordagem"));
const ConfiguracoesPage = lazy(() => import("./pages/Configuracoes"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BitrixCallback = lazy(() => import("./pages/BitrixCallback"));
// TestFichas route disabled - functionality now integrated in /area-de-abordagem
// const TestFichas = lazy(() => import("./pages/TestFichas"));

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            {/* TestFichas route disabled - functionality now in /area-de-abordagem */}
            {/* <Route path="/test-fichas" element={<TestFichas />} /> */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
