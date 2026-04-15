import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import TeenHome from "./pages/TeenHome.tsx";
import Activity from "./pages/Activity.tsx";
import CardScreen from "./pages/CardScreen.tsx";
import ProfileScreen from "./pages/ProfileScreen.tsx";
import SavingsGoals from "./pages/SavingsGoals.tsx";
import Notifications from "./pages/Notifications.tsx";
import ScanPay from "./pages/ScanPay.tsx";
import AddMoney from "./pages/AddMoney.tsx";
import ParentHome from "./pages/ParentHome.tsx";
import ParentTeenDetail from "./pages/ParentTeenDetail.tsx";
import ParentAddMoney from "./pages/ParentAddMoney.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminTransactions from "./pages/admin/AdminTransactions.tsx";
import AdminKyc from "./pages/admin/AdminKyc.tsx";
import AdminWallets from "./pages/admin/AdminWallets.tsx";
import AdminNotifications from "./pages/admin/AdminNotifications.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminActivityLog from "./pages/admin/AdminActivityLog.tsx";
import AdminRoles from "./pages/admin/AdminRoles.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<TeenHome />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/card" element={<CardScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/savings" element={<SavingsGoals />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/scan" element={<ScanPay />} />
          <Route path="/add-money" element={<AddMoney />} />
          <Route path="/parent" element={<ParentHome />} />
          <Route path="/parent/teen/:teenId" element={<ParentTeenDetail />} />
          <Route path="/parent/add-money" element={<ParentAddMoney />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/roles" element={<AdminRoles />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/kyc" element={<AdminKyc />} />
          <Route path="/admin/wallets" element={<AdminWallets />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/activity-log" element={<AdminActivityLog />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
