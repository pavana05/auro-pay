import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import TeenHome from "./pages/TeenHome.tsx";
import Activity from "./pages/Activity.tsx";
import CardScreen from "./pages/CardScreen.tsx";
import ProfileScreen from "./pages/ProfileScreen.tsx";
import PersonalInfo from "./pages/PersonalInfo.tsx";
import SecurityPin from "./pages/SecurityPin.tsx";
import SpendingLimits from "./pages/SpendingLimits.tsx";
import LinkedParents from "./pages/LinkedParents.tsx";
import HelpSupport from "./pages/HelpSupport.tsx";
import AboutApp from "./pages/AboutApp.tsx";
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
import AdminAuditLog from "./pages/admin/AdminAuditLog.tsx";
import AdminRoles from "./pages/admin/AdminRoles.tsx";
import AdminRewards from "./pages/admin/AdminRewards.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import Rewards from "./pages/Rewards.tsx";
import RewardDetail from "./pages/RewardDetail.tsx";
import TransactionDetailPage from "./pages/TransactionDetail.tsx";
import ExpenseAnalytics from "./pages/ExpenseAnalytics.tsx";
import BillSplitPage from "./pages/BillSplit.tsx";
import BudgetPlanner from "./pages/BudgetPlanner.tsx";
import QuickPay from "./pages/QuickPay.tsx";
import BillPayments from "./pages/BillPayments.tsx";
import ScratchCards from "./pages/ScratchCards.tsx";
import Chores from "./pages/Chores.tsx";
import Achievements from "./pages/Achievements.tsx";
import Friends from "./pages/Friends.tsx";
import SupportTickets from "./pages/SupportTickets.tsx";
import SpinWheel from "./pages/SpinWheel.tsx";
import AdminSupport from "./pages/admin/AdminSupport.tsx";
import Referrals from "./pages/Referrals.tsx";
import FinancialEducation from "./pages/FinancialEducation.tsx";
import ChatList from "./pages/ChatList.tsx";
import ChatRoom from "./pages/ChatRoom.tsx";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min - pages won't refetch if data is fresh
      gcTime: 30 * 60 * 1000, // 30 min cache
      refetchOnWindowFocus: false,
    },
  },
});

const RealtimeWrapper = ({ children }: { children: React.ReactNode }) => {
  useRealtimeNotifications();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <RealtimeWrapper>
        <PageTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<TeenHome />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/card" element={<CardScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/personal-info" element={<PersonalInfo />} />
            <Route path="/security" element={<SecurityPin />} />
            <Route path="/spending-limits" element={<SpendingLimits />} />
            <Route path="/linked-parents" element={<LinkedParents />} />
            <Route path="/help" element={<HelpSupport />} />
            <Route path="/about" element={<AboutApp />} />
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
            <Route path="/admin/audit-log" element={<AdminAuditLog />} />
            <Route path="/admin/rewards" element={<AdminRewards />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/rewards/:id" element={<RewardDetail />} />
            <Route path="/transaction/:id" element={<TransactionDetailPage />} />
            <Route path="/analytics" element={<ExpenseAnalytics />} />
            <Route path="/bill-split" element={<BillSplitPage />} />
            <Route path="/budget" element={<BudgetPlanner />} />
            <Route path="/quick-pay" element={<QuickPay />} />
            <Route path="/bill-payments" element={<BillPayments />} />
            <Route path="/scratch-cards" element={<ScratchCards />} />
            <Route path="/chores" element={<Chores />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/support" element={<SupportTickets />} />
            <Route path="/spin-wheel" element={<SpinWheel />} />
            <Route path="/admin/support" element={<AdminSupport />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/learn" element={<FinancialEducation />} />
            <Route path="/chats" element={<ChatList />} />
            <Route path="/chat/:conversationId" element={<ChatRoom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
        </RealtimeWrapper>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
