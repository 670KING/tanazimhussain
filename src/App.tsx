import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
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
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Docs = lazy(() => import("./pages/Docs"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // 1. Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'system';
    const applyTheme = (themeValue: string) => {
      if (themeValue === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (themeValue === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    applyTheme(savedTheme);

    // Listen for system theme changes if set to system
    let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;
    if (savedTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaListener = () => {
        applyTheme('system');
      };
      mediaQuery.addEventListener('change', mediaListener);
    }

    // 2. Dense Layout Mode initialization
    const savedDense = localStorage.getItem('denseMode') === 'true';
    if (savedDense) {
      document.documentElement.classList.add('dense-layout');
    } else {
      document.documentElement.classList.remove('dense-layout');
    }

    // 3. High Contrast Math initialization
    const savedHighContrast = localStorage.getItem('highContrast') === 'true';
    if (savedHighContrast) {
      document.documentElement.classList.add('high-contrast-math');
    } else {
      document.documentElement.classList.remove('high-contrast-math');
    }

    return () => {
      if (mediaListener) {
        window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', mediaListener);
      }
    };
  }, []);

  return (
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
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/help" element={<Help />} />
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
};

export default App;
