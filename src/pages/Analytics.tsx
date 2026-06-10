import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, BarChart3, MessageSquare, FileQuestion, Calendar, Trophy, TrendingUp, Activity, Zap, Target, Brain } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface Stats {
  totalConversations: number;
  totalMessages: number;
  totalQuizzes: number;
  totalStudyPlans: number;
  avgQuizScore: number;
  studyProgress: number;
  recentActivity: { date: string; count: number }[];
  quizPerformance: { subject: string; score: number; total: number }[];
  topicsCompleted: number;
  topicsTotal: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)'];

export default function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch conversations, quizzes, and study plans in parallel
      const [convRes, quizRes, planRes] = await Promise.all([
        supabase.from('conversations').select('id, created_at').eq('user_id', user.id),
        supabase.from('quizzes').select('*').eq('user_id', user.id),
        supabase.from('study_plans').select('*').eq('user_id', user.id),
      ]);

      const conversations = convRes.data || [];
      const quizzes = quizRes.data || [];
      const plans = planRes.data || [];

      // Efficiently fetch only messages that belong to the user's conversations
      const userConvIds = conversations.map(c => c.id);
      let messages: any[] = [];
      if (userConvIds.length > 0) {
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('id, created_at, conversation_id')
          .in('conversation_id', userConvIds);
        
        if (!msgError && msgData) {
          messages = msgData;
        }
      }

      // Calculate quiz average
      const quizzesWithScores = quizzes.filter(q => q.score !== null);
      const avgScore = quizzesWithScores.length > 0
        ? Math.round(quizzesWithScores.reduce((acc, q) => acc + (q.score || 0), 0) / quizzesWithScores.length)
        : 0;

      // Calculate study progress
      let topicsCompleted = 0;
      let topicsTotal = 0;
      plans.forEach(plan => {
        const topics = Array.isArray(plan.topics) ? plan.topics as any[] : [];
        topicsTotal += topics.length;
        topicsCompleted += topics.filter(t => t.completed).length;
      });

      // Generate recent activity (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const activityByDate = last7Days.map(date => {
        const msgCount = messages.filter(m => m.created_at && m.created_at.startsWith(date)).length;
        const quizCount = quizzes.filter(q => q.created_at && q.created_at.startsWith(date)).length;
        return {
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          count: msgCount + quizCount * 5,
        };
      });

      // Quiz performance by subject
      const subjectMap = new Map<string, { scores: number[], totals: number[] }>();
      quizzes.forEach(q => {
        const subject = q.subject || 'General';
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, { scores: [], totals: [] });
        }
        const data = subjectMap.get(subject)!;
        if (q.score !== null) data.scores.push(q.score);
        if (q.total_questions) data.totals.push(q.total_questions);
      });

      const quizPerformance = Array.from(subjectMap.entries()).slice(0, 5).map(([subject, data]) => ({
        subject,
        score: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
        total: data.totals.reduce((a, b) => a + b, 0),
      }));

      setStats({
        totalConversations: conversations.length,
        totalMessages: messages.length,
        totalQuizzes: quizzes.length,
        totalStudyPlans: plans.length,
        avgQuizScore: avgScore,
        studyProgress: topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0,
        recentActivity: activityByDate,
        quizPerformance,
        topicsCompleted,
        topicsTotal,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-20 text-center text-muted-foreground">
          Unable to load analytics
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    { title: 'Conversations', value: stats.totalConversations, icon: MessageSquare, color: 'text-primary' },
    { title: 'Messages', value: stats.totalMessages, icon: Zap, color: 'text-accent' },
    { title: 'Quizzes', value: stats.totalQuizzes, icon: FileQuestion, color: 'text-green-500' },
    { title: 'Study Plans', value: stats.totalStudyPlans, icon: Calendar, color: 'text-yellow-500' },
  ];

  const pieData = [
    { name: 'Completed', value: stats.topicsCompleted },
    { name: 'Remaining', value: Math.max(0, stats.topicsTotal - stats.topicsCompleted) },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
          <BarChart3 className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Track your learning progress</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 truncate">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-muted flex items-center justify-center shrink-0 ${stat.color}`}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
              Quiz Performance
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Average score across all quizzes</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-4xl sm:text-5xl font-bold text-gradient shrink-0">{stats.avgQuizScore}%</div>
              <div className="flex-1 w-full">
                <Progress value={stats.avgQuizScore} className="h-2.5 sm:h-3" />
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  {stats.avgQuizScore >= 80 ? 'Excellent!' : stats.avgQuizScore >= 60 ? 'Good progress!' : 'Keep practicing!'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Target className="w-5 h-5 text-green-500 shrink-0" />
              Study Progress
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Topics completed across all plans</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-4xl sm:text-5xl font-bold text-gradient shrink-0">{stats.studyProgress}%</div>
              <div className="flex-1 w-full">
                <Progress value={stats.studyProgress} className="h-2.5 sm:h-3" />
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  {stats.topicsCompleted} of {stats.topicsTotal} topics completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 min-w-0">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Activity className="w-5 h-5 text-primary shrink-0" />
              Weekly Activity
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your learning activity over the past week</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="h-[200px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={stats.recentActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Brain className="w-5 h-5 text-accent shrink-0" />
              Study Completion
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Topics progress overview</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="h-[200px] w-full min-w-0 overflow-hidden flex items-center justify-center">
              {stats.topicsTotal > 0 ? (
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground">No study plans yet</p>
              )}
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs sm:text-sm">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-xs sm:text-sm">Remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Performance by Subject */}
      {stats.quizPerformance.length > 0 && (
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <TrendingUp className="w-5 h-5 text-green-500 shrink-0" />
              Performance by Subject
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Average quiz scores per subject</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="h-[250px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={stats.quizPerformance} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis 
                    dataKey="subject" 
                    type="category" 
                    width={80} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(val) => val.length > 12 ? `${val.substring(0, 10)}...` : val}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Score']}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
