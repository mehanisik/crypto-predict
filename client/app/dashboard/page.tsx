import CryptoDashboard from "@/components/features/dashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - CryptoPredict",
  description: "AI-Powered Cryptocurrency Predictions Dashboard with real-time WebSocket updates",
};

const Dashboard = () => {
  return <CryptoDashboard />;
};

export default Dashboard;
