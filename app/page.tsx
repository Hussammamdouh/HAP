'use client';

import React, { useState, useMemo } from 'react';
import { 
  Database, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  Calendar, 
  Filter, 
  ListTodo, 
  Users, 
  ShieldAlert
} from 'lucide-react';

// ==========================================
// MOCK DATA REPRESENTING PORTFOLIO
// ==========================================

const portfolioStats = {
  totalProjects: 9,
  avgCompletion: 48.1,
  delayed: 7,
  onTrack: 1,
  commercialOnHold: 1,
  totalOpenTasks: 74,
  overdueTasks: 43
};

const projectsData = [
  { id: 1, name: 'SLNX', progress: 73.1, status: 'Commercial on hold', delay: 94, nextDeadline: '2026-05-03', overdueTasks: 27, phase: 'Design' },
  { id: 2, name: 'SLR', progress: 37.0, status: 'Delayed', delay: 226, nextDeadline: '2026-06-22', overdueTasks: 6, phase: 'Construction' },
  { id: 3, name: 'CRI', progress: 59.7, status: 'Delayed', delay: 0, nextDeadline: '2026-06-25', overdueTasks: 1, phase: 'Construction' },
  { id: 4, name: 'HPT', progress: 57.2, status: 'Delayed', delay: 277, nextDeadline: '2026-06-25', overdueTasks: 1, phase: 'Construction' },
  { id: 5, name: 'DRJ', progress: 43.2, status: 'Delayed', delay: 20, nextDeadline: '2026-07-15', overdueTasks: 4, phase: 'Construction' },
  { id: 6, name: 'Encore', progress: 70.8, status: 'Delayed', delay: 4, nextDeadline: '2026-07-20', overdueTasks: 2, phase: 'Construction' },
  { id: 7, name: 'Keys 52', progress: 92.5, status: 'Delayed', delay: 234, nextDeadline: '2026-08-01', overdueTasks: 12, phase: 'Construction' },
  { id: 8, name: 'Lotus', progress: 1.9, status: 'On Track', delay: 35, nextDeadline: '2026-08-10', overdueTasks: 0, phase: 'Procurement' },
  { id: 9, name: 'SLW NOA', progress: 43.2, status: 'Delayed', delay: 64, nextDeadline: '2026-08-15', overdueTasks: 8, phase: 'Construction' },
];

