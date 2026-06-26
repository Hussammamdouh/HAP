import React from 'react';
import { 
  Percent, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FolderGit2
} from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalProjects: number;
    avgCompletion: number;
    delayed: number;
    onTrack: number;
    commercialOnHold: number;
    totalOpenTasks: number;
    overdueTasks: number;
  };
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      
      {/* Total Projects / Avg Completion Card */}
      <div className="relative overflow-hidden bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Completion</p>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2 font-mono">{stats.avgCompletion}%</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Across {stats.totalProjects} active projects</p>
          </div>
          <div className="p-3 bg-brand-gold/10 text-brand-gold dark:bg-brand-gold/20 rounded-xl transition-transform duration-300 group-hover:scale-110">
            <Percent size={20} />
          </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-brand-gold to-brand-gold-dark h-2 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${stats.avgCompletion}%` }}
          ></div>
        </div>
      </div>

      {/* Delayed Projects Card */}
      <div className="relative overflow-hidden bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Delayed Projects</p>
            <h3 className="text-3xl font-bold text-rose-600 mt-2 font-mono">{stats.delayed}</h3>
            <p className="text-xs text-rose-400 mt-1">Requires urgent mitigation</p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:animate-pulse">
            <AlertTriangle size={20} />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">Commercial on Hold</span>
          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            {stats.commercialOnHold} project
          </span>
        </div>
      </div>

      {/* On Track Card */}
      <div className="relative overflow-hidden bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">On Track</p>
            <h3 className="text-3xl font-bold text-emerald-600 mt-2 font-mono">{stats.onTrack}</h3>
            <p className="text-xs text-emerald-500/80 mt-1">Running to schedule</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-xl transition-transform duration-300 group-hover:scale-110">
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-5 overflow-hidden">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${(stats.onTrack / stats.totalProjects) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Total Open Tasks Card */}
      <div className="relative overflow-hidden bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-navy/5 dark:bg-slate-800/20 rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Open Tasks</p>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2 font-mono">{stats.totalOpenTasks}</h3>
            <p className="text-xs text-rose-500 mt-1 font-medium">{stats.overdueTasks} tasks overdue</p>
          </div>
          <div className="p-3 bg-brand-navy/5 text-brand-navy dark:bg-brand-navy-light/40 dark:text-brand-gold rounded-xl transition-transform duration-300 group-hover:scale-110">
            <Clock size={20} className="group-hover:rotate-12 transition-transform duration-300" />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">Overdue Ratio</span>
          <span className="text-xs font-bold text-rose-500 font-mono">
            {Math.round((stats.overdueTasks / stats.totalOpenTasks) * 100)}%
          </span>
        </div>
      </div>

    </div>
  );
}
