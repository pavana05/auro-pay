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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
