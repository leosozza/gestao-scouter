import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { OverviewPanel } from "@/components/dashboard/OverviewPanel";
import { DataPanel } from "@/components/dashboard/DataPanel";
import { FilterPanel } from "@/components/dashboard/FilterPanel";

export const Dashboard = () => {
  const [activePanel, setActivePanel] = useState<"overview" | "data">("overview");
  const { processedData, isLoading, handleLoadView } = useDashboardData();

  const handlePanelChange = (panel: "overview" | "data") => {
    setActivePanel(panel);
  };

  const handleFiltersChange = (filters: any) => {
    console.log("New filters applied:", filters);
    handleLoadView(filters);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Painel de Gestão MaxFama</h1>

      <div className="mb-4">
        <button
          className={`mr-2 px-4 py-2 rounded ${
            activePanel === "overview"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => handlePanelChange("overview")}
        >
          Visão Geral
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activePanel === "data"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => handlePanelChange("data")}
        >
          Dados
        </button>
      </div>

      <FilterPanel onFiltersChange={handleFiltersChange} />

      {activePanel === "overview" && (
        <OverviewPanel 
          isLoading={isLoading} 
          processedData={processedData}
        />
      )}

      {activePanel === "data" && (
        <DataPanel isLoading={isLoading} processedData={processedData} />
      )}
    </div>
  );
};
