import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import TeenHome from "./pages/TeenHome.tsx";
import Activity from "./pages/Activity.tsx";
import CardScreen from "./pages/CardScreen.tsx";
import ProfileScreen from "./pages/ProfileScreen.tsx";
import PersonalInfo from "./pages/PersonalInfo.tsx";
import SecurityPin from "./pages/SecurityPin.tsx";
import SpendingLimits from "./pages/SpendingLimits.tsx";
import LinkedParents from "./pages/LinkedParents.tsx";
import LinkedTeens from "./pages/LinkedTeens.tsx";
import ParentControls from "./pages/ParentControls.tsx";
import HelpSupport from "./pages/HelpSupport.tsx";
import AboutApp from "./pages/AboutApp.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import DataSafety from "./pages/DataSafety.tsx";
import SavingsGoals from "./pages/SavingsGoals.tsx";
import Notifications from "./pages/Notifications.tsx";
import ScanPay from "./pages/ScanPay.tsx";
import PaymentConfirm from "./pages/PaymentConfirm.tsx";
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
import AdminSupport from "./pages/admin/AdminSupport.tsx";
import AdminParentLinks from "./pages/admin/AdminParentLinks.tsx";
import AdminFlagged from "./pages/admin/AdminFlagged.tsx";
import AdminPayouts from "./pages/admin/AdminPayouts.tsx";
import AdminRefunds from "./pages/admin/AdminRefunds.tsx";
import AdminSpendingLimits from "./pages/admin/AdminSpendingLimits.tsx";
import AdminSavingsOversight from "./pages/admin/AdminSavingsOversight.tsx";
import AdminPocketMoney from "./pages/admin/AdminPocketMoney.tsx";
import AdminRevenue from "./pages/admin/AdminRevenue.tsx";
import AdminHealth from "./pages/admin/AdminHealth.tsx";
import AdminGeographic from "./pages/admin/AdminGeographic.tsx";
import AdminReports from "./pages/admin/AdminReports.tsx";
import AdminWaitlist from "./pages/admin/AdminWaitlist.tsx";
import Rewards from "./pages/Rewards.tsx";
import RewardDetail from "./pages/RewardDetail.tsx";
import TransactionDetailPage from "./pages/TransactionDetail.tsx";
import ExpenseAnalytics from "./pages/ExpenseAnalytics.tsx";
import FinancialInsights from "./pages/FinancialInsights.tsx";
import BillSplitPage from "./pages/BillSplit.tsx";
import BudgetPlanner from "./pages/BudgetPlanner.tsx";
import QuickPay from "./pages/QuickPay.tsx";
import BillPayments from "./pages/BillPayments.tsx";
import ScratchCards from "./pages/ScratchCards.tsx";
import Chores from "./pages/Chores.tsx";
import Achievements from "./pages/Achievements.tsx";
import Friends from "./pages/Friends.tsx";
import SupportTickets from "./pages/SupportTickets.tsx";
import SupportChat from "./pages/SupportChat.tsx";
import SpinWheel from "./pages/SpinWheel.tsx";
import Referrals from "./pages/Referrals.tsx";
import FinancialEducation from "./pages/FinancialEducation.tsx";
import ChatList from "./pages/ChatList.tsx";
import ChatRoom from "./pages/ChatRoom.tsx";
import ManageRecurring from "./pages/ManageRecurring.tsx";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import DeepLinkHandler from "./components/DeepLinkHandler";
import ErrorBoundary from "./components/ErrorBoundary";
import MaintenanceGate from "./components/MaintenanceGate";
import KycEnforcer from "./components/KycEnforcer";
import PinEnforcer from "./components/PinEnforcer";
import FeatureGate from "./components/FeatureGate";
import VerifyKyc from "./pages/VerifyKyc.tsx";
import Landing from "./pages/Landing.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const RealtimeWrapper = ({ children }: { children: React.ReactNode }) => {
  useRealtimeNotifications();
  return <>{children}</>;
};

