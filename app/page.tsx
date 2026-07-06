'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  Database, 
  Users, 
  ShieldAlert, 
  ListTodo,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '../utils/supabase/client';

// Define data interfaces
interface TaskData {
  project: string;
  phase: string;
  scope: string;
  stage: string;
  owner: string | null;
  consultant: string | null;
  bFinish: string | null;
  fFinish: string | null;
  status: string;
  
  // Schedule timeline metrics
  durationDays: number | null;
  durationWeeks: number | null;
  durationMonths: number | null;
  baselineStart: string | null;
  baselineFinish: string | null;
  durationActualWeeks: number | null;
  actualStart: string | null;
  actualFinish: string | null;
}

// Helper to compute delay in days
const getDelayDays = (bFinish: string | null, fFinish: string | null): number => {
  if (!bFinish || !fFinish) return 0;
  const b = new Date(bFinish);
  const f = new Date(fFinish);
  if (isNaN(b.getTime()) || isNaN(f.getTime())) return 0;
  const diff = f.getTime() - b.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

// Helper to compute remaining days relative to today
const getRemainingDays = (fFinish: string | null): number | null => {
  if (!fFinish) return null;
  const target = new Date(fFinish);
  if (isNaN(target.getTime())) return null;
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = targetMidnight.getTime() - todayMidnight.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper to determine if a task is delayed (overdue relative to today)
const isTaskDelayed = (t: TaskData): boolean => {
  if (t.status === 'Complete') return false;
  if (!t.fFinish) return false;
  const target = new Date(t.fFinish);
  if (isNaN(target.getTime())) return false;
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return targetMidnight < todayMidnight;
};

// Helper to compute task schedule variance in days (now using days to finish column)
const getTaskVariance = (t: TaskData): number => {
  if (t.durationActualWeeks !== null) return t.durationActualWeeks;
  return 0;
};



const CYCLE_DURATION_MS = 12000; // 12 seconds per slide
const CYCLE_INTERVAL_MS = 100;   // Update progress bar every 100ms

export default function ControlBoardDashboard() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'presentation' | 'interactive'>('presentation');
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  
  // Real-time Clock State
  const [timeStr, setTimeStr] = useState('—');
  const [dateStr, setDateStr] = useState('—');
  const [refreshTime, setRefreshTime] = useState('');

  // Interactive View Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('All');
  const [selectedScope, setSelectedScope] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Supabase Live Data State
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tasks from Supabase
  useEffect(() => {
    async function loadTasks() {
      try {
        let allData: any[] = [];
        let from = 0;
        const limit = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('project', { ascending: true })
            .order('created_at', { ascending: true })
            .range(from, from + limit - 1);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += limit;
            if (data.length < limit) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
        
        const mapped: TaskData[] = allData.map(row => ({
          project: row.project,
          phase: row.phase,
          scope: row.subproject || row.phase,
          stage: row.task_name,
          owner: row.owner,
          consultant: row.consultant,
          bFinish: row.baseline_finish,
          fFinish: row.actual_finish || row.baseline_finish,
          status: row.status,
          durationDays: row.duration_days,
          durationWeeks: row.duration_weeks,
          durationMonths: row.duration_months,
          baselineStart: row.baseline_start,
          baselineFinish: row.baseline_finish,
          durationActualWeeks: row.duration_actual_weeks,
          actualStart: row.actual_start,
          actualFinish: row.actual_finish
        }));
        
        setTasks(mapped);
      } catch (err) {
        console.error("Failed to load tasks from Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTasks();
  }, []);

  // Dynamic projects list extracted from dataset
  const projectsList = useMemo(() => {
    const projSet = new Set<string>();
    tasks.forEach(t => {
      if (t.project) projSet.add(t.project);
    });
    return Array.from(projSet).sort();
  }, [tasks]);

  // Bidirectional synchronization between slideshow slideIndex and selectedPhase filter
  useEffect(() => {
    if (slideIndex === 0) {
      setSelectedPhase('All');
    } else {
      const projName = projectsList[slideIndex - 1];
      if (projName) {
        setSelectedPhase(projName);
      }
    }
  }, [slideIndex, projectsList]);

  const handlePhaseFilterChange = (phaseName: string) => {
    setSelectedPhase(phaseName);
    if (phaseName === 'All') {
      setSlideIndex(0);
    } else {
      const idx = projectsList.indexOf(phaseName);
      if (idx !== -1) {
        setSlideIndex(idx + 1);
      }
    }
    setProgress(0);
  };

  // Initialize refresh time and clock loop
  useEffect(() => {
    const now = new Date();
    setRefreshTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

    const updateClock = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('en-US', { hour12: false }));
      setDateStr(d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Slide Index transitions
  const handleNext = useCallback(() => {
    const total = projectsList.length + 1;
    setSlideIndex(prev => (prev + 1) % total);
    setProgress(0);
  }, [projectsList.length]);

  const handlePrev = useCallback(() => {
    const total = projectsList.length + 1;
    setSlideIndex(prev => (prev - 1 + total) % total);
    setProgress(0);
  }, [projectsList.length]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleDotClick = (index: number) => {
    setSlideIndex(index);
    setProgress(0);
  };

  // Keyboard navigation hotkeys for Presentation Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'presentation') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handlePlayPause, handleNext, handlePrev]);

  // Slideshow Auto-cycling Timer loop
  useEffect(() => {
    if (!isPlaying) return;

    const step = (CYCLE_INTERVAL_MS / CYCLE_DURATION_MS) * 100;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          const total = projectsList.length + 1;
          setSlideIndex(curr => (curr + 1) % total);
          return 0;
        }
        return prev + step;
      });
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPlaying, slideIndex, projectsList.length]);

  // Unique scopes in the dataset
  const allScopes = useMemo(() => {
    const scopes = new Set<string>();
    tasks.forEach(t => {
      if (t.scope) scopes.add(t.scope);
    });
    return Array.from(scopes).sort();
  }, [tasks]);

  // Portfolio level stats computed dynamically
  const portfolioStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Complete').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const notStarted = tasks.filter(t => t.status === 'Not Started').length;
    const delayed = tasks.filter(t => isTaskDelayed(t)).length;
    const completionPercent = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
    const totalDelayDays = tasks.reduce((sum, t) => sum + (isTaskDelayed(t) ? getTaskVariance(t) : 0), 0);

    return {
      total,
      completed,
      inProgress,
      notStarted,
      delayed,
      completionPercent,
      totalDelayDays
    };
  }, [tasks]);

  // Project level stats computed dynamically
  const phaseStats = useMemo(() => {
    return projectsList.map(projectName => {
      const projectTasks = tasks.filter(t => t.project === projectName);
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === 'Complete').length;
      const inProgress = projectTasks.filter(t => t.status === 'In Progress').length;
      const notStarted = projectTasks.filter(t => t.status === 'Not Started').length;
      const delayed = projectTasks.filter(t => isTaskDelayed(t)).length;
      const completionPercent = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
      const totalDelayDays = projectTasks.reduce((sum, t) => sum + (isTaskDelayed(t) ? Math.max(0, getTaskVariance(t)) : 0), 0);

      // Compute Project end dates
      const baselineDates = projectTasks.map(t => t.bFinish).filter(Boolean) as string[];
      const forecastDates = projectTasks.map(t => t.fFinish).filter(Boolean) as string[];
      
      const maxDate = (dates: string[]) => {
        if (dates.length === 0) return '—';
        const sorted = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        return sorted[sorted.length - 1];
      };

      const baselineEnd = maxDate(baselineDates);
      const forecastEnd = maxDate(forecastDates);

      // Retrieve variance of the project itself from task metadata (fetched from Cell J1 of the tab)
      const projectVarianceDays = projectTasks[0]?.durationMonths || 0;

      // Determine project health color dot
      let healthColor = 'g';
      if (delayed >= 5) {
        healthColor = 'r';
      } else if (delayed > 0) {
        healthColor = 'a';
      }

      return {
        name: projectName,
        total,
        completed,
        inProgress,
        notStarted,
        delayed,
        completionPercent,
        totalDelayDays,
        healthColor,
        baselineEnd,
        forecastEnd,
        projectVarianceDays,
        tasks: projectTasks
      };
    });
  }, [tasks, projectsList]);

  // Compute portfolio-wide accumulated project variance
  const totalPortfolioVariance = useMemo(() => {
    return phaseStats.reduce((sum, p) => sum + p.projectVarianceDays, 0);
  }, [phaseStats]);

  // Scope distribution statistics for Portfolio overview stacked bar chart
  const scopeBreakdown = useMemo(() => {
    return allScopes.map(scopeName => {
      const scopeTasks = tasks.filter(t => t.scope === scopeName);
      const total = scopeTasks.length;
      const completed = scopeTasks.filter(t => t.status === 'Complete').length;
      const delayed = scopeTasks.filter(t => isTaskDelayed(t)).length;
      const inProgress = scopeTasks.filter(t => t.status === 'In Progress' && !isTaskDelayed(t)).length;
      const notStarted = scopeTasks.filter(t => t.status === 'Not Started' && !isTaskDelayed(t)).length;

      return {
        name: scopeName,
        total,
        completed,
        delayed,
        inProgress,
        notStarted,
        completedPercent: total > 0 ? (completed / total) * 100 : 0,
        delayedPercent: total > 0 ? (delayed / total) * 100 : 0,
        inProgressPercent: total > 0 ? (inProgress / total) * 100 : 0,
        notStartedPercent: total > 0 ? (notStarted / total) * 100 : 0
      };
    });
  }, [tasks, allScopes]);

  // Project Specific Scope Progress breakdown (circular gauges)
  const phaseScopes = useMemo(() => {
    return phaseStats.map(phase => {
      const scopesMap: Record<string, { total: number; completed: number; bDates: string[]; fDates: string[] }> = {};
      phase.tasks.forEach(t => {
        if (!scopesMap[t.scope]) {
          scopesMap[t.scope] = { total: 0, completed: 0, bDates: [], fDates: [] };
        }
        scopesMap[t.scope].total++;
        if (t.status === 'Complete') {
          scopesMap[t.scope].completed++;
        }
        if (t.bFinish) scopesMap[t.scope].bDates.push(t.bFinish);
        if (t.fFinish) scopesMap[t.scope].fDates.push(t.fFinish);
      });
      
      return Object.keys(scopesMap).map(scopeName => {
        const { total, completed, bDates, fDates } = scopesMap[scopeName];
        
        // Find latest baseline and forecast end dates for this scope
        const maxDate = (dates: string[]) => {
          if (dates.length === 0) return '—';
          const sorted = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
          return sorted[sorted.length - 1];
        };
        
        const baselineEnd = maxDate(bDates);
        const forecastEnd = maxDate(fDates);
        
        return {
          name: scopeName,
          total,
          completed,
          percent: total > 0 ? (completed / total) * 100 : 0,
          baselineEnd,
          forecastEnd
        };
      });
    });
  }, [phaseStats]);

  // Filtered tasks logic for the Interactive Drill-Down view
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = searchQuery === '' || 
        t.stage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.owner && t.owner.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.consultant && t.consultant.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPhase = selectedPhase === 'All' || t.project === selectedPhase;
      const matchesScope = selectedScope === 'All' || t.scope === selectedScope;
      
      let matchesStatus = true;
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Delayed') {
          matchesStatus = isTaskDelayed(t);
        } else {
          matchesStatus = t.status === selectedStatus;
        }
      }

      return matchesSearch && matchesPhase && matchesScope && matchesStatus && t.status !== 'Complete';
    });
  }, [tasks, searchQuery, selectedPhase, selectedScope, selectedStatus]);

  // Selected task in Drill-Down mode
  const selectedTask = useMemo(() => {
    if (selectedTaskId) {
      const found = tasks.find(t => `${t.phase}-${t.scope}-${t.stage}` === selectedTaskId);
      if (found) return found;
    }
    return filteredTasks[0] || null;
  }, [tasks, selectedTaskId, filteredTasks]);


  // Status badges colors helper
  const renderStatusBadge = (status: string, isDelayed: boolean) => {
    if (status === 'Complete') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-[#46c08a]/30 bg-[#46c08a]/10 text-[#46c08a] shadow-[0_0_8px_rgba(70,192,138,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#46c08a] shadow-[0_0_6px_#46c08a]" />
          Complete
        </span>
      );
    }
    if (status === 'In Progress') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-[#f1a73a]/30 bg-[#f1a73a]/10 text-[#f1a73a] shadow-[0_0_8px_rgba(241,167,58,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f1a73a] shadow-[0_0_6px_#f1a73a]" />
          In Progress
        </span>
      );
    }
    if (isDelayed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-[#ff5a5f]/30 bg-[#ff5a5f]/10 text-[#ff5a5f] shadow-[0_0_8px_rgba(255,90,95,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5f] shadow-[0_0_6px_#ff5a5f] animate-pulse" />
          Delayed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-white/10 bg-white/5 text-[#7e95ab]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7e95ab]/50" />
        Not Started
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1d2e] flex flex-col items-center justify-center text-[#eaf1f8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-t-2 border-[#34c6a6] animate-spin" />
          <h2 className="text-lg font-bold tracking-widest uppercase text-white animate-pulse">
            Connecting to Supabase...
          </h2>
          <p className="text-xs text-[#7e95ab] tracking-wider uppercase">
            Loading Live Programme Data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-[#0b1d2e] text-[#eaf1f8] relative overflow-hidden select-none">
      
      {/* Background Floating Pulsing Glow Orbs */}
      <div className="glow-orb glow-orb-teal"></div>
      <div className="glow-orb glow-orb-blue"></div>

      {/* ==========================================
          TOP BAR (BRAND HEADER & LIVE CLOCK)
          ========================================== */}
      <div className="topbar flex-none h-[9.2vh] min-h-[64px] flex items-center gap-[1.4vw] px-[2.2vw] border-b border-white/10 bg-gradient-to-b from-[#0e2438] to-[#0b1d2e] relative z-40">
        <div className="brand flex items-center gap-[1.1vw]">
          {/* HAP Logo */}
          <div className="w-[45px] h-[45px] rounded-xl bg-white flex items-center justify-center shadow-lg p-0.5">
            <img src="/hap.png" alt="HAP Logo" className="w-full h-full object-contain" />
          </div>
          <div className="w-[1px] h-[30px] bg-white/10"></div>
          <div className="brand-text">
            <span className="text-[12px] sm:text-[14px] font-semibold text-[#34c6a6] tracking-[.32em] uppercase block">
              HAP Projects
            </span>
          </div>
        </div>
        
        {/* Toggle Mode Navigation Tab buttons */}
        <div className="ml-12 flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('presentation')}
            className={`px-4 py-1.5 rounded-lg border text-[10px] font-sans font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer ${
              activeTab === 'presentation'
                ? 'border-[#34c6a6] text-[#34c6a6] bg-[#34c6a6]/5 shadow-[0_0_10px_rgba(52,198,166,0.1)]'
                : 'border-white/10 text-[#7e95ab] hover:text-[#eaf1f8] hover:border-white/20'
            }`}
          >
            Presentation Mode
          </button>
          <button 
            onClick={() => {
              setActiveTab('interactive');
              setIsPlaying(false);
            }}
            className={`px-4 py-1.5 rounded-lg border text-[10px] font-sans font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer ${
              activeTab === 'interactive'
                ? 'border-[#34c6a6] text-[#34c6a6] bg-[#34c6a6]/5 shadow-[0_0_10px_rgba(52,198,166,0.1)]'
                : 'border-white/10 text-[#7e95ab] hover:text-[#eaf1f8] hover:border-white/20'
            }`}
          >
            Interactive Control Board
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-6 text-[9px] font-mono tracking-widest text-[#7e95ab] border-l border-white/10 pl-6 mr-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#46c08a] shadow-[0_0_8px_#46c08a] animate-pulse" />
            <span>DB BINDING: ONLINE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34c6a6] shadow-[0_0_8px_#34c6a6]" />
            <span>METRICS: VERIFIED</span>
          </div>
        </div>

        <div className="flex-grow"></div>
        
        {/* Topbar Clock & Refresh information */}
        <div className="flex items-center gap-8 relative z-50">
          <div className="fresh text-right text-[11px] text-[#7e95ab] font-sans leading-none hidden md:block">
            Last update: Today at <b className="text-[#34c6a6] font-semibold">{refreshTime}</b>
          </div>
          
          <div className="clock text-right leading-none border-l border-white/10 pl-6">
            <div className="d text-[14px] font-semibold text-[#eaf1f8] tracking-wide">{dateStr}</div>
            <div className="t text-[11px] text-[#7e95ab] font-mono tracking-widest mt-1 uppercase">{timeStr} UT+3</div>
          </div>
        </div>
      </div>

      {/* ==========================================
          DASHBOARD MAIN VIEWPORT (SLIDESHOW / GRID)
          ========================================== */}
      <div className="flex-grow relative bg-tech-grid z-10">
        <div className="radar-scan"></div>
        
        {/* VIEW 1: PRESENTATION VIEW SLIDEOVER SYSTEM */}
        {activeTab === 'presentation' && (
          <div className="absolute inset-0 flex flex-col">
            <div className="slidewrap flex-grow relative">
              
              {/* SLIDE 0: PORTFOLIO PROGRAMME OVERVIEW */}
              <div className={`slide ${slideIndex === 0 ? 'on' : ''}`}>
                <div className="slide-head flex items-end gap-[1.2vw] mb-[1.4vh]">
                  <span className="tag text-[12px] tracking-[.26em] text-[#34c6a6] font-semibold uppercase">Hassan Allam Properties</span>
                  <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-white leading-none">Portfolio Programme Summary</h1>
                  <span className="pagebadge text-[11px] font-bold text-[#34c6a6] bg-[#34c6a6]/12 border border-[#34c6a6]/38 px-[0.8vw] py-[0.3vh] rounded-full self-center">Portfolio Overview</span>
                </div>

                {/* Portfolio level KPIs */}
                <div className="kpis p">
                  {/* Completed pie chart */}
                  <div className="donut glass-panel">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                        <circle cx="50" cy="50" r="42" className="stroke-[#46c08a] progress-ring-circle" strokeWidth="6" fill="transparent"
                          strokeDasharray="263.89"
                          strokeDashoffset={263.89 - (263.89 * portfolioStats.completionPercent) / 100}
                          strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white font-mono">{portfolioStats.completionPercent}%</span>
                    </div>
                    <div className="meta">
                      <div className="lab text-[10px] tracking-[.16em] uppercase text-[#7e95ab]">Completed</div>
                      <div className="big text-[22px] font-bold mt-[0.3vh] text-[#46c08a] font-serif-lux">
                        {portfolioStats.completed} <small className="text-[12px] text-[#aebfd1] font-semibold font-sans">/ {portfolioStats.total}</small>
                      </div>
                    </div>
                  </div>

                  {/* In Progress pie chart */}
                  <div className="donut glass-panel">
                    {(() => {
                      const pct = portfolioStats.total > 0 ? Math.round((portfolioStats.inProgress / portfolioStats.total) * 1000) / 10 : 0;
                      return (
                        <>
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                              <circle cx="50" cy="50" r="42" className="stroke-[#f1a73a] progress-ring-circle" strokeWidth="6" fill="transparent"
                                strokeDasharray="263.89"
                                strokeDashoffset={263.89 - (263.89 * pct) / 100}
                                strokeLinecap="round" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white font-mono">{pct}%</span>
                          </div>
                          <div className="meta">
                            <div className="lab text-[10px] tracking-[.16em] uppercase text-[#7e95ab]">In Progress</div>
                            <div className="big text-[22px] font-bold mt-[0.3vh] text-[#f1a73a] font-serif-lux">
                              {portfolioStats.inProgress} <small className="text-[12px] text-[#aebfd1] font-semibold font-sans">/ {portfolioStats.total}</small>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Delayed pie chart */}
                  <div className="donut glass-panel">
                    {(() => {
                      const pct = portfolioStats.total > 0 ? Math.round((portfolioStats.delayed / portfolioStats.total) * 1000) / 10 : 0;
                      return (
                        <>
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                              <circle cx="50" cy="50" r="42" className="stroke-[#ff5a5f] progress-ring-circle" strokeWidth="6" fill="transparent"
                                strokeDasharray="263.89"
                                strokeDashoffset={263.89 - (263.89 * pct) / 100}
                                strokeLinecap="round" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white font-mono">{pct}%</span>
                          </div>
                          <div className="meta">
                            <div className="lab text-[10px] tracking-[.16em] uppercase text-[#7e95ab]">Delayed</div>
                            <div className="big text-[22px] font-bold mt-[0.3vh] text-[#ff5a5f] font-serif-lux">
                              {portfolioStats.delayed} <small className="text-[12px] text-[#aebfd1] font-semibold font-sans">/ {portfolioStats.total}</small>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="kpi">
                    <div className="lab">Total Scope</div>
                    <div className="val text-white font-serif-lux">{portfolioStats.total}</div>
                    <div className="w-full h-5 mt-1 overflow-hidden opacity-50">
                      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="glow-teal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34c6a6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#34c6a6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,25 T20,24 T40,24 T60,25 T80,24 T100,24" fill="none" stroke="#34c6a6" strokeWidth="1.5" />
                        <path d="M0,25 T20,24 T40,24 T60,25 T80,24 T100,24 L100,30 L0,30 Z" fill="url(#glow-teal)" />
                      </svg>
                    </div>
                    <div className="foot mt-1">All active programme stages</div>
                  </div>

                  <div className="kpi">
                    <div className="lab">Not Started</div>
                    <div className="val text-[#7e95ab] font-serif-lux">{portfolioStats.notStarted}</div>
                    <div className="w-full h-5 mt-1 overflow-hidden opacity-50">
                      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="glow-grey" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7e95ab" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#7e95ab" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,20 Q25,22 50,18 T100,20" fill="none" stroke="#7e95ab" strokeWidth="1.5" />
                        <path d="M0,20 Q25,22 50,18 T100,20 L100,30 L0,30 Z" fill="url(#glow-grey)" />
                      </svg>
                    </div>
                    <div className="foot mt-1">Pending programme stages</div>
                  </div>
                </div>

                {/* Full Width Summary Layout */}
                <div className="flex-grow min-h-[30vh] overflow-hidden flex flex-col mt-2">
                  
                  {/* Left Side: Summary table of Phase progress */}
                  <div className="flex-grow flex flex-col sumtable">
                    <div className="bh font-bold text-[14px] text-white flex items-center justify-between">
                      <span>Programme Breakdown by Project</span>
                      <span className="text-[11px] text-[#7e95ab] font-mono font-normal">Active items tracked</span>
                    </div>
                    <div className="tablewrap flex-grow overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Project Name</th>
                            <th style={{ textAlign: 'center' }}>Scope Completion</th>
                            <th style={{ textAlign: 'center' }}>Total Tasks</th>
                            <th style={{ textAlign: 'center' }}>Completed</th>
                            <th style={{ textAlign: 'center' }}>In Progress</th>
                            <th style={{ textAlign: 'center' }}>Not Started</th>
                            <th style={{ textAlign: 'center' }}>Delayed</th>
                            <th style={{ textAlign: 'center' }}>Baseline End</th>
                            <th style={{ textAlign: 'center' }}>Forecast End</th>
                            <th style={{ textAlign: 'center' }}>Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {phaseStats.map((phase, idx) => (
                            <tr key={idx} className="hover:bg-[#16314f]/30 transition-colors">
                              <td style={{ textAlign: 'left' }}>
                                <div className="proj !justify-start text-left pl-2">
                                  <span className={`dot ${phase.healthColor === 'r' ? 'r' : phase.healthColor === 'a' ? 'a' : 'g'}`}></span>
                                  <span className="text-white font-semibold">{phase.name}</span>
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center justify-center gap-3">
                                  <div className="bar flex-grow max-w-[150px]">
                                    <i style={{ width: `${phase.completionPercent}%` }}></i>
                                  </div>
                                  <span className="text-[11px] font-mono text-[#aebfd1]">{phase.completionPercent}%</span>
                                </div>
                              </td>
                              <td className="num font-mono text-center">{phase.total}</td>
                              <td className="num font-mono text-center text-[#46c08a]">{phase.completed}</td>
                              <td className="num font-mono text-center text-[#f1a73a]">{phase.inProgress}</td>
                              <td className="num font-mono text-center text-[#7e95ab]">{phase.notStarted}</td>
                              <td className="num font-mono text-center text-[#ff5a5f]">{phase.delayed}</td>
                              <td className="num font-mono text-center text-[#aebfd1]">{phase.baselineEnd}</td>
                              <td className="num font-mono text-center text-[#aebfd1]">{phase.forecastEnd}</td>
                              <td className="num var text-center font-mono">
                                {phase.projectVarianceDays > 0 ? (
                                  <span className="late text-[#ff5a5f] font-semibold">+{phase.projectVarianceDays}d</span>
                                ) : phase.projectVarianceDays < 0 ? (
                                  <span className="early text-[#46c08a] font-semibold">{phase.projectVarianceDays}d</span>
                                ) : (
                                  <span className="early text-[#46c08a] font-semibold">On Time</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          

                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
{/* SLIDES 1-3: PROJECT DETAILS FOR THE 3 PHASES */}
              {phaseStats.map((phase, pIdx) => {
                const sIdx = pIdx + 1;
                const scopesList = phaseScopes[pIdx] || [];
                
                // Calculate critical upcoming milestones (within next 30 days based on actual/forecast finish date)
                const upcomingMilestones = phase.tasks
                  .filter(t => {
                    if (t.status === 'Complete') return false;
                    const fDateStr = t.fFinish || t.bFinish;
                    if (!fDateStr) return false;
                    const target = new Date(fDateStr);
                    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
                    const now = new Date();
                    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                    const thirtyDaysLater = todayMidnight + 30 * 24 * 60 * 60 * 1000;
                    return targetMidnight >= todayMidnight && targetMidnight <= thirtyDaysLater;
                  })
                  .sort((a, b) => {
                    const da = new Date(a.fFinish || a.bFinish!).getTime();
                    const db = new Date(b.fFinish || b.bFinish!).getTime();
                    return da - db;
                  });

                // Calculate active delay log blockers
                const delayedMilestones = phase.tasks
                  .filter(t => isTaskDelayed(t))
                  .sort((a, b) => {
                    const delayA = getTaskVariance(a);
                    const delayB = getTaskVariance(b);
                    return delayB - delayA;
                  });

                return (
                  <div key={pIdx} className={`slide ${slideIndex === sIdx ? 'on' : ''}`}>
                    <div className="slide-head flex items-end gap-[1.2vw] mb-[1.4vh] flex-none">
                      <span className="tag text-[12px] tracking-[.26em] text-[#34c6a6] font-semibold uppercase">Hassan Allam Properties</span>
                      <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-white leading-none">{phase.name}</h1>
                      <span className="pagebadge text-[11px] font-bold text-[#34c6a6] bg-[#34c6a6]/12 border border-[#34c6a6]/38 px-[0.8vw] py-[0.3vh] rounded-full self-center">Project Control Board</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-hidden min-h-[30vh]">
                      
                      {/* Column 1: Scope Progress List */}
                      <div className="flex flex-col sumtable p-4 h-full">
                        <div className="bh font-bold text-[14px] text-white flex items-center justify-between pb-3 mb-3 border-b border-white/10 flex-none">
                          <span>Scope Progress Breakdown</span>
                          <span className="text-[10px] text-[#7e95ab] uppercase font-bold tracking-widest font-sans">Domain Health</span>
                        </div>
                        
                        {/* Overall health card block */}
                        <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 mb-4 flex-none">
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="42" 
                                className="stroke-[#34c6a6] progress-ring-circle" 
                                strokeWidth="6" 
                                fill="transparent" 
                                strokeDasharray="263.89" 
                                strokeDashoffset={263.89 - (263.89 * phase.completionPercent) / 100}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-white font-mono">{phase.completionPercent}%</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[16px] font-bold text-white font-serif-lux">{phase.completed} / {phase.total} Complete</div>
                            <div className="text-[10px] text-[#7e95ab] mt-0.5">
                              {phase.projectVarianceDays !== 0 ? (
                                <span>Project variance: <b className={phase.projectVarianceDays > 0 ? 'text-[#ff5a5f]' : 'text-[#46c08a]'}>{phase.projectVarianceDays > 0 ? '+' : ''}{phase.projectVarianceDays}d</b></span>
                              ) : (
                                <span>Project on schedule</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* List of Scope progress bars */}
                        <div className="space-y-4 flex-grow overflow-y-auto pr-1 scrollable-y">
                          {scopesList.map((scope, sIdx) => (
                            <div key={sIdx} className="space-y-1.5">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-white font-semibold">{scope.name}</span>
                                <span className="text-[#aebfd1] font-mono">{Math.round(scope.percent)}% <small className="text-[#7e95ab]">({scope.completed}/{scope.total})</small></span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-[#0b1d2e] overflow-hidden flex border border-white/5 relative">
                                <div 
                                  style={{ width: `${scope.percent}%` }}
                                  className="h-full bg-gradient-to-r from-[#1f7a5e] to-[#34c6a6] relative"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 w-full h-full animate-[pulse_2s_infinite]" />
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-[9px] text-[#7e95ab] font-mono mt-0.5">
                                <span>Baseline: <b className="text-[#aebfd1] font-normal">{scope.baselineEnd}</b></span>
                                <span>Forecast: <b className="text-[#aebfd1] font-normal">{scope.forecastEnd}</b></span>
                              </div>
                              {(() => {
                                const activeTask = phase.tasks.find(t => t.scope === scope.name && t.status === 'In Progress');
                                if (!activeTask) return null;
                                return (
                                  <div className="text-[10px] text-[#7e95ab] mt-1 truncate pl-1 border-l-2 border-[#f1a73a]/60">
                                    Active: <span className="text-[#f1a73a] font-medium" title={activeTask.stage}>{activeTask.stage}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: Critical Upcoming Milestones */}
                      <div className="flex flex-col sumtable p-4 h-full">
                        <div className="bh font-bold text-[14px] text-white flex items-center justify-between pb-3 mb-3 border-b border-white/10 flex-none">
                          <span>Critical Upcoming Milestones</span>
                          <span className="text-[10px] text-[#7e95ab] uppercase font-bold tracking-widest font-sans">Next Steps</span>
                        </div>
                        
                        <div className="space-y-3.5 flex-grow overflow-y-auto pr-1 scrollable-y">
                          {upcomingMilestones.map((t, idx) => {
                            const remainingDays = t.durationActualWeeks !== null ? t.durationActualWeeks : getRemainingDays(t.fFinish);
                            return (
                              <div key={idx} className="bg-white/5 border border-white/5 hover:border-white/10 transition-colors rounded-xl p-3 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34c6a6] to-[#0e2438] border border-white/10 flex items-center justify-center font-bold text-white text-[9px] shrink-0 mt-0.5">
                                  {t.owner ? t.owner.split('/').map(w => w.trim().charAt(0)).join('') : '—'}
                                </div>
                                <div className="min-w-0 flex-grow text-left">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-[9px] font-bold text-[#7e95ab] uppercase tracking-wider block">{t.scope}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded-md shrink-0 leading-none ${
                                      remainingDays === null ? 'border-white/10 bg-white/5 text-[#7e95ab]' :
                                      remainingDays < 0 ? 'border-[#ff5a5f]/30 bg-[#ff5a5f]/10 text-[#ff5a5f]' :
                                      remainingDays === 0 ? 'border-[#f1a73a]/30 bg-[#f1a73a]/10 text-[#f1a73a]' :
                                      'border-[#34c6a6]/30 bg-[#34c6a6]/10 text-[#34c6a6]'
                                    }`}>
                                      {remainingDays === null ? 'No Date' :
                                       remainingDays < 0 ? `Overdue by ${Math.abs(remainingDays)}d` :
                                       remainingDays === 0 ? 'Due Today' :
                                       `${remainingDays}d left`}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-white block text-[11px] truncate mt-0.5" title={t.stage}>{t.stage}</span>
                                  <span className="text-[10px] font-mono text-[#aebfd1] block mt-0.5 flex items-center gap-1">
                                    <Calendar size={11} className="text-[#34c6a6]" />
                                    Due: {t.fFinish || '—'}
                                  </span>
                                  <span className="text-[9px] text-[#7e95ab] block mt-1">
                                    Owner: <b className="text-[#aebfd1] font-semibold">{t.owner || '—'}</b> | Consultant: <b className="text-[#aebfd1] font-semibold">{t.consultant || '—'}</b>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {upcomingMilestones.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center py-20 text-[#7e95ab]">
                              <CheckCircle2 size={32} className="text-[#46c08a] mb-3 opacity-60" />
                              <span className="text-xs">No pending milestones in this phase.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Column 3: Blocker Alerts / Schedule Variance Log */}
                      <div className="flex flex-col sumtable p-4 h-full">
                        <div className="bh font-bold text-[14px] text-white flex items-center justify-between pb-3 mb-3 border-b border-white/10 flex-none">
                          <span>Delayed Tasks</span>
                          <span className="text-[10px] text-[#ff5a5f] uppercase font-bold tracking-widest font-sans flex items-center gap-1">
                            <AlertTriangle size={11} className="animate-pulse" />
                            Variance
                          </span>
                        </div>
                        
                        <div className="space-y-3.5 flex-grow overflow-y-auto pr-1 scrollable-y">
                          {delayedMilestones.map((t, idx) => {
                            const delay = getTaskVariance(t);
                            return (
                              <div key={idx} className="bg-[#ff5a5f]/5 border border-[#ff5a5f]/15 hover:border-[#ff5a5f]/25 transition-colors rounded-xl p-3 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff5a5f] to-[#0e2438] border border-white/10 flex items-center justify-center font-bold text-white text-[9px] shrink-0 mt-0.5">
                                  {t.owner ? t.owner.split('/').map(w => w.trim().charAt(0)).join('') : '—'}
                                </div>
                                <div className="min-w-0 flex-grow text-left">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-[9px] font-bold text-[#ff5a5f] uppercase tracking-wider block">{t.scope}</span>
                                    <span className="text-[9px] font-bold text-[#ff5a5f] px-1.5 py-0.5 border border-[#ff5a5f]/30 bg-[#ff5a5f]/10 rounded-md shrink-0 font-mono leading-none">
                                      {delay > 0 ? `+${delay}d` : `${delay}d`} delay
                                    </span>
                                  </div>
                                  <span className="font-semibold text-white block text-[11px] truncate mt-0.5" title={t.stage}>{t.stage}</span>
                                  <span className="text-[10px] font-mono text-[#aebfd1] block mt-0.5 flex items-center gap-1.5">
                                    <Calendar size={11} className="text-[#ff5a5f]" />
                                    Planned: <b className="text-white font-normal">{t.bFinish || '—'}</b> → Forecast: <b className="text-white font-normal">{t.fFinish || '—'}</b>
                                  </span>
                                  <span className="text-[9px] text-[#7e95ab] block mt-1">
                                    Owner: <b className="text-[#aebfd1] font-semibold">{t.owner || '—'}</b> | Consultant: <b className="text-[#aebfd1] font-semibold">{t.consultant || '—'}</b>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {delayedMilestones.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center py-20 text-[#7e95ab] h-full">
                              <CheckCircle2 size={32} className="text-[#46c08a] mb-3 opacity-60 animate-bounce" />
                              <span className="text-xs text-[#46c08a] font-bold">On Schedule</span>
                              <span className="text-[10px] text-[#7e95ab] mt-1">All milestones in this phase are tracking to target.</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        )}

        {/* VIEW 2: INTERACTIVE DASHBOARD VIEW (DRILL-DOWN & GANTT SEARCH) */}
        {activeTab === 'interactive' && (
          <div className="absolute inset-0 flex flex-col p-6 space-y-4 overflow-hidden h-full">
            
            {/* SEARCH / FILTERS BAR */}
            <div className="flex-none p-4 rounded-xl bg-[#13293e]/40 border border-white/5 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative min-w-[240px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7e95ab]" />
                  <input 
                    type="text" 
                    placeholder="Search stage owner, consultant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 w-full text-xs rounded-lg border border-white/10 bg-[#0b1d2e] text-[#eaf1f8] focus:outline-none focus:border-[#34c6a6] transition-colors"
                  />
                </div>
                
                {/* Project Filter */}
                <div className="flex items-center gap-1.5 border border-white/10 bg-[#0b1d2e] rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest font-sans">
                  <Filter size={11} className="text-[#34c6a6]" />
                  <select 
                    value={selectedPhase}
                    onChange={(e) => handlePhaseFilterChange(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#aebfd1] text-[10px]"
                  >
                    <option value="All" className="text-slate-800 bg-white">All Projects</option>
                    {projectsList.map((p, idx) => (
                      <option key={idx} value={p} className="text-slate-800 bg-white">{p}</option>
                    ))}
                  </select>
                </div>

                {/* Scope Filter */}
                <div className="flex items-center gap-1.5 border border-white/10 bg-[#0b1d2e] rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest font-sans">
                  <Filter size={11} className="text-[#34c6a6]" />
                  <select 
                    value={selectedScope}
                    onChange={(e) => setSelectedScope(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#aebfd1] text-[10px]"
                  >
                    <option value="All" className="text-slate-800 bg-white">All Parents</option>
                    {allScopes.map((s, idx) => (
                      <option key={idx} value={s} className="text-slate-800 bg-white">{s}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 border border-white/10 bg-[#0b1d2e] rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest font-sans">
                  <Filter size={11} className="text-[#34c6a6]" />
                  <select 
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#aebfd1] text-[10px]"
                  >
                    <option value="All" className="text-slate-800 bg-white">All Statuses</option>
                    <option value="In Progress" className="text-slate-800 bg-white">In Progress</option>
                    <option value="Not Started" className="text-slate-800 bg-white">Not Started</option>
                    <option value="Delayed" className="text-slate-800 bg-white">Delayed Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-[11px] text-[#7e95ab] hidden sm:block">
                  Filtered: <b className="text-white">{filteredTasks.length}</b> / {tasks.length} tasks
                </div>
                
              </div>
            </div>

            {/* MAIN WORKSPACE GRID */}
            <div className="flex-grow flex flex-col overflow-hidden min-h-0 h-full">
                {/* Task table — full width */}
                <div className="flex flex-col bg-[#13293e] border border-white/10 rounded-2xl shadow-xl overflow-hidden h-full min-h-0">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between flex-none">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <ListTodo size={14} className="text-[#34c6a6]" />
                      Interactive Work Streams
                    </h3>
                    <span className="text-[10px] text-[#7e95ab]">Showing active & in-progress tasks only</span>
                  </div>
                  
                  <div className="tablewrap flex-grow overflow-y-auto min-h-0">
                    <table className="text-xs">
                      <thead className="text-[9px]">
                        <tr>
                          <th>Stage / Milestone</th>
                          <th>Parent</th>
                          <th>Owner</th>
                          <th>Consultant</th>
                          <th>Baseline</th>
                          <th>Forecast</th>
                          <th>Status</th>
                          <th>Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredTasks.map((t, idx) => {
                          const delay = getTaskVariance(t);
                          const isDelayed = isTaskDelayed(t);
                          const taskKey = `${t.phase}-${t.scope}-${t.stage}`;
                          const isSelected = selectedTask && `${selectedTask.phase}-${selectedTask.scope}-${selectedTask.stage}` === taskKey;
                          
                          return (
                            <tr 
                              key={idx} 
                              onClick={() => setSelectedTaskId(taskKey)}
                              className={`hover:bg-[#16314f]/50 transition-colors cursor-pointer ${isSelected ? 'bg-[#16314f]' : ''} ${isDelayed ? 'od' : ''}`}
                            >
                              <td className="stage font-medium text-white">
                                {t.stage}
                                <span className="ph block text-[9px] text-[#7e95ab] mt-0.5">{t.phase}</span>
                              </td>
                              <td className="scope">{t.scope}</td>
                              <td className="owner">{t.owner || '—'}</td>
                              <td className="cons">{t.consultant || '—'}</td>
                              <td className="date font-mono text-[10px]">{t.bFinish || '—'}</td>
                              <td className="date font-mono text-[10px]">{t.fFinish || '—'}</td>
                              <td className="status">
                                {renderStatusBadge(t.status, isDelayed)}
                              </td>
                              <td className="days">
                                {delay > 0 ? (
                                  <span className="pill g text-[8px] py-[2px]">+{delay}d</span>
                                ) : delay < 0 ? (
                                  <span className="pill r text-[8px] py-[2px]">{delay}d</span>
                                ) : (
                                  <span className="pill g text-[8px] py-[2px]">On Time</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredTasks.length === 0 && (
                          <tr>
                            <td colSpan={9} className="text-center py-20 text-[#7e95ab]">
                              No matching milestones found. Adjust filters to search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          FOOTER (SLIDESHOW MANUAL AND AUTOMATIC CYCLE CONTROLS)
          ========================================== */}
      <div className="footer flex-none h-[5.6vh] min-h-[42px] flex items-center gap-[1.2vw] px-[2.2vw] border-t border-white/10 bg-[#0e2438] relative z-40">
        
        {/* Navigation arrow / play-pause cycle buttons */}
        <div className="ctrl flex items-center gap-[0.5vw]">
          <button 
            id="prev" 
            onClick={handlePrev}
            className="w-[3.2vh] h-[3.2vh] min-w-[26px] min-h-[26px] rounded-lg grid place-items-center text-[#aebfd1] bg-white/5 hover:bg-white/10 hover:text-[#eaf1f8] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Previous (←)"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button 
            id="play" 
            onClick={handlePlayPause}
            className="w-[3.2vh] h-[3.2vh] min-w-[26px] min-h-[26px] rounded-lg grid place-items-center text-[#aebfd1] bg-white/5 hover:bg-white/10 hover:text-[#eaf1f8] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Pause/Play (space)"
            aria-label="Pause or play"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          
          <button 
            id="next" 
            onClick={handleNext}
            className="w-[3.2vh] h-[3.2vh] min-w-[26px] min-h-[26px] rounded-lg grid place-items-center text-[#aebfd1] bg-white/5 hover:bg-white/10 hover:text-[#eaf1f8] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Next (→)"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Dynamic slide name status display */}
        <div className="pgname text-[11px] text-[#7e95ab] tracking-[0.04em] min-w-[12vw] ml-3">
          Slide Name: <b className="text-[#aebfd1] font-semibold">
            {slideIndex === 0 ? "Portfolio Overview" : projectsList[slideIndex - 1]}
          </b>
        </div>
        
        {/* Progress Fill bar indicating rotation time remaining */}
        <div className="cycle flex-grow h-[4px] rounded-full bg-white/10 overflow-hidden relative">
          <i 
            id="cyclebar" 
            className="block h-full bg-[#34c6a6] rounded-full transition-all ease-linear duration-100" 
            style={{ width: `${progress}%` }}
          ></i>
        </div>
        
        {/* Navigation slide index dot indicator list */}
        <div className="dots flex gap-[0.7vw]">
          {Array.from({ length: projectsList.length + 1 }, (_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`w-[0.85vw] h-[0.85vw] min-w-[9px] min-h-[9px] rounded-full transition-all duration-300 cursor-pointer ${
                slideIndex === idx 
                  ? 'bg-[#34c6a6] scale-125' 
                  : 'bg-white/20 hover:bg-white/50 disabled:pointer-events-none'
              }`}
              title={`Slide ${idx + 1}`}
              aria-label={`Slide ${idx + 1}`}
            ></button>
          ))}
        </div>

        {/* Footnote versioning */}
        <div className="text-[10px] text-[#7e95ab] border-l border-white/10 pl-6 font-mono font-bold tracking-wider hidden sm:block">
          PORTFOLIO CONTROL V2.0
        </div>
      </div>
      
    </div>
  );
}
