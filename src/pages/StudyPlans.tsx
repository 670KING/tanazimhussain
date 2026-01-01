import { Calendar, FileText, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudyPlans() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><Calendar className="w-6 h-6 text-primary-foreground" /></div>
        <div><h1 className="text-2xl font-bold">Study Plans</h1><p className="text-muted-foreground">AI-generated personalized study schedules</p></div>
      </div>
      <Card><CardContent className="py-20 text-center text-muted-foreground">Coming soon - Create AI-powered study plans with progress tracking</CardContent></Card>
    </div>
  );
}

export function Documents() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><FileText className="w-6 h-6 text-primary-foreground" /></div>
        <div><h1 className="text-2xl font-bold">Documents</h1><p className="text-muted-foreground">Export chats and quizzes as PDF or Excel</p></div>
      </div>
      <Card><CardContent className="py-20 text-center text-muted-foreground">Coming soon - Export your content to PDF and Excel documents</CardContent></Card>
    </div>
  );
}

export function Analytics() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><BarChart3 className="w-6 h-6 text-primary-foreground" /></div>
        <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-muted-foreground">Track your learning progress</p></div>
      </div>
      <Card><CardContent className="py-20 text-center text-muted-foreground">Coming soon - View usage stats and learning analytics</CardContent></Card>
    </div>
  );
}