const projectTasksTemplates: Record<string, Array<{
  id: number;
  name: string;
  type: string;
  baselineStart: string;
  actualFinish: string;
  progress: number;
  status: 'Completed' | 'In Progress' | 'Delayed' | 'Upcoming';
  owner: { name: string; initials: string; avatarBg: string };
  blocker?: string;
}>> = {
  'SLNX': [
    { id: 1, name: 'Permit Drawings & Code Compliance', type: 'Design', baselineStart: '2025-09-28', actualFinish: '2026-02-14', progress: 100, status: 'Completed', owner: { name: 'Amr El-Sherif', initials: 'AE', avatarBg: 'bg-[#d4af37] text-slate-900' } },
    { id: 2, name: 'HVAC Schematic Infrastructure', type: 'Design', baselineStart: '2025-10-15', actualFinish: '2026-03-01', progress: 100, status: 'Completed', owner: { name: 'Laila Mansour', initials: 'LM', avatarBg: 'bg-[#d4af37] text-slate-900' } },
    { id: 3, name: 'Facade System Architectural Review', type: 'Design', baselineStart: '2026-01-10', actualFinish: '-', progress: 40, status: 'Delayed', owner: { name: 'Tarek Hegazi', initials: 'TH', avatarBg: 'bg-rose-600 text-white' }, blocker: 'Awaiting client approval on gold glaze structural cladding finish' },
    { id: 4, name: 'Main Power Substation Procurement', type: 'Procurement', baselineStart: '2026-02-20', actualFinish: '-', progress: 0, status: 'Delayed', owner: { name: 'Sherif Fayed', initials: 'SF', avatarBg: 'bg-rose-600 text-white' }, blocker: 'Pricing variances exceed approved design budget thresholds' },
  ],
  'SLR': [
    { id: 1, name: 'Substructure Excavation & Shoring', type: 'Construction', baselineStart: '2025-10-01', actualFinish: '2026-01-20', progress: 100, status: 'Completed', owner: { name: 'Nader Ghali', initials: 'NG', avatarBg: 'bg-[#d4af37] text-slate-900' } },
    { id: 2, name: 'Foundation Slab Cast Block 1', type: 'Construction', baselineStart: '2025-12-05', actualFinish: '2026-04-15', progress: 100, status: 'Completed', owner: { name: 'Yasmine Sabri', initials: 'YS', avatarBg: 'bg-[#d4af37] text-slate-900' } },
    { id: 3, name: 'Superstructure Concrete Columns (L1)', type: 'Construction', baselineStart: '2026-02-01', actualFinish: '-', progress: 50, status: 'Delayed', owner: { name: 'Hassan Allam Jr.', initials: 'HA', avatarBg: 'bg-rose-600 text-white' }, blocker: 'Portland cement supply delivery chain logistics bottleneck' },
    { id: 4, name: 'Electrical Duct Routing (Underground)', type: 'Construction', baselineStart: '2026-03-10', actualFinish: '-', progress: 10, status: 'In Progress', owner: { name: 'Mona Zaki', initials: 'MZ', avatarBg: 'bg-blue-600 text-white' } },
  ],
  'Lotus': [
    { id: 1, name: 'Landscape Design Guidelines Spec', type: 'Design', baselineStart: '2026-03-01', actualFinish: '-', progress: 25, status: 'In Progress', owner: { name: 'Karim Abdelaziz', initials: 'KA', avatarBg: 'bg-blue-600 text-white' } },
    { id: 2, name: 'Sod and Topsoil Procurement Contract', type: 'Procurement', baselineStart: '2026-04-15', actualFinish: '-', progress: 0, status: 'Upcoming', owner: { name: 'Hossam Ghaly', initials: 'HG', avatarBg: 'bg-slate-400 text-white' } },
  ],
  'HPT': [
    { id: 1, name: 'Structural Framing Core Tower B', type: 'Construction', baselineStart: '2025-08-01', actualFinish: '-', progress: 40, status: 'Delayed', owner: { name: 'Hassan Mourad', initials: 'HM', avatarBg: 'bg-rose-600 text-white' }, blocker: 'Safety compliance audit corrective action reports outstanding' },
    { id: 2, name: 'Elevator Shaft Concrete Shuttering', type: 'Construction', baselineStart: '2025-09-15', actualFinish: '-', progress: 30, status: 'Delayed', owner: { name: 'Youssef Chahine', initials: 'YC', avatarBg: 'bg-rose-600 text-white' }, blocker: 'Crane maintenance hydraulic cylinder leaks' },
  ]
};

const getTasksForProject = (project: typeof projectsData[0]) => {
  if (projectTasksTemplates[project.name]) {
    return projectTasksTemplates[project.name];
  }
  return [
    { id: 1, name: 'Structural Foundations Cast', type: 'Construction', baselineStart: '2025-12-01', actualFinish: '2026-04-10', progress: 100, status: 'Completed' as const, owner: { name: 'Ahmed Ramzy', initials: 'AR', avatarBg: 'bg-emerald-600 text-white' } },
    { id: 2, name: 'MEP Infrastructure Fitout', type: 'Construction', baselineStart: '2026-02-15', actualFinish: '-', progress: Math.max(0, Math.floor(project.progress * 0.8)), status: project.overdueTasks > 0 ? 'Delayed' as const : 'In Progress' as const, owner: { name: 'Faten Hamama', initials: 'FH', avatarBg: 'bg-[#d4af37] text-slate-900' }, blocker: project.overdueTasks > 0 ? 'Equipment procurement delay at Alexandria Port customs' : undefined },
    { id: 3, name: 'Interior Plaster and Fitouts', type: 'Construction', baselineStart: '2026-05-01', actualFinish: '-', progress: 0, status: 'Upcoming' as const, owner: { name: 'Omar Sharif', initials: 'OS', avatarBg: 'bg-slate-400 text-white' } }
  ];
};

