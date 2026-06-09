import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";

// Lazy-load every route except the landing page (LCP target) to shrink the
// initial JS bundle and reduce main-thread blocking on first load.
const DashboardLayout = lazy(() =>
  import("./components/layout/DashboardLayout").then((m) => ({ default: m.DashboardLayout }))
);
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const QuizGenerator = lazy(() => import("./pages/QuizGenerator"));
const Summarizer = lazy(() => import("./pages/Summarizer"));
const StudyPlans = lazy(() => import("./pages/StudyPlans"));
const Documents = lazy(() => import("./pages/Documents"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="quiz" element={<QuizGenerator />} />
                <Route path="study-plans" element={<StudyPlans />} />
                <Route path="summarize" element={<Summarizer />} />
                <Route path="resume" element={<ResumeBuilder />} />
                <Route path="documents" element={<Documents />} />
                <Route path="analytics" element={<Analytics />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
