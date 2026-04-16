import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
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
import Referrals from "./pages/Referrals.tsx";
import FinancialEducation from "./pages/FinancialEducation.tsx";
import ChatList from "./pages/ChatList.tsx";
import ChatRoom from "./pages/ChatRoom.tsx";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <RealtimeWrapper>
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

            {/* User routes - max-w-lg mobile container */}
            <Route path="*" element={
              <div className="mx-auto w-full max-w-lg min-h-[100dvh] relative">
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
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
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/learn" element={<FinancialEducation />} />
                    <Route path="/chats" element={<ChatList />} />
                    <Route path="/chat/:conversationId" element={<ChatRoom />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PageTransition>
              </div>
            } />
          </Routes>
        </RealtimeWrapper>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