export default function TechDarkDashboard() {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'drilldown'>('portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Retrieve project details based on state
  const selectedProject = useMemo(() => {
    return projectsData.find(p => p.id === selectedProjectId) || projectsData[0];
  }, [selectedProjectId]);

  const projectTasks = useMemo(() => {
    return getTasksForProject(selectedProject);
  }, [selectedProject]);

  // Project Table processing (Sorting & Filtering)
  const filteredProjects = useMemo(() => {
    let result = [...projectsData];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'All') {
      result = result.filter(p => p.status === statusFilter);
    }
    return result;
  }, [searchQuery, statusFilter]);

  // Visual Pipeline Stages & project groupings
  const pipelineStages = [
    { name: 'Pre-Contract', key: 'Pre-Contract' },
    { name: 'Design', key: 'Design' },
    { name: 'Procurement', key: 'Procurement' },
    { name: 'Construction', key: 'Construction' }
  ];

  const projectPhasesGrouping = useMemo(() => {
    const groups: Record<string, typeof projectsData> = {
      'Pre-Contract': [],
      'Design': [],
      'Procurement': [],
      'Construction': []
    };
    projectsData.forEach(p => {
      if (groups[p.phase]) {
        groups[p.phase].push(p);
      }
    });
    return groups;
  }, []);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'On Track': return 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30';
      case 'Delayed': return 'bg-rose-950/20 text-rose-400 border border-rose-900/30';
      case 'Commercial on hold': return 'bg-amber-950/20 text-amber-400 border border-amber-900/30';
      default: return 'bg-slate-900 text-slate-400 border border-slate-800';
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch(status) {
      case 'Completed': return 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30';
      case 'Delayed': return 'bg-rose-950/20 text-rose-400 border border-rose-900/30';
      case 'In Progress': return 'bg-blue-950/20 text-blue-400 border border-blue-900/30';
      default: return 'bg-slate-900 text-slate-400 border border-slate-800';
    }
  };

  // Circumference definitions for circle SVGs
  const radius = 40;
  const circ = 2 * Math.PI * radius; // ~251.3
  const avgCompletionDash = circ - (circ * portfolioStats.avgCompletion) / 100;
  const delayedDash = circ - (circ * (portfolioStats.delayed / portfolioStats.totalProjects)) * 100 / 100;

  return (
    <div className="min-h-screen bg-[#080c14] text-[#e8e6e3] bg-tech-grid font-sans">
      
      {/* Subtle Top Alert Bar */}
      <section className="w-full bg-[#111625] text-[#d4af37] py-2 px-4 text-center border-b border-[#1a2336] relative z-50">
        <p className="text-[10px] font-serif-lux italic tracking-wide">
          Portfolio Variance Alert: Total delay accumulated across active developments stands at 953.9 days. Critical mitigation protocols active.
        </p>
      </section>

      {/* Main Container padding matching design layout */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ==========================================
            PERSISTENT HEADER (COMMAND CENTER)
            ========================================== */}
        <header className="bg-[#111625]/40 border border-[#1a2336] backdrop-blur-md rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Custom SVG Gold Lion Head Logo */}
            <svg className="w-12 h-12 text-[#d4af37] shrink-0" viewBox="0 0 512 512" fill="currentColor">
              <path d="M256,16L220,96h72L256,16z"/>
              <path d="M220,96L140,140l50,60L220,96z"/>
              <path d="M292,96l80,44l-50,60L292,96z"/>
              <path d="M140,140L40,240l80,40L140,140z"/>
              <path d="M372,140l100,100l-80,40L372,140z"/>
              <path d="M190,200l-50-60L60,260l130-60z"/>
              <path d="M322,200l50-60l80,120l-130-60z"/>
              <path d="M190,200l-66,80l66-80l-33-30L190,200z"/>
              <path d="M256,280l-66-80H140l76,140L256,280z"/>
              <path d="M256,280l66-80h50l-76,140L256,280z"/>
              <path d="M216,340l-76-140H60l110,180L216,340z"/>
              <path d="M296,340l76-140h80l-110,180L296,340z"/>
              <path d="M256,280L216,340h80L256,280z"/>
              <path d="M216,340l40,120l40-120H216z"/>
            </svg>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-serif-lux font-bold tracking-widest uppercase text-white">
                  Hassan Allam <span className="font-light italic text-[#d4af37]">Properties</span>
                </h1>
                <span className="font-sans text-[7px] tracking-widest font-bold px-2 py-0.5 border border-[#1a2336] text-[#d4af37] uppercase rounded-md">
                  Control Board
                </span>
              </div>
              <p className="text-slate-400 text-[9px] font-sans tracking-widest uppercase mt-1">
                Development Schedule and Variance Tracking Command
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-2 border text-[10px] font-sans font-bold tracking-widest uppercase transition-all rounded-lg cursor-pointer ${
                activeTab === 'portfolio' 
                  ? 'border-[#d4af37] text-[#d4af37] bg-[#d4af37]/5 shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
                  : 'border-[#1a2336] text-slate-400 hover:text-white hover:border-[#d4af37]/30'
              }`}
            >
              Portfolio Overview
            </button>
            <button
              onClick={() => setActiveTab('drilldown')}
              className={`px-4 py-2 border text-[10px] font-sans font-bold tracking-widest uppercase transition-all rounded-lg cursor-pointer ${
                activeTab === 'drilldown' 
                  ? 'border-[#33b3d4] text-[#33b3d4] bg-[#33b3d4]/5 shadow-[0_0_15px_rgba(51,179,212,0.1)]' 
                  : 'border-[#1a2336] text-slate-400 hover:text-white hover:border-[#33b3d4]/30'
              }`}
            >
              Project Drill-Down
            </button>
          </div>
        </header>

        {/* ==========================================
            TAB 1: PORTFOLIO OVERVIEW
            ========================================== */}
        {activeTab === 'portfolio' && (
          <div className="space-y-8 animate-fadeIn">

            {/* DEVELOPMENT LIFECYCLE PIPELINE */}
            <div className="space-y-4">
              <h2 className="text-xs font-sans font-bold text-white tracking-widest uppercase">
                Development Lifecycle Pipeline
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {pipelineStages.map((stage, idx) => {
                  const stageProjects = projectPhasesGrouping[stage.key] || [];
                  return (
                    <div key={idx} className="bg-[#111625]/20 border border-[#1a2336] rounded-2xl p-4 flex flex-col justify-between shadow-2xl min-h-[300px]">
                      <div>
                        {/* Header bar inside column */}
                        <div className="flex justify-between items-center pb-3 border-b border-[#1a2336]">
                          <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">{stage.name}</span>
                          <span className="bg-[#111625] border border-[#1a2336] text-[#d4af37] text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                            {stageProjects.length}
                          </span>
                        </div>

                        {/* List cards in stage */}
                        <div className="mt-4 space-y-3">
                          {stageProjects.length > 0 ? (
                            stageProjects.map(proj => (
                              <div 
                                key={proj.id} 
                                onClick={() => {
                                  setSelectedProjectId(proj.id);
                                  setActiveTab('drilldown');
                                }}
                                className="p-4 bg-[#111625]/80 border border-[#1a2336] rounded-xl hover:border-[#d4af37]/40 dark:hover:border-[#d4af37]/45 transition-all cursor-pointer group flex items-center justify-between shadow-lg glow-gold-hover"
                              >
                                <div>
                                  <span className="text-xs font-serif-lux font-bold text-white group-hover:text-[#d4af37] transition-colors">{proj.name}</span>
                                  <span className="text-[9px] text-slate-500 block mt-0.5 font-sans uppercase font-bold tracking-wider">{proj.progress}% Done</span>
                                </div>
                                <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-md ${proj.delay > 0 ? 'text-rose-400 bg-rose-950/20 border border-rose-900/30' : 'text-[#33b3d4] bg-[#33b3d4]/5 border border-[#33b3d4]/20'}`}>
                                  {proj.delay > 0 ? `+${proj.delay}d` : 'On Time'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-500 text-center py-12">No developments active</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KPI SECTION */}
            <div className="space-y-4">
              <h2 className="text-xs font-sans font-bold text-white tracking-widest uppercase">
                KPI
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* KPI Card 1: Avg Completion */}
                <div className="bg-[#111625]/40 border border-[#1a2336] rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-widest mb-4">Avg Completion</span>
                  
                  {/* Circular SVG progress gauge */}
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle 
                        cx="50" 
                        cy="50" 
                        r={radius} 
                        className="stroke-slate-800" 
                        strokeWidth="8" 
                        fill="transparent" 
                      />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r={radius} 
                        className="stroke-[#d4af37] progress-ring-circle drop-shadow-[0_0_4px_#d4af37]" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={circ} 
                        strokeDashoffset={avgCompletionDash} 
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-sm font-sans font-bold text-[#d4af37]">
                      {portfolioStats.avgCompletion}%
                    </span>
                  </div>
                </div>

                {/* KPI Card 2: Delayed Projects */}
                <div className="bg-[#111625]/40 border border-[#1a2336] rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-widest mb-4">Delayed Projects</span>
                  
                  {/* Circular SVG progress gauge */}
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle 
                        cx="50" 
                        cy="50" 
                        r={radius} 
                        className="stroke-slate-800" 
                        strokeWidth="8" 
                        fill="transparent" 
                      />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r={radius} 
                        className="stroke-rose-600 progress-ring-circle drop-shadow-[0_0_4px_#ef4444]" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={circ} 
                        strokeDashoffset={delayedDash} 
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-sm font-sans font-bold text-rose-500">
                      {portfolioStats.delayed} / {portfolioStats.totalProjects}
                    </span>
                  </div>
                  <span className="text-[8px] font-sans font-bold text-rose-500 tracking-wider uppercase mt-4 block">Requires Rescheduling</span>
                </div>

                {/* KPI Card 3: On Track */}
                <div className="bg-[#111625]/40 border border-[#1a2336] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-widest">On Track</span>
                      <h3 className="text-3xl font-sans font-bold text-[#33b3d4] mt-2">{portfolioStats.onTrack}</h3>
                    </div>
                  </div>
                  
                  {/* SVG Wave Sparkline */}
                  <svg className="w-full h-12 mt-4" viewBox="0 0 200 50">
                    <defs>
                      <linearGradient id="tealGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#33b3d4" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#33b3d4" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d="M 0,35 C 20,20 40,40 60,15 C 80,5 100,45 120,25 C 140,5 160,35 200,10" fill="none" stroke="#33b3d4" strokeWidth="2.5" className="drop-shadow-[0_0_3px_#33b3d4]" />
                    <path d="M 0,35 C 20,20 40,40 60,15 C 80,5 100,45 120,25 C 140,5 160,35 200,10 L 200,50 L 0,50 Z" fill="url(#tealGlow)" />
                  </svg>
                </div>

                {/* KPI Card 4: Open Tasks */}
                <div className="bg-[#111625]/40 border border-[#1a2336] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-widest">Open Tasks</span>
                      <h3 className="text-3xl font-sans font-bold text-rose-500 mt-2">{portfolioStats.totalOpenTasks}</h3>
                    </div>
                  </div>
                  
                  {/* SVG Wave Sparkline */}
                  <svg className="w-full h-12 mt-4" viewBox="0 0 200 50">
                    <defs>
                      <linearGradient id="roseGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d="M 0,20 C 30,45 60,10 90,35 C 120,45 150,15 200,25" fill="none" stroke="#ef4444" strokeWidth="2.5" className="drop-shadow-[0_0_3px_#ef4444]" />
                    <path d="M 0,20 C 30,45 60,10 90,35 C 120,45 150,15 200,25 L 200,50 L 0,50 Z" fill="url(#roseGlow)" />
                  </svg>
                  <span className="text-[8px] font-sans font-bold text-rose-500 tracking-wider uppercase mt-2 block">
                    {portfolioStats.overdueTasks} Overdue Tasks ({Math.round(portfolioStats.overdueTasks/portfolioStats.totalOpenTasks * 100)}%)
                  </span>
                </div>

              </div>
            </div>

            {/* PROJECT MASTER SCHEDULE TABLE */}
            <div className="space-y-4">
              <h2 className="text-xs font-sans font-bold text-white tracking-widest uppercase">
                Project Master Schedule
              </h2>

              <div className="bg-[#111625]/40 border border-[#1a2336] rounded-2xl shadow-2xl overflow-hidden">
                {/* Search / Filter toolbar */}
                <div className="px-6 py-5 border-b border-[#1a2336] bg-[#111625]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Schedule Matrix</h3>
                    <p className="text-[9px] text-slate-400 tracking-widest font-sans uppercase mt-0.5">Live schedule metrics overview</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search property..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full text-xs rounded-lg border border-[#1a2336] bg-[#0c101b] text-[#e8e6e3] focus:outline-none focus:border-[#d4af37] transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 border border-[#1a2336] bg-[#0c101b] rounded-lg px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest font-sans">
                      <Filter size={11} className="text-[#d4af37]" />
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent focus:outline-none cursor-pointer font-bold text-slate-400"
                      >
                        <option value="All">All Statuses</option>
                        <option value="On Track">On Track</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Commercial on hold">Commercial on hold</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#1a2336] bg-[#111625]/50 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                        <th className="px-6 py-4">Project</th>
                        <th className="px-6 py-4">Project</th>
                        <th className="px-6 py-4">Done%</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Priority</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a2336]">
                      {filteredProjects.map((project) => (
                        <tr 
                          key={project.id} 
                          onClick={() => {
                            setSelectedProjectId(project.id);
                            setActiveTab('drilldown');
                          }}
                          className="hover:bg-[#151d2f]/40 transition-colors cursor-pointer group/row"
                        >
                          {/* Project Name (Georgia Font) */}
                          <td className="px-6 py-5 font-serif-lux font-bold text-white group-hover/row:text-[#d4af37] transition-colors">
                            {project.name}
                          </td>
                          {/* Phase */}
                          <td className="px-6 py-5">
                            <span className="text-[10px] font-sans font-bold tracking-wider uppercase text-[#d4af37]">
                              {project.phase}
                            </span>
                          </td>
                          {/* Progress with gold horizontal line */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-200 font-mono text-xs w-10">{project.progress}%</span>
                              <div className="w-20 bg-slate-800 h-0.5 rounded-none overflow-hidden shrink-0">
                                <div className="bg-[#d4af37] h-full shadow-[0_0_4px_#d4af37]" style={{ width: `${project.progress}%` }}></div>
                              </div>
                            </div>
                          </td>
                          {/* Status badge */}
                          <td className="px-6 py-5">
                            <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold font-sans tracking-wider uppercase border ${getStatusColor(project.status)}`}>
                              {project.status}
                            </span>
                          </td>
                          {/* Delay Priority */}
                          <td className="px-6 py-5">
                            {project.delay > 0 ? (
                              <span className="text-rose-400 font-bold font-mono text-xs">+{project.delay}d</span>
                            ) : (
                              <span className="text-[#33b3d4] font-bold text-xs uppercase tracking-wider font-sans">On Time</span>
                            )}
                          </td>
                          {/* Date */}
                          <td className="px-6 py-5 text-slate-400 text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-[#d4af37]" />
                              {project.nextDeadline}
                            </div>
                          </td>
                          {/* Open Board Gold outline button */}
                          <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                setSelectedProjectId(project.id);
                                setActiveTab('drilldown');
                              }}
                              className="border border-[#d4af37] text-[#d4af37] bg-transparent hover:bg-[#d4af37]/10 px-3.5 py-1.5 rounded-lg text-[9px] font-bold font-sans uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_10px_rgba(212,175,55,0.05)]"
                            >
                              Open Board
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            TAB 2: PROJECT DRILL-DOWN (GANTT VIEW)
            ========================================== */}
        {activeTab === 'drilldown' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Quick Context Navigator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className="p-2.5 rounded-xl border border-[#1a2336] bg-[#111625]/40 hover:bg-[#151d2f]/50 text-slate-400 transition-colors shadow-none"
                  title="Back to Portfolio"
                >
                  <ArrowLeft size={12} />
                </button>
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] font-sans font-bold uppercase tracking-widest text-slate-500">
                    <span>Portfolio</span>
                    <span>/</span>
                    <span>Project details</span>
                  </div>
                  
                  {/* Select menu */}
                  <div className="mt-1">
                    <select 
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(parseInt(e.target.value, 10))}
                      className="bg-transparent text-xl font-serif-lux font-normal text-[#d4af37] focus:outline-none border-b border-dotted border-[#d4af37] cursor-pointer"
                    >
                      {projectsData.map(p => (
                        <option key={p.id} value={p.id} className="text-slate-800 bg-white dark:bg-[#1a1714] dark:text-[#e8e6e3]">{p.name} Task Schedule</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Stats overview */}
              <div className="flex items-center gap-4 bg-[#111625]/40 border border-[#1a2336] px-4 py-2.5 rounded-xl shadow-none text-xs font-sans">
                <div>
                  <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-widest">Phase</span>
                  <span className="font-bold text-[#d4af37] block mt-0.5 uppercase">{selectedProject.phase}</span>
                </div>
                <div className="h-6 w-px bg-[#1a2336]"></div>
                <div>
                  <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-widest">Completion</span>
                  <span className="font-bold text-[#d4af37] block mt-0.5 font-mono">{selectedProject.progress}%</span>
                </div>
                <div className="h-6 w-px bg-[#1a2336]"></div>
                <div>
                  <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-widest">Variance</span>
                  <span className={`font-bold block mt-0.5 font-mono ${selectedProject.delay > 0 ? 'text-rose-400' : 'text-[#33b3d4]'}`}>
                    {selectedProject.delay > 0 ? `+${selectedProject.delay} d` : 'On Time'}
                  </span>
                </div>
              </div>
            </div>

            {/* Split Screen Layout: Gantt Timeline and Risk Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Main Panel: Gantt Visual Timeline */}
              <div className="lg:col-span-2 space-y-6">
                
                <div className="bg-[#111625]/40 border border-[#1a2336] rounded-2xl shadow-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-[#1a2336]">
                    <h3 className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ListTodo size={16} className="text-[#33b3d4]" />
                      Visual Schedule Progress Tracking (Gantt)
                    </h3>
                  </div>

                  <div className="space-y-6 pt-2">
                    {projectTasks.map((task) => {
                      const isDelayed = task.status === 'Delayed';
                      const progressWidth = task.progress;

                      return (
                        <div key={task.id} className="space-y-2 border-b border-[#1a2336]/40 pb-4 last:border-0 last:pb-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  task.status === 'Completed' ? 'bg-emerald-500' : 
                                  task.status === 'Delayed' ? 'bg-rose-500' : 
                                  task.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-500'
                                }`}></span>
                                <h4 className="text-sm font-serif-lux font-bold text-white">{task.name}</h4>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                                <span>Type: {task.type}</span>
                                <span>Start: {task.baselineStart}</span>
                                <span>Finish: {task.actualFinish}</span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-sans font-bold tracking-wider uppercase border ${getTaskStatusBadge(task.status)}`}>
                              {task.status}
                            </span>
                          </div>

                          {/* Gantt Bar Chart */}
                          <div className="pt-1">
                            <div className="w-full bg-[#080c14] h-2.5 rounded-none overflow-hidden relative border border-[#1a2336]">
                              
                              {/* Duration elapsed fill */}
                              <div 
                                className={`h-full transition-all duration-700 ${
                                  isDelayed 
                                    ? 'bg-rose-500/20 border-r border-rose-500' 
                                    : 'bg-[#d4af37]'
                                }`} 
                                style={{ width: `${progressWidth}%` }}
                              >
                                {progressWidth > 15 && (
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-mono font-bold text-white dark:text-slate-900">
                                    {progressWidth}% Done
                                  </span>
                                )}
                              </div>

                              {/* Target Deadline Marker */}
                              <div className="absolute right-12 top-0 bottom-0 w-[0.5px] bg-slate-600" title="Baseline Milestone"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Database mock note */}
                <div className="flex items-center gap-2 text-[9px] font-sans text-slate-500 uppercase tracking-wider font-bold">
                  <Database size={11} className="text-[#d4af37]" />
                  <span>Local Relational Mapping. Schema ready for dynamic database bindings.</span>
                </div>

              </div>

              {/* Sidebar: Risk Management & Blocker Alerts */}
              <div className="space-y-6">
                
                {/* Active Blocker Warnings */}
                <div className="bg-rose-950/5 border border-rose-900/20 rounded-2xl p-6 shadow-2xl space-y-4">
                  <h4 className="text-[10px] font-bold font-sans text-rose-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert size={14} />
                    Active Blocker Alerts
                  </h4>

                  <div className="space-y-3">
                    {projectTasks.filter(t => t.status === 'Delayed').map((task, idx) => (
                      <div key={idx} className="bg-[#111625]/80 border border-rose-900/30 p-4 rounded-xl shadow-lg space-y-3">
                        <div>
                          <span className="text-[8px] font-bold font-sans tracking-wider uppercase px-2 py-0.5 bg-rose-950 text-rose-400 rounded-md border border-rose-900/30">
                            Critical Path delay
                          </span>
                          <h5 className="text-xs font-serif-lux font-bold text-white mt-2">{task.name}</h5>
                        </div>

                        {/* Blocker Text */}
                        <p className="text-[11px] text-rose-400/90 italic bg-rose-950/20 p-2.5 rounded-lg border-l-2 border-rose-500">
                          &quot;{task.blocker || 'Delay variance logged in project timeline.'}&quot;
                        </p>

                        {/* Owner Badge */}
                        <div className="flex items-center gap-2 pt-1 border-t border-[#1a2336]">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${task.owner?.avatarBg || 'bg-slate-400'}`}>
                            {task.owner?.initials || 'TO'}
                          </div>
                          <div>
                            <span className="text-[8px] font-sans font-bold text-slate-500 uppercase block">Owner Assigned</span>
                            <span className="text-xs font-bold text-slate-300">{task.owner?.name || 'Task Officer'}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {projectTasks.filter(t => t.status === 'Delayed').length === 0 && (
                      <div className="text-center py-6">
                        <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={18} />
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest font-sans">No active schedule blockers</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Directory */}
                <div className="bg-[#111625]/40 border border-[#1a2336] rounded-2xl p-6 shadow-2xl space-y-4">
                  <h4 className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} />
                    Project Directory
                  </h4>

                  <div className="space-y-3">
                    {Array.from(new Set(projectTasks.map(t => JSON.stringify(t.owner)))).map((ownerStr, idx) => {
                      const ownerObj = JSON.parse(ownerStr);
                      if (!ownerObj) return null;
                      return (
                        <div key={idx} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-[#151d2f]/50 transition-colors">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${ownerObj.avatarBg}`}>
                            {ownerObj.initials}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{ownerObj.name}</span>
                            <span className="text-[9px] text-slate-400 block font-sans uppercase tracking-wider">Lead Task Architect</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            LUXURY FOOTER
            ========================================== */}
        <footer className="pt-6 border-t border-[#1a2336] flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-widest font-sans font-bold">
          <span>Hassan Allam Properties © 2026. All Rights Reserved.</span>
          <span className="text-[#d4af37] font-mono">V1.4 PROTOTYPE</span>
        </footer>

      </div>
    </div>
  );
}
