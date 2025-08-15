
import { useState } from 'react';

export interface DashboardFilters {
  dateRange?: { from: Date; to: Date };
  scouter?: string;
  location?: string;
  project?: string;
}

export const useDashboardData = () => {
  const [processedData, setProcessedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadView = (viewData: any) => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setProcessedData(viewData);
      setIsLoading(false);
    }, 1000);
  };

  return {
    processedData,
    isLoading,
    handleLoadView
  };
};