// Globally listen for sign-out and bounce the user back to root so Index
// can show the auth screen. Without this, signing out from an inner route
// leaves the user on a blank/protected page.
const AuthRedirector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        if (location.pathname !== "/auth" && location.pathname !== "/" && location.pathname !== "/reset-password") {
          navigate("/auth", { replace: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner
        position="top-right"
        duration={4000}
        visibleToasts={5}
        closeButton
        toastOptions={{
          classNames: {
            toast:
              "group rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md border-l-4 !bg-[#0d0e12] !text-white !border-l-[#c8952e] !border !border-[rgba(200,149,46,0.2)] !p-4",
            title: "!text-sm !font-semibold !text-white",
            description: "!text-xs !text-white/60 !mt-1",
            success: "!border-l-[#22c55e]",
            error: "!border-l-[#ef4444]",
            warning: "!border-l-[#f59e0b]",
            info: "!border-l-[#3b82f6]",
            closeButton:
              "!bg-white/[0.05] !border-white/10 !text-white/60 hover:!bg-white/[0.1] hover:!text-white",
          },
        }}
      />
      <BrowserRouter>
        <DeepLinkHandler />
        <AuthRedirector />
          <KycEnforcer />
          <PinEnforcer />
        <RealtimeWrapper>
        <MaintenanceGate>
        <Routes>
            {/* Admin routes */}
            <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
            <Route path="/admin/users" element={<PageTransition><AdminUsers /></PageTransition>} />
            <Route path="/admin/roles" element={<PageTransition><AdminRoles /></PageTransition>} />
            <Route path="/admin/transactions" element={<PageTransition><AdminTransactions /></PageTransition>} />
            <Route path="/admin/kyc" element={<PageTransition><AdminKyc /></PageTransition>} />
            <Route path="/admin/wallets" element={<PageTransition><AdminWallets /></PageTransition>} />
            <Route path="/admin/notifications" element={<PageTransition><AdminNotifications /></PageTransition>} />
            <Route path="/admin/activity-log" element={<PageTransition><AdminActivityLog /></PageTransition>} />
            <Route path="/admin/audit-log" element={<PageTransition><AdminAuditLog /></PageTransition>} />
            <Route path="/admin/rewards" element={<PageTransition><AdminRewards /></PageTransition>} />
            <Route path="/admin/analytics" element={<PageTransition><AdminAnalytics /></PageTransition>} />
            <Route path="/admin/settings" element={<PageTransition><AdminSettings /></PageTransition>} />
            <Route path="/admin/support" element={<PageTransition><AdminSupport /></PageTransition>} />
            <Route path="/admin/parent-links" element={<PageTransition><AdminParentLinks /></PageTransition>} />
            <Route path="/admin/flagged" element={<PageTransition><AdminFlagged /></PageTransition>} />
            <Route path="/admin/payouts" element={<PageTransition><AdminPayouts /></PageTransition>} />
            <Route path="/admin/refunds" element={<PageTransition><AdminRefunds /></PageTransition>} />
            <Route path="/admin/spending-limits" element={<PageTransition><AdminSpendingLimits /></PageTransition>} />
            <Route path="/admin/savings-oversight" element={<PageTransition><AdminSavingsOversight /></PageTransition>} />
            <Route path="/admin/pocket-money" element={<PageTransition><AdminPocketMoney /></PageTransition>} />
            <Route path="/admin/revenue" element={<PageTransition><AdminRevenue /></PageTransition>} />
            <Route path="/admin/health" element={<PageTransition><AdminHealth /></PageTransition>} />
            <Route path="/admin/geographic" element={<PageTransition><AdminGeographic /></PageTransition>} />
            <Route path="/admin/reports" element={<PageTransition><AdminReports /></PageTransition>} />
            <Route path="/admin/waitlist" element={<PageTransition><AdminWaitlist /></PageTransition>} />

            {/* Public landing page — full-bleed, no mobile container. Home route. */}
            <Route path="/" element={<Landing />} />

            {/* User routes - max-w-lg mobile container */}
            <Route path="*" element={
              <div className="mx-auto w-full max-w-lg min-h-[100dvh] relative">
                <PageTransition>
                  <Routes>
                    <Route path="/auth" element={<Index />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-kyc" element={<VerifyKyc />} />
                    <Route path="/home" element={<TeenHome />} />
                    <Route path="/activity" element={<Activity />} />
                    <Route path="/card" element={<CardScreen />} />
                    <Route path="/profile" element={<ProfileScreen />} />
                    <Route path="/personal-info" element={<PersonalInfo />} />
                    <Route path="/security" element={<SecurityPin />} />
                    <Route path="/spending-limits" element={<SpendingLimits />} />
                    <Route path="/linked-parents" element={<LinkedParents />} />
                    <Route path="/linked-teens" element={<LinkedTeens />} />
                    <Route path="/parent-controls" element={<ParentControls />} />
                    <Route path="/help" element={<HelpSupport />} />
                    <Route path="/about" element={<AboutApp />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/data-safety" element={<DataSafety />} />
                    <Route path="/savings" element={<FeatureGate flag="feature_savings_goals" label="Savings Goals"><SavingsGoals /></FeatureGate>} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/scan" element={<ScanPay />} />
                    <Route path="/pay" element={<ErrorBoundary label="Payment"><PaymentConfirm /></ErrorBoundary>} />
                    <Route path="/add-money" element={<AddMoney />} />
                    <Route path="/parent" element={<ParentHome />} />
                    <Route path="/parent/teen/:teenId" element={<ParentTeenDetail />} />
                    <Route path="/parent/add-money" element={<ParentAddMoney />} />
                    <Route path="/rewards" element={<Rewards />} />
                    <Route path="/rewards/:id" element={<RewardDetail />} />
                    <Route path="/transaction/:id" element={<TransactionDetailPage />} />
                    <Route path="/analytics" element={<ExpenseAnalytics />} />
                    <Route path="/insights" element={<FinancialInsights />} />
                    <Route path="/bill-split" element={<FeatureGate flag="feature_bill_split" label="Bill Split"><BillSplitPage /></FeatureGate>} />
                    <Route path="/budget" element={<BudgetPlanner />} />
                    <Route path="/quick-pay" element={<FeatureGate flag="feature_quick_pay" label="Quick Pay"><QuickPay /></FeatureGate>} />
                    <Route path="/bill-payments" element={<BillPayments />} />
                    <Route path="/scratch-cards" element={<ScratchCards />} />
                    <Route path="/chores" element={<FeatureGate flag="feature_chores" label="Chores & Rewards"><Chores /></FeatureGate>} />
                    <Route path="/achievements" element={<Achievements />} />
                    <Route path="/friends" element={<Friends />} />
                    <Route path="/support" element={<SupportTickets />} />
                    <Route path="/support-chat" element={<SupportChat />} />
                    <Route path="/spin-wheel" element={<SpinWheel />} />
                    <Route path="/referrals" element={<FeatureGate flag="feature_referrals" label="Referrals"><Referrals /></FeatureGate>} />
                    <Route path="/learn" element={<FeatureGate flag="feature_lessons" label="Financial Lessons"><FinancialEducation /></FeatureGate>} />
                    <Route path="/chats" element={<ChatList />} />
                    <Route path="/chat/:conversationId" element={<ChatRoom />} />
                    <Route path="/recurring" element={<ManageRecurring />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PageTransition>
              </div>
            } />
          </Routes>
        </MaintenanceGate>
        </RealtimeWrapper>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
