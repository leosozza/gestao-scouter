
import { Dashboard } from "@/components/dashboard/Dashboard";

const Index = () => {
  // Função vazia para manter compatibilidade com o Dashboard
  const handleLogout = () => {
    // No futuro, será implementado o logout do Bitrix24
    console.log("Logout será implementado com integração Bitrix24");
  };

  return <Dashboard onLogout={handleLogout} />;
};

export default Index;
