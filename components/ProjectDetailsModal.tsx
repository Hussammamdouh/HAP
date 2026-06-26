import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  X, 
  Calendar, 
  AlertOctagon, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Milestone
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  progress: number;
  status: string;
  delay: number;
  nextDeadline: string;
  overdueTasks: number;
}

interface ProjectDetailsModalProps {
  project: Project | null;
  onClose: () => void;
}

// Generate static milestones based on progress/project characteristics
const getMilestones = (project: Project) => {
  const isDelayed = project.status === 'Delayed';
  
  return [
    {
      title: 'Geotechnical & Site Prep',
      date: 'Completed Q4 2025',
      status: 'complete',
      desc: 'All soil testing and initial grading completed.'
    },
    {
      title: 'Structural Works & Concrete Pouring',
      date: project.progress > 40 ? 'Completed Q1 2026' : 'In Progress',
      status: project.progress > 40 ? 'complete' : (isDelayed ? 'delayed' : 'pending'),
      desc: 'Foundation reinforcement and main pillar frameworks.'
    },
    {
      title: 'MEP (Mechanical, Electrical, Plumbing) Fit-outs',
      date: 'Target Q3 2026',
      status: project.progress > 70 ? 'complete' : (project.progress > 30 ? 'pending' : 'upcoming'),
      desc: 'Internal conduits and utility cabling setup.'
    },
    {
      title: 'Facade & Exterior Glass Installation',
      date: 'Target Q4 2026',
      status: project.progress > 90 ? 'complete' : 'upcoming',
      desc: 'Framing, double glazed windows, and branding panels.'
    },
    {
      title: 'Handover & Client Walkthrough',
      date: project.nextDeadline,
      status: isDelayed ? 'delayed' : 'upcoming',
      desc: 'Final inspection and snag list resolution.'
    }
  ];
};

export default function ProjectDetailsModal({ project, onClose }: ProjectDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (project) {
      // Trigger slide-in transition
      const timer = setTimeout(() => setIsOpen(true), 50);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setIsOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [project]);

  if (!project) return null;

  const milestones = getMilestones(project);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'On Track': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900';
      case 'Delayed': return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900';
      case 'Commercial on hold': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900';
      default: return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
        <div 
          className={`w-screen max-w-md bg-[var(--card-bg)] border-l border-[var(--border-color)] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[var(--border-color)] bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-gold animate-ping"></span>
                {project.name} Details
              </h2>
              <p className="text-xs text-slate-400 mt-1">Project ID: #{project.id}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Quick Status Block */}
            <div className="bg-slate-50 dark:bg-slate-900/20 p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Current Status</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block mb-1">Next Deadline</span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Calendar size={14} className="text-brand-gold"/>
                  {project.nextDeadline}
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Completion</span>
                  <TrendingUp size={16} className="text-brand-gold" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{project.progress}%</div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-brand-gold h-1.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                </div>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Delay Variance</span>
                  <Clock size={16} className={project.delay > 0 ? 'text-rose-500' : 'text-emerald-500'} />
                </div>
                <div className={`text-2xl font-bold font-mono ${project.delay > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {project.delay > 0 ? `+${project.delay} d` : 'On time'}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1.5">Deviation from baseline</span>
              </div>
            </div>

            {/* Alert Panel for Overdue tasks */}
            {project.overdueTasks > 0 && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-xl flex gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg h-fit">
                  <AlertOctagon size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-rose-800 dark:text-rose-300">Active Warning: Overdue Tasks</h4>
                  <p className="text-xs text-rose-600/90 dark:text-rose-400/80 mt-1">
                    There are <span className="font-bold">{project.overdueTasks} critical path tasks</span> that have passed their target end dates. Resources should be re-allocated immediately.
                  </p>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Milestone size={16} className="text-brand-gold" />
                Execution Milestones
              </h3>
              
              <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-2 space-y-6 py-2">
                {milestones.map((milestone, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle dot on line */}
                    <span className={`absolute -left-[23px] top-1 flex items-center justify-center w-3.5 h-3.5 rounded-full border bg-[var(--card-bg)] ${
                      milestone.status === 'complete' ? 'border-emerald-500 bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40' : 
                      milestone.status === 'delayed' ? 'border-rose-500 bg-rose-50 text-rose-500 dark:bg-rose-950/40' : 
                      milestone.status === 'pending' ? 'border-brand-gold bg-brand-gold-light text-brand-gold dark:bg-slate-900' :
                      'border-slate-300 dark:border-slate-700'
                    }`}>
                      {milestone.status === 'complete' && <CheckCircle size={10} className="w-full h-full p-0.5" />}
                    </span>

                    {/* Content */}
                    <div>
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{milestone.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{milestone.date}</span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{milestone.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-[var(--border-color)] bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-2.5">
            <Link 
              href={`/projects/${project.id}`}
              className="w-full bg-brand-gold hover:bg-brand-gold-dark text-brand-navy-dark py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Open Full Task Board
            </Link>
            <div className="flex gap-2.5 w-full">
              <button 
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
                onClick={() => alert(`Reviewing reports for ${project.name}`)}
              >
                Export Report
              </button>
              <button 
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
