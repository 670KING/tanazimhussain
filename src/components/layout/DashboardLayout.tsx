import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Loader2 } from 'lucide-react';
import { ChatProvider } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

export function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isChatPage = location.pathname === '/dashboard' || location.pathname === '/dashboard/';

  return (
    <SidebarProvider>
      <ChatProvider>
        <div className="min-h-[100dvh] flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-h-[100dvh] overflow-hidden min-w-0">
            {!isChatPage && (
              <header className="h-14 border-b border-border flex items-center px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex-shrink-0">
                <SidebarTrigger className="mr-4" />
                <div className="flex-1" />
              </header>
            )}
            <div className={cn(
              "flex-1 min-h-0 min-w-0 max-w-full",
              isChatPage ? "p-0 overflow-hidden flex flex-col" : "p-6 overflow-auto"
            )}>
              <Outlet />
            </div>
          </main>
        </div>
      </ChatProvider>
    </SidebarProvider>
  );
}
