import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/useChat';
import {
  MessageSquare,
  FileQuestion,
  Calendar,
  FileText,
  Sparkles,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  FileUser,
  Plus,
  Trash2,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { SettingsDialog } from '@/components/shared/SettingsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

const mainMenuItem = { title: 'AI Chat', icon: MessageSquare, path: '/dashboard' };

const academicTools = [
  { title: 'Quiz Generator', icon: FileQuestion, path: '/dashboard/quiz' },
  { title: 'Study Plans', icon: Calendar, path: '/dashboard/study-plans' },
  { title: 'Summarizer', icon: Sparkles, path: '/dashboard/summarize' },
  { title: 'Resume Builder', icon: FileUser, path: '/dashboard/resume' },
  { title: 'Documents', icon: FileText, path: '/dashboard/documents' },
  { title: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const {
    conversations,
    currentConversation,
    loadConversation,
    deleteConversation,
    clearCurrentChat,
    fetchConversations,
  } = useChat();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName') || user?.email?.split('@')[0] || '');

  useEffect(() => {
    const updateDisplayName = () => {
      setDisplayName(localStorage.getItem('displayName') || user?.email?.split('@')[0] || '');
    };
    updateDisplayName();
    window.addEventListener('display-name-change', updateDisplayName);
    return () => {
      window.removeEventListener('display-name-change', updateDisplayName);
    };
  }, [user]);

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    syncTheme();
    window.addEventListener('theme-change', syncTheme);
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const savedTheme = localStorage.getItem('theme') || 'system';
      if (savedTheme === 'system') {
        syncTheme();
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      window.removeEventListener('theme-change', syncTheme);
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const nextTheme = isCurrentlyDark ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', !isCurrentlyDark);
    localStorage.setItem('theme', nextTheme);
    setIsDark(!isCurrentlyDark);
    window.dispatchEvent(new Event('theme-change'));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border transition-all duration-200">
      <SidebarHeader className={cn("p-4 space-y-3 flex-shrink-0", isCollapsed && "items-center px-2")}>
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => navigate('/')}>
          <img src="/logo.svg" className="w-9 h-9 object-contain hover:scale-105 transition-transform" alt="Tanoedu AI Logo" />
          {!isCollapsed && (
            <div>
              <span className="text-xl font-bold text-gradient leading-tight">Tanoedu AI</span>
              <p className="text-[10px] text-muted-foreground">Academic Assistant</p>
            </div>
          )}
        </div>

        <Button
          onClick={() => {
            clearCurrentChat();
            navigate('/dashboard');
          }}
          className={cn(
            "w-full justify-start gap-2.5 px-3 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg shadow-sm font-medium transition-all",
            isCollapsed && "justify-center p-2"
          )}
          variant="ghost"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>New Chat</span>}
        </Button>
      </SidebarHeader>

      <SidebarContent>
        {/* Main AI Chat Tool */}
        <SidebarGroup className="py-1">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate(mainMenuItem.path)}
                  isActive={location.pathname === mainMenuItem.path}
                  className={cn(
                    "w-full justify-start gap-3 px-3 py-2 rounded-lg transition-all",
                    location.pathname === mainMenuItem.path
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <mainMenuItem.icon className={cn("w-5 h-5 shrink-0", location.pathname === mainMenuItem.path ? 'text-primary' : '')} />
                  {!isCollapsed && <span>{mainMenuItem.title}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Collapsible Academic Tools Section */}
        <SidebarGroup className="mt-1 py-1 border-t border-sidebar-border/30">
          <button
            onClick={() => !isCollapsed && setToolsExpanded(!toolsExpanded)}
            className={cn(
              "w-full text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5 flex items-center justify-between hover:text-foreground transition-colors select-none",
              isCollapsed && "justify-center px-1"
            )}
            disabled={isCollapsed}
          >
            <span>{!isCollapsed ? 'Academic Tools' : 'Tools'}</span>
            {!isCollapsed && (
              toolsExpanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>
          
          {(toolsExpanded || isCollapsed) && (
            <SidebarGroupContent className="transition-all duration-300">
              <SidebarMenu>
                {academicTools.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.path)}
                        isActive={isActive}
                        className={cn(
                          "w-full justify-start gap-3 px-3 py-1.5 rounded-lg transition-all",
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        <item.icon className={cn("w-5 h-5 shrink-0", isActive ? 'text-primary' : '')} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Chat History List */}
        <SidebarGroup className="border-t border-sidebar-border/30 mt-1 py-2 flex-1 min-h-0 flex flex-col">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1 flex justify-between items-center">
              <span>Recent Chats</span>
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-1">
              <div className="space-y-0.5 p-1">
                {conversations.map((conv) => {
                  const isActive = currentConversation?.id === conv.id;
                  return (
                    <div
                      key={conv.id}
                      className={cn(
                        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 w-full min-w-0 text-sm border',
                        isActive
                          ? 'bg-primary/10 text-primary border-primary/20 font-medium'
                          : 'text-sidebar-foreground border-transparent hover:bg-sidebar-accent/50',
                        isCollapsed && "justify-center px-2"
                      )}
                      onClick={() => {
                        loadConversation(conv.id);
                        navigate('/dashboard');
                      }}
                      title={conv.title}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{conv.title}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive shrink-0 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
                {conversations.length === 0 && !isCollapsed && (
                  <div className="text-center py-6 px-2">
                    <p className="text-xs text-muted-foreground">No recent chats</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("p-2 border-t border-sidebar-border flex-shrink-0", isCollapsed && "items-center")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl bg-sidebar-accent/30 hover:bg-sidebar-accent/70 transition-all w-full text-left outline-none border border-transparent hover:border-sidebar-border/40",
                isCollapsed && "justify-center p-1.5"
              )}
              title="User settings and options"
            >
              <Avatar className="w-8 h-8 shrink-0 border border-primary/10">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold shadow-inner">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-grow min-w-0 flex items-center justify-between">
                  <div className="min-w-0 flex-grow pr-1">
                    <p className="text-xs font-semibold truncate text-foreground leading-none">
                      {displayName}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <Settings className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[230px] p-1.5" side="right" align="end" sideOffset={10}>
            <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground font-medium truncate">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg">
              <Settings className="w-4 h-4 text-primary shrink-0" />
              <span>Manage Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/docs')} className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg">
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <span>Documentation</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/help')} className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg">
              <HelpCircle className="w-4 h-4 text-primary shrink-0" />
              <span>Help & Support</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg">
              {isDark ? <Sun className="w-4 h-4 text-primary shrink-0" /> : <Moon className="w-4 h-4 text-primary shrink-0" />}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </SidebarFooter>
    </Sidebar>
  );
}
