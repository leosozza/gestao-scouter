import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ProjecaoPage from "./pages/Projecao";
import Leads from "./pages/Leads";
import Scouters from "./pages/Scouters";
import Pagamentos from "./pages/Pagamentos";
import ConfiguracoesPage from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import BitrixCallback from "./pages/BitrixCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projecao" element={<ProjecaoPage />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/scouters" element={<Scouters />} />
          <Route path="/pagamentos" element={<Pagamentos />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/bitrix-callback" element={<BitrixCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
