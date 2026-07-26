'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  ListTodo,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '../utils/supabase/client';

// Define data interfaces
interface TaskData {
  project: string;
  phase: string;
  phasePriority: number | null;
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
  if (t.durationActualWeeks !== null) return Math.ceil(t.durationActualWeeks);
  return 0;
};



// Isolated so its 1x/sec tick only re-renders this small subtree, not the whole dashboard.
function LiveClock() {
  const [timeStr, setTimeStr] = useState('—');
  const [dateStr, setDateStr] = useState('—');

  useEffect(() => {
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

  return (
    <div className="clock text-right leading-none border-l border-white/10 pl-6">
      <div className="d text-[14px] font-semibold text-[#f3eee3] tracking-wide">{dateStr}</div>
      <div className="t text-[11px] text-[#8597a9] font-mono tracking-widest mt-1 uppercase">{timeStr} UT+3</div>
    </div>
  );
}

export default function ControlBoardDashboard() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'presentation' | 'interactive'>('presentation');
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  // Cycle progress bar is updated via direct DOM writes (not React state) since it
  // changes every animation frame — routing that through setState would re-render
  // the whole dashboard 60x/sec.
  const progressBarRef = useRef<HTMLElement>(null);
  const setProgress = useCallback((pct: number) => {
    if (progressBarRef.current) progressBarRef.current.style.width = `${pct}%`;
  }, []);
  
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

  // Fetch tasks from Supabase (re-run on an interval since these screens run unattended for days —
  // without a refetch, date-relative stats like "delayed" go stale after the initial page load)
  const loadTasks = useCallback(async () => {
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
        phasePriority: row.phase_priority,
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
  }, [supabase]);

  useEffect(() => {
    loadTasks();
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    const interval = setInterval(loadTasks, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadTasks]);

  // Dynamic projects list extracted from dataset, ordered by nearest actual/forecast date
  // (matches the "Forecast" column shown per project: the latest task finish date)
  const projectsList = useMemo(() => {
    const datesByProject = new Map<string, number[]>();
    tasks.forEach(t => {
      if (!t.project) return;
      if (!datesByProject.has(t.project)) datesByProject.set(t.project, []);
      const time = t.fFinish ? new Date(t.fFinish).getTime() : NaN;
      if (!Number.isNaN(time)) datesByProject.get(t.project)!.push(time);
    });
    const projectForecastEnd = (name: string) => {
      const dates = datesByProject.get(name) || [];
      return dates.length ? Math.max(...dates) : Infinity;
    };
    return Array.from(datesByProject.keys()).sort((a, b) => projectForecastEnd(a) - projectForecastEnd(b));
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

  // Initialize refresh time (set once on load; ticking clock lives in <LiveClock /> below
  // so its 1x/sec update doesn't re-render the whole dashboard tree)
  useEffect(() => {
    const now = new Date();
    setRefreshTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
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

  // Auto-scroll the slide's scrollable column(s); advance when done.
  // Portfolio slide (0): 20s. Project slides: 60s.
  useEffect(() => {
    if (!isPlaying) return;

    const isPortfolio  = slideIndex === 0;
    const MAX_SLIDE_MS = isPortfolio ? 20000 : 60000; // cap scroll phase
    const FALLBACK_MS  = MAX_SLIDE_MS;                // dwell time if nothing to scroll
    const SETTLE_MS    = 700;   // wait for slide transition (~600ms) + buffer

    let rafId: number;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let done = false;
    setProgress(0);

    const advance = () => {
      if (done) return;
      done = true;
      setProgress(100);
      const t = setTimeout(() => {
        const total = projectsList.length + 1;
        setSlideIndex(curr => (curr + 1) % total);
        setProgress(0);
      }, 1000);
      timers.push(t);
    };

    const t = setTimeout(() => {
      // Query live DOM — reliable because slide is position:absolute (always in layout)
      const cols = Array.from(
        document.querySelectorAll<HTMLDivElement>(`[data-slide-col="${slideIndex}"]`)
      );

      // Reset to top
      cols.forEach(el => { el.scrollTop = 0; });

      const maxScrollable = Math.max(
        ...cols.map(el => Math.max(0, el.scrollHeight - el.clientHeight)),
        0
      );

      // No scrollable content — dwell then move on
      if (maxScrollable < 2) {
        timers.push(setTimeout(advance, FALLBACK_MS));
        return;
      }

      const targets = cols.map(el => Math.max(0, el.scrollHeight - el.clientHeight));
      let startTs: number | null = null;

      // Timestamp-driven (not frame-count-driven) so speed stays correct
      // regardless of the display's refresh rate or dropped frames.
      const tick = (ts: number) => {
        if (done) return;
        if (startTs === null) startTs = ts;
        const t = Math.min(1, (ts - startTs) / MAX_SLIDE_MS);

        cols.forEach((el, i) => { el.scrollTop = targets[i] * t; });
        setProgress(t * 100);

        if (t >= 1) { advance(); return; }
        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    }, SETTLE_MS);
    timers.push(t);

    return () => {
      done = true;
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
    };
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
    const completionPercent = total > 0 ? Math.ceil((completed / total) * 100) : 0;
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
      // Order by the Excel phase priority (column M) so phase 1's tasks list before phase 2's,
      // etc. — priority order doesn't follow the sheet's row order, so this can't be skipped.
      const projectTasks = tasks
        .filter(t => t.project === projectName)
        .sort((a, b) => (a.phasePriority ?? Infinity) - (b.phasePriority ?? Infinity));
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === 'Complete').length;
      const inProgress = projectTasks.filter(t => t.status === 'In Progress').length;
      const notStarted = projectTasks.filter(t => t.status === 'Not Started').length;
      const delayed = projectTasks.filter(t => isTaskDelayed(t)).length;
      const completionPercent = total > 0 ? Math.ceil((completed / total) * 100) : 0;
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

      // Determine project health color dot: red if the project has any schedule variance, green otherwise
      const healthColor = projectVarianceDays !== 0 ? 'r' : 'g';

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
    }).sort((a, b) => {
      if (a.project !== b.project) return a.project.localeCompare(b.project);
      const pa = a.phasePriority ?? Infinity;
      const pb = b.phasePriority ?? Infinity;
      if (pa !== pb) return pa - pb;
      const da = a.fFinish ? new Date(a.fFinish).getTime() : NaN;
      const db = b.fFinish ? new Date(b.fFinish).getTime() : NaN;
      if (Number.isNaN(da) && Number.isNaN(db)) return 0;
      if (Number.isNaN(da)) return 1;
      if (Number.isNaN(db)) return -1;
      return da - db;
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-[#7fb893]/30 bg-[#7fb893]/10 text-[#7fb893] shadow-[0_0_8px_rgba(127,184,147,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7fb893] shadow-[0_0_6px_#7fb893]" />
          Complete
        </span>
      );
    }
    if (status === 'In Progress') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-[#d9a64e]/30 bg-[#d9a64e]/10 text-[#d9a64e] shadow-[0_0_8px_rgba(217,166,78,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d9a64e] shadow-[0_0_6px_#d9a64e]" />
          In Progress
        </span>
      );
    }
    if (isDelayed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-[#e0685f]/30 bg-[#e0685f]/10 text-[#e0685f] shadow-[0_0_8px_rgba(224,104,95,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e0685f] shadow-[0_0_6px_#e0685f] animate-pulse" />
          Delayed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-white/10 bg-white/5 text-[#8597a9]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#8597a9]/50" />
        Not Started
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1626] flex flex-col items-center justify-center text-[#f3eee3]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-t-2 border-[#cbb079] animate-spin" />
          <h2 className="text-lg font-bold tracking-widest uppercase text-[#f3eee3] animate-pulse">
            Connecting to Supabase...
          </h2>
          <p className="text-xs text-[#8597a9] tracking-wider uppercase">
            Loading Live Programme Data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-[#0a1626] text-[#f3eee3] relative overflow-hidden select-none">
      
      {/* Background Floating Pulsing Glow Orbs */}
      <div className="glow-orb glow-orb-teal"></div>
      <div className="glow-orb glow-orb-blue"></div>

      {/* ==========================================
          TOP BAR (BRAND HEADER & LIVE CLOCK)
          ========================================== */}
      <div className="topbar flex-none h-[9.2vh] min-h-[64px] flex items-center gap-[1.4vw] px-[2.2vw] border-b border-white/10 bg-gradient-to-b from-[#0d1c30] to-[#0a1626] relative z-40">
        <div className="brand flex items-center gap-[1.1vw]">
          {/* HAP Logo */}
          <div className="w-[45px] h-[45px] rounded-xl flex items-center justify-center p-0.5">
            <img src="/hap.png" alt="HAP Logo" className="w-full h-full object-contain" />
          </div>
          <div className="w-[1px] h-[30px] bg-white/10"></div>
          <div className="brand-text">
            <span className="text-[12px] sm:text-[14px] font-semibold text-[#cbb079] tracking-[.32em] uppercase block">
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
                ? 'border-[#cbb079] text-[#cbb079] bg-[#cbb079]/5 shadow-[0_0_10px_rgba(203,176,121,0.1)]'
                : 'border-white/10 text-[#8597a9] hover:text-[#f3eee3] hover:border-white/20'
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
                ? 'border-[#cbb079] text-[#cbb079] bg-[#cbb079]/5 shadow-[0_0_10px_rgba(203,176,121,0.1)]'
                : 'border-white/10 text-[#8597a9] hover:text-[#f3eee3] hover:border-white/20'
            }`}
          >
            Interactive Control Board
          </button>
        </div>

        <div className="flex-grow"></div>
        
        {/* Topbar Clock & Refresh information */}
        <div className="flex items-center gap-8 relative z-50">
          <div className="fresh text-right text-[11px] text-[#8597a9] font-sans leading-none hidden md:block">
            Last update: Today at <b className="text-[#cbb079] font-semibold">{refreshTime}</b>
          </div>
          
          <LiveClock />
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
                  <span className="tag text-[12px] tracking-[.26em] text-[#cbb079] font-semibold uppercase">Hassan Allam Properties</span>
                  <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-[#f3eee3] leading-none">Portfolio Programme Summary</h1>
                  <span className="pagebadge text-[11px] font-bold text-[#cbb079] bg-[#cbb079]/12 border border-[#cbb079]/38 px-[0.8vw] py-[0.3vh] rounded-full self-center">Portfolio Overview</span>
                </div>

                {/* Portfolio level KPIs */}
                <div className="kpis p">
                  <div className="kpi">
                    <div className="lab">Total Scope</div>
                    <div className="val text-[#f3eee3]">{portfolioStats.total}</div>
                    <div className="w-full h-5 mt-1 overflow-hidden opacity-50">
                      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="glow-teal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#cbb079" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#cbb079" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,25 T20,24 T40,24 T60,25 T80,24 T100,24" fill="none" stroke="#cbb079" strokeWidth="1.5" />
                        <path d="M0,25 T20,24 T40,24 T60,25 T80,24 T100,24 L100,30 L0,30 Z" fill="url(#glow-teal)" />
                      </svg>
                    </div>
                    <div className="foot mt-1">All active programme stages</div>
                  </div>

                  {/* Completed pie chart */}
                  <div className="donut">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                        <circle cx="50" cy="50" r="42" className="stroke-[#7fb893] progress-ring-circle" strokeWidth="6" fill="transparent"
                          strokeDasharray="263.89"
                          strokeDashoffset={263.89 - (263.89 * portfolioStats.completionPercent) / 100}
                          strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#f3eee3] font-mono">{portfolioStats.completionPercent}%</span>
                    </div>
                    <div className="meta">
                      <div className="lab text-[10px] tracking-[.16em] uppercase text-[#8597a9]">Completed</div>
                      <div className="big text-[22px] font-bold mt-[0.3vh] text-[#7fb893]">
                        {portfolioStats.completed} <small className="text-[12px] text-[#c4ceda] font-semibold font-sans">/ {portfolioStats.total}</small>
                      </div>
                    </div>
                  </div>

                  {/* In Progress pie chart */}
                  <div className="donut">
                    {(() => {
                      const pct = portfolioStats.total > 0 ? Math.ceil((portfolioStats.inProgress / portfolioStats.total) * 100) : 0;
                      return (
                        <>
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                              <circle cx="50" cy="50" r="42" className="stroke-[#d9a64e] progress-ring-circle" strokeWidth="6" fill="transparent"
                                strokeDasharray="263.89"
                                strokeDashoffset={263.89 - (263.89 * pct) / 100}
                                strokeLinecap="round" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#f3eee3] font-mono">{pct}%</span>
                          </div>
                          <div className="meta">
                            <div className="lab text-[10px] tracking-[.16em] uppercase text-[#8597a9]">In Progress</div>
                            <div className="big text-[22px] font-bold mt-[0.3vh] text-[#d9a64e]">
                              {portfolioStats.inProgress} <small className="text-[12px] text-[#c4ceda] font-semibold font-sans">/ {portfolioStats.total}</small>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Delayed pie chart */}
                  <div className="donut">
                    {(() => {
                      const pct = portfolioStats.total > 0 ? Math.ceil((portfolioStats.delayed / portfolioStats.total) * 100) : 0;
                      return (
                        <>
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                              <circle cx="50" cy="50" r="42" className="stroke-[#e0685f] progress-ring-circle" strokeWidth="6" fill="transparent"
                                strokeDasharray="263.89"
                                strokeDashoffset={263.89 - (263.89 * pct) / 100}
                                strokeLinecap="round" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#f3eee3] font-mono">{pct}%</span>
                          </div>
                          <div className="meta">
                            <div className="lab text-[10px] tracking-[.16em] uppercase text-[#8597a9]">Delayed</div>
                            <div className="big text-[22px] font-bold mt-[0.3vh] text-[#e0685f]">
                              {portfolioStats.delayed} <small className="text-[12px] text-[#c4ceda] font-semibold font-sans">/ {portfolioStats.total}</small>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Not Started pie chart */}
                  <div className="donut">
                    {(() => {
                      const pct = portfolioStats.total > 0 ? Math.ceil((portfolioStats.notStarted / portfolioStats.total) * 100) : 0;
                      return (
                        <>
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                              <circle cx="50" cy="50" r="42" className="stroke-[#8597a9] progress-ring-circle" strokeWidth="6" fill="transparent"
                                strokeDasharray="263.89"
                                strokeDashoffset={263.89 - (263.89 * pct) / 100}
                                strokeLinecap="round" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#f3eee3] font-mono">{pct}%</span>
                          </div>
                          <div className="meta">
                            <div className="lab text-[10px] tracking-[.16em] uppercase text-[#8597a9]">Not Started</div>
                            <div className="big text-[22px] font-bold mt-[0.3vh] text-[#8597a9]">
                              {portfolioStats.notStarted} <small className="text-[12px] text-[#c4ceda] font-semibold font-sans">/ {portfolioStats.total}</small>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Full Width Summary Layout */}
                <div className="flex-grow min-h-[30vh] overflow-hidden flex flex-col mt-2">
                  
                  {/* Left Side: Summary table of Phase progress */}
                  <div className="flex-grow flex flex-col sumtable">
                    <div className="bh font-bold text-[14px] text-[#f3eee3] flex items-center justify-between">
                      <span>Programme Breakdown by Project</span>
                      <span className="text-[11px] text-[#8597a9] font-mono font-normal">Active items tracked</span>
                    </div>
                    <div className="tablewrap flex-grow overflow-x-auto overflow-y-auto scrollable-y" data-slide-col={0}>
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
                            <tr key={idx} className="hover:bg-[#142740]/30 transition-colors">
                              <td style={{ textAlign: 'left' }}>
                                <div className="proj !justify-start text-left pl-2">
                                  <span className={`dot ${phase.healthColor === 'r' ? 'r' : phase.healthColor === 'a' ? 'a' : 'g'}`}></span>
                                  <span className="text-[#f3eee3] font-semibold">{phase.name}</span>
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center justify-center gap-3">
                                  <div className="bar flex-grow max-w-[150px]">
                                    <i style={{ width: `${phase.completionPercent}%` }}></i>
                                  </div>
                                  <span className="text-[11px] font-mono text-[#c4ceda]">{phase.completionPercent}%</span>
                                </div>
                              </td>
                              <td className="num font-mono text-center">{phase.total}</td>
                              <td className="num font-mono text-center text-[#7fb893]">{phase.completed}</td>
                              <td className="num font-mono text-center text-[#d9a64e]">{phase.inProgress}</td>
                              <td className="num font-mono text-center text-[#8597a9]">{phase.notStarted}</td>
                              <td className="num font-mono text-center text-[#e0685f]">{phase.delayed}</td>
                              <td className="num font-mono text-center text-[#c4ceda]">{phase.baselineEnd}</td>
                              <td className="num font-mono text-center text-[#c4ceda]">{phase.forecastEnd}</td>
                              <td className="num var text-center font-mono">
                                {phase.projectVarianceDays > 0 ? (
                                  <span className="late text-[#e0685f] font-semibold">+{phase.projectVarianceDays}d</span>
                                ) : phase.projectVarianceDays < 0 ? (
                                  <span className="early text-[#7fb893] font-semibold">{phase.projectVarianceDays}d</span>
                                ) : (
                                  <span className="early text-[#7fb893] font-semibold">On Time</span>
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

                // Split project tasks into Authorities/Permits vs the rest, for the two donut gauges
                const isAuthorityOrPermit = (scopeName: string) => /authorit|permit/i.test(scopeName);
                const authorityTasks = phase.tasks.filter(t => isAuthorityOrPermit(t.scope));
                const restTasks = phase.tasks.filter(t => !isAuthorityOrPermit(t.scope));
                const authorityCompleted = authorityTasks.filter(t => t.status === 'Complete').length;
                const restCompleted = restTasks.filter(t => t.status === 'Complete').length;
                const authorityPercent = authorityTasks.length > 0 ? Math.ceil((authorityCompleted / authorityTasks.length) * 100) : 0;
                const restPercent = restTasks.length > 0 ? Math.ceil((restCompleted / restTasks.length) * 100) : 0;

                return (
                  <div key={pIdx} className={`slide ${slideIndex === sIdx ? 'on' : ''}`}>
                    <div className="slide-head flex items-end gap-[1.2vw] mb-[1.4vh] flex-none">
                      <span className="tag text-[13px] tracking-[.26em] text-[#cbb079] font-semibold uppercase">Hassan Allam Properties</span>
                      <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-[#f3eee3] leading-none">{phase.name}</h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-hidden min-h-[30vh]">

                      {/* Column 1: Scope Progress List */}
                      <div className="flex flex-col sumtable p-4 h-full">
                        <div className="bh font-bold text-[15px] text-[#f3eee3] flex items-center justify-between pb-3 mb-3 border-b border-white/10 flex-none">
                          <span>Scope Progress Breakdown</span>
                          <span className="text-[11px] text-[#8597a9] uppercase font-bold tracking-widest font-sans">Domain Health</span>
                        </div>

                        {/* Authorities & Permits health card */}
                        <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 mb-3 flex-none">
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                className="stroke-[#cbb079] progress-ring-circle"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray="263.89"
                                strokeDashoffset={263.89 - (263.89 * authorityPercent) / 100}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-[#f3eee3] font-mono">{authorityPercent}%</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] text-[#cbb079] uppercase font-bold tracking-widest">Authorities &amp; Permits</div>
                            <div className="text-[17px] font-bold text-[#f3eee3]">{authorityCompleted} / {authorityTasks.length} Complete</div>
                          </div>
                        </div>

                        {/* Other Phases health card */}
                        <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 mb-4 flex-none">
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" className="stroke-white/10" strokeWidth="6" fill="transparent" />
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                className="stroke-[#cbb079] progress-ring-circle"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray="263.89"
                                strokeDashoffset={263.89 - (263.89 * restPercent) / 100}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-[#f3eee3] font-mono">{restPercent}%</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] text-[#8597a9] uppercase font-bold tracking-widest">Design Phases</div>
                            <div className="text-[17px] font-bold text-[#f3eee3]">{restCompleted} / {restTasks.length} Complete</div>
                            <div className="text-[11px] text-[#8597a9] mt-0.5">
                              {phase.projectVarianceDays !== 0 ? (
                                <span>Project variance: <b className={phase.projectVarianceDays > 0 ? 'text-[#e0685f]' : 'text-[#7fb893]'}>{phase.projectVarianceDays > 0 ? '+' : ''}{phase.projectVarianceDays}d</b></span>
                              ) : (
                                <span>Project on schedule</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* List of Scope progress bars, ordered by phase priority (see phaseStats sort) */}
                        <div className="space-y-4 flex-grow overflow-y-auto pr-1 scrollable-y" data-slide-col={sIdx}>
                          {scopesList.map((scope, key) => (
                            <div key={key} className="space-y-1.5">
                              <div className="flex justify-between items-center text-[12px]">
                                <span className="text-[#f3eee3] font-semibold">{scope.name}</span>
                                <span className="text-[#c4ceda] font-mono">{Math.ceil(scope.percent)}% <small className="text-[#8597a9]">({scope.completed}/{scope.total})</small></span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-[#0a1626] overflow-hidden flex border border-white/5 relative">
                                <div
                                  style={{ width: `${scope.percent}%` }}
                                  className="h-full bg-gradient-to-r from-[#8a7647] to-[#cbb079] relative"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 w-full h-full animate-[pulse_2s_infinite]" />
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-[#8597a9] font-mono mt-0.5">
                                <span>Baseline: <b className="text-[#c4ceda] font-normal">{scope.baselineEnd}</b></span>
                                <span>Forecast: <b className="text-[#c4ceda] font-normal">{scope.forecastEnd}</b></span>
                              </div>
                              {(() => {
                                const activeTask = phase.tasks.find(t => t.scope === scope.name && t.status === 'In Progress');
                                if (!activeTask) return null;
                                return (
                                  <div className="text-[11px] text-[#8597a9] mt-1 truncate pl-1 border-l-2 border-[#d9a64e]/60">
                                    Active: <span className="text-[#d9a64e] font-medium" title={activeTask.stage}>{activeTask.stage}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: Critical Upcoming Milestones */}
                      <div className="flex flex-col sumtable p-4 h-full">
                        <div className="bh font-bold text-[15px] text-[#f3eee3] flex items-center justify-between pb-3 mb-3 border-b border-white/10 flex-none">
                          <span>Critical Upcoming Milestones</span>
                          <span className="text-[11px] text-[#8597a9] uppercase font-bold tracking-widest font-sans">Next Steps</span>
                        </div>

                        <div
                          className="space-y-3.5 flex-grow overflow-y-auto pr-1 scrollable-y"
                          data-slide-col={sIdx}
                        >
                          {upcomingMilestones.map((t, idx) => {
                            const remainingDays = getRemainingDays(t.fFinish);
                            return (
                              <div key={idx} className="bg-white/5 border border-white/5 hover:border-white/10 transition-colors rounded-xl p-3 flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#cbb079] to-[#0d1c30] border border-white/10 flex items-center justify-center font-bold text-[#f3eee3] text-[11px] shrink-0 mt-0.5">
                                  {t.owner ? t.owner.split('/').map(w => w.trim().charAt(0)).join('') : '—'}
                                </div>
                                <div className="min-w-0 flex-grow text-left">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-[11px] font-bold text-[#8597a9] uppercase tracking-wider block">{t.scope}</span>
                                    <span className={`text-[11px] font-bold px-1.5 py-0.5 border rounded-md shrink-0 leading-none ${
                                      remainingDays === null ? 'border-white/10 bg-white/5 text-[#8597a9]' :
                                      remainingDays < 0 ? 'border-[#e0685f]/30 bg-[#e0685f]/10 text-[#e0685f]' :
                                      remainingDays === 0 ? 'border-[#d9a64e]/30 bg-[#d9a64e]/10 text-[#d9a64e]' :
                                      'border-[#cbb079]/30 bg-[#cbb079]/10 text-[#cbb079]'
                                    }`}>
                                      {remainingDays === null ? 'No Date' :
                                       remainingDays < 0 ? `Overdue by ${Math.abs(remainingDays)}d` :
                                       remainingDays === 0 ? 'Due Today' :
                                       `${remainingDays}d left`}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-[#f3eee3] block text-[14px] truncate mt-0.5" title={t.stage}>{t.stage}</span>
                                  <span className="text-[12px] font-mono text-[#c4ceda] block mt-0.5 flex items-center gap-1">
                                    <Calendar size={13} className="text-[#cbb079]" />
                                    Due: {t.fFinish || '—'}
                                  </span>
                                  <span className="text-[11px] text-[#8597a9] block mt-1">
                                    Owner: <b className="text-[#c4ceda] font-semibold">{t.owner || '—'}</b> | Consultant: <b className="text-[#c4ceda] font-semibold">{t.consultant || '—'}</b>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {upcomingMilestones.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center py-20 text-[#8597a9]">
                              <CheckCircle2 size={32} className="text-[#7fb893] mb-3 opacity-60" />
                              <span className="text-sm">No pending milestones in this phase.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Column 3: Blocker Alerts / Schedule Variance Log */}
                      <div className="flex flex-col sumtable p-4 h-full">
                        <div className="bh font-bold text-[15px] text-[#f3eee3] flex items-center justify-between pb-3 mb-3 border-b border-white/10 flex-none">
                          <span>Delayed Tasks</span>
                          <span className="text-[11px] text-[#e0685f] uppercase font-bold tracking-widest font-sans flex items-center gap-1">
                            <AlertTriangle size={12} className="animate-pulse" />
                            Variance
                          </span>
                        </div>

                        <div
                          className="space-y-3.5 flex-grow overflow-y-auto pr-1 scrollable-y"
                          data-slide-col={sIdx}
                        >
                          {delayedMilestones.map((t, idx) => {
                            const delay = getTaskVariance(t);
                            return (
                              <div key={idx} className="bg-[#e0685f]/5 border border-[#e0685f]/15 hover:border-[#e0685f]/25 transition-colors rounded-xl p-3 flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e0685f] to-[#0d1c30] border border-white/10 flex items-center justify-center font-bold text-[#f3eee3] text-[11px] shrink-0 mt-0.5">
                                  {t.owner ? t.owner.split('/').map(w => w.trim().charAt(0)).join('') : '—'}
                                </div>
                                <div className="min-w-0 flex-grow text-left">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-[11px] font-bold text-[#e0685f] uppercase tracking-wider block">{t.scope}</span>
                                    <span className="text-[11px] font-bold text-[#e0685f] px-1.5 py-0.5 border border-[#e0685f]/30 bg-[#e0685f]/10 rounded-md shrink-0 font-mono leading-none">
                                      {delay > 0 ? `+${delay}d` : `${delay}d`} delay
                                    </span>
                                  </div>
                                  <span className="font-semibold text-[#f3eee3] block text-[14px] truncate mt-0.5" title={t.stage}>{t.stage}</span>
                                  <span className="text-[12px] font-mono text-[#c4ceda] block mt-0.5 flex items-center gap-1.5">
                                    <Calendar size={13} className="text-[#e0685f]" />
                                    Planned: <b className="text-[#f3eee3] font-normal">{t.bFinish || '—'}</b> → Forecast: <b className="text-[#f3eee3] font-normal">{t.fFinish || '—'}</b>
                                  </span>
                                  <span className="text-[11px] text-[#8597a9] block mt-1">
                                    Owner: <b className="text-[#c4ceda] font-semibold">{t.owner || '—'}</b> | Consultant: <b className="text-[#c4ceda] font-semibold">{t.consultant || '—'}</b>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {delayedMilestones.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center py-20 text-[#8597a9] h-full">
                              <CheckCircle2 size={32} className="text-[#7fb893] mb-3 opacity-60 animate-bounce" />
                              <span className="text-sm text-[#7fb893] font-bold">On Schedule</span>
                              <span className="text-[11px] text-[#8597a9] mt-1">All milestones in this phase are tracking to target.</span>
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
            <div className="flex-none p-4 rounded bg-gradient-to-b from-[#101f33] to-[#142740] border border-[#d5c4a1]/[.14] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative min-w-[240px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8597a9]" />
                  <input
                    type="text"
                    placeholder="Search stage owner, consultant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 w-full text-xs rounded border border-white/10 bg-[#0a1626] text-[#f3eee3] focus:outline-none focus:border-[#cbb079] transition-colors"
                  />
                </div>

                {/* Project Filter */}
                <div className="flex items-center gap-1.5 border border-white/10 bg-[#0a1626] rounded px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest font-sans">
                  <Filter size={11} className="text-[#cbb079]" />
                  <select
                    value={selectedPhase}
                    onChange={(e) => handlePhaseFilterChange(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#c4ceda] text-[10px]"
                  >
                    <option value="All" className="text-[#f3eee3] bg-[#101f33]">All Projects</option>
                    {projectsList.map((p, idx) => (
                      <option key={idx} value={p} className="text-[#f3eee3] bg-[#101f33]">{p}</option>
                    ))}
                  </select>
                </div>

                {/* Scope Filter */}
                <div className="flex items-center gap-1.5 border border-white/10 bg-[#0a1626] rounded px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest font-sans">
                  <Filter size={11} className="text-[#cbb079]" />
                  <select
                    value={selectedScope}
                    onChange={(e) => setSelectedScope(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#c4ceda] text-[10px]"
                  >
                    <option value="All" className="text-[#f3eee3] bg-[#101f33]">All Parents</option>
                    {allScopes.map((s, idx) => (
                      <option key={idx} value={s} className="text-[#f3eee3] bg-[#101f33]">{s}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 border border-white/10 bg-[#0a1626] rounded px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest font-sans">
                  <Filter size={11} className="text-[#cbb079]" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#c4ceda] text-[10px]"
                  >
                    <option value="All" className="text-[#f3eee3] bg-[#101f33]">All Statuses</option>
                    <option value="In Progress" className="text-[#f3eee3] bg-[#101f33]">In Progress</option>
                    <option value="Not Started" className="text-[#f3eee3] bg-[#101f33]">Not Started</option>
                    <option value="Delayed" className="text-[#f3eee3] bg-[#101f33]">Delayed Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-[11px] text-[#8597a9] hidden sm:block">
                  Filtered: <b className="text-[#f3eee3]">{filteredTasks.length}</b> / {tasks.length} tasks
                </div>
                
              </div>
            </div>

            {/* MAIN WORKSPACE GRID */}
            <div className="flex-grow flex flex-col overflow-hidden min-h-0 h-full">
                {/* Task table — full width */}
                <div className="flex flex-col bg-gradient-to-b from-[#101f33] to-[rgba(16,31,51,0.6)] border border-[#d5c4a1]/[.14] rounded overflow-hidden h-full min-h-0">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between flex-none">
                    <h3 className="font-serif-lux text-[15px] font-semibold tracking-wide text-[#f3eee3] flex items-center gap-2">
                      <ListTodo size={14} className="text-[#cbb079]" />
                      Interactive Work Streams
                    </h3>
                    <span className="text-[10px] text-[#8597a9]">Showing active & in-progress tasks only</span>
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
                              className={`hover:bg-[#142740]/50 transition-colors cursor-pointer ${isSelected ? 'bg-[#142740]' : ''} ${isDelayed ? 'od' : ''}`}
                            >
                              <td className="stage font-medium text-[#f3eee3]">
                                {t.stage}
                                <span className="ph block text-[9px] text-[#8597a9] mt-0.5">{t.phase}</span>
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
                            <td colSpan={9} className="text-center py-20 text-[#8597a9]">
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
      <div className="footer flex-none h-[5.6vh] min-h-[42px] flex items-center gap-[1.2vw] px-[2.2vw] border-t border-white/10 bg-[#0d1c30] relative z-40">
        
        {/* Navigation arrow / play-pause cycle buttons */}
        <div className="ctrl flex items-center gap-[0.5vw]">
          <button 
            id="prev" 
            onClick={handlePrev}
            className="w-[3.2vh] h-[3.2vh] min-w-[26px] min-h-[26px] rounded-lg grid place-items-center text-[#c4ceda] bg-white/5 hover:bg-white/10 hover:text-[#f3eee3] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Previous (←)"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button 
            id="play" 
            onClick={handlePlayPause}
            className="w-[3.2vh] h-[3.2vh] min-w-[26px] min-h-[26px] rounded-lg grid place-items-center text-[#c4ceda] bg-white/5 hover:bg-white/10 hover:text-[#f3eee3] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Pause/Play (space)"
            aria-label="Pause or play"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          
          <button 
            id="next" 
            onClick={handleNext}
            className="w-[3.2vh] h-[3.2vh] min-w-[26px] min-h-[26px] rounded-lg grid place-items-center text-[#c4ceda] bg-white/5 hover:bg-white/10 hover:text-[#f3eee3] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Next (→)"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Dynamic slide name status display */}
        <div className="pgname text-[11px] text-[#8597a9] tracking-[0.04em] min-w-[12vw] ml-3">
          Slide Name: <b className="text-[#c4ceda] font-semibold">
            {slideIndex === 0 ? "Portfolio Overview" : projectsList[slideIndex - 1]}
          </b>
        </div>
        
        {/* Progress Fill bar indicating rotation time remaining */}
        <div className="cycle flex-grow h-[4px] rounded-full bg-white/10 overflow-hidden relative">
          <i
            id="cyclebar"
            ref={progressBarRef}
            className="block h-full bg-[#cbb079] rounded-full"
            style={{ width: '0%' }}
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
                  ? 'bg-[#cbb079] scale-125' 
                  : 'bg-white/20 hover:bg-white/50 disabled:pointer-events-none'
              }`}
              title={`Slide ${idx + 1}`}
              aria-label={`Slide ${idx + 1}`}
            ></button>
          ))}
        </div>

      </div>
      
    </div>
  );
}
