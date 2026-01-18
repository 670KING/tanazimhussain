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
      const [convRes, msgRes, quizRes, planRes] = await Promise.all([
        supabase.from('conversations').select('id, created_at').eq('user_id', user.id),
        supabase.from('messages').select('id, created_at, conversation_id'),
        supabase.from('quizzes').select('*').eq('user_id', user.id),
        supabase.from('study_plans').select('*').eq('user_id', user.id),
      ]);

      const conversations = convRes.data || [];
      const userConvIds = conversations.map(c => c.id);
      const messages = (msgRes.data || []).filter(m => userConvIds.includes(m.conversation_id));
      const quizzes = quizRes.data || [];
      const plans = planRes.data || [];

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
        const msgCount = messages.filter(m => m.created_at.startsWith(date)).length;
        const quizCount = quizzes.filter(q => q.created_at.startsWith(date)).length;
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
          <BarChart3 className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your learning progress</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:border-primary/30 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Quiz Performance
            </CardTitle>
            <CardDescription>Average score across all quizzes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-gradient">{stats.avgQuizScore}%</div>
              <div className="flex-1">
                <Progress value={stats.avgQuizScore} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.avgQuizScore >= 80 ? 'Excellent!' : stats.avgQuizScore >= 60 ? 'Good progress!' : 'Keep practicing!'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Study Progress
            </CardTitle>
            <CardDescription>Topics completed across all plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-gradient">{stats.studyProgress}%</div>
              <div className="flex-1">
                <Progress value={stats.studyProgress} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.topicsCompleted} of {stats.topicsTotal} topics completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Weekly Activity
            </CardTitle>
            <CardDescription>Your learning activity over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.recentActivity}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent" />
              Study Completion
            </CardTitle>
            <CardDescription>Topics progress overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              {stats.topicsTotal > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
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
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">No study plans yet</p>
              )}
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-sm">Remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Performance by Subject */}
      {stats.quizPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Performance by Subject
            </CardTitle>
            <CardDescription>Average quiz scores per subject</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.quizPerformance} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="subject" type="category" width={100} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
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
