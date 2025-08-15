
import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Dashboard } from "@/components/dashboard/Dashboard";

const Index = () => {
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem('maxfama_auth_token')
  );

  const handleLogin = (token: string) => {
    localStorage.setItem('maxfama_auth_token', token);
    setAuthToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('maxfama_auth_token');
    setAuthToken(null);
  };

  if (!authToken) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <Dashboard />;
};

export default Index;
