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
  LayoutGrid,
  List
} from 'lucide-react';
import rawData from './projects-data.json';

// Define data interfaces
interface TaskData {
  phase: string;
  scope: string;
  stage: string;
  owner: string | null;
  consultant: string | null;
  bFinish: string | null;
  fFinish: string | null;
  status: string;
}

const tasks: TaskData[] = rawData.PC;

// Helper to compute delay in days
const getDelayDays = (bFinish: string | null, fFinish: string | null): number => {
  if (!bFinish || !fFinish) return 0;
  const b = new Date(bFinish);
  const f = new Date(fFinish);
  if (isNaN(b.getTime()) || isNaN(f.getTime())) return 0;
  const diff = f.getTime() - b.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

// Phases in presentation order
const PHASES = [
  "Phase 1A (Terraces)",
  "Phase 2A/2B (Great Lawn)",
  "Phase 1B/2C (Villas)"
];

const CYCLE_DURATION_MS = 12000; // 12 seconds per slide
const CYCLE_INTERVAL_MS = 100;   // Update progress bar every 100ms

export default function ControlBoardDashboard() {
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
  const [interactiveViewMode, setInteractiveViewMode] = useState<'list' | 'board'>('list');

  // Bidirectional synchronization between slideshow slideIndex and selectedPhase filter
  useEffect(() => {
    if (slideIndex === 0) {
      setSelectedPhase('All');
    } else {
      const phaseName = PHASES[slideIndex - 1];
      if (phaseName) {
        setSelectedPhase(phaseName);
      }
    }
  }, [slideIndex]);

  const handlePhaseFilterChange = (phaseName: string) => {
    setSelectedPhase(phaseName);
    if (phaseName === 'All') {
      setSlideIndex(0);
    } else {
      const idx = PHASES.indexOf(phaseName);
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
    setSlideIndex(prev => (prev + 1) % 4);
    setProgress(0);
  }, []);

  const handlePrev = useCallback(() => {
    setSlideIndex(prev => (prev - 1 + 4) % 4);
    setProgress(0);
  }, []);

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
          setSlideIndex(curr => (curr + 1) % 4);
          return 0;
        }
        return prev + step;
      });
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPlaying, slideIndex]);

  // Unique scopes in the dataset
  const allScopes = useMemo(() => {
    const scopes = new Set<string>();
    tasks.forEach(t => scopes.add(t.scope));
    return Array.from(scopes);
  }, []);

  // Portfolio level stats computed dynamically
  const portfolioStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Complete').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const notStarted = tasks.filter(t => t.status === 'Not Started').length;
    const delayed = tasks.filter(t => t.status !== 'Complete' && getDelayDays(t.bFinish, t.fFinish) > 0).length;
    const completionPercent = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
    const totalDelayDays = tasks.reduce((sum, t) => sum + getDelayDays(t.bFinish, t.fFinish), 0);

    return {
      total,
      completed,
      inProgress,
      notStarted,
      delayed,
      completionPercent,
      totalDelayDays
    };
  }, []);

  // Phase level stats computed dynamically
  const phaseStats = useMemo(() => {
    return PHASES.map(phaseName => {
      const phaseTasks = tasks.filter(t => t.phase === phaseName);
      const total = phaseTasks.length;
      const completed = phaseTasks.filter(t => t.status === 'Complete').length;
      const inProgress = phaseTasks.filter(t => t.status === 'In Progress').length;
      const notStarted = phaseTasks.filter(t => t.status === 'Not Started').length;
      const delayed = phaseTasks.filter(t => t.status !== 'Complete' && getDelayDays(t.bFinish, t.fFinish) > 0).length;
      const completionPercent = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
      const totalDelayDays = phaseTasks.reduce((sum, t) => sum + getDelayDays(t.bFinish, t.fFinish), 0);

      // Determine phase health color dot
      let healthColor = 'g';
      if (delayed >= 5) {
        healthColor = 'r';
      } else if (delayed > 0) {
        healthColor = 'a';
      }

      return {
        name: phaseName,
        total,
        completed,
        inProgress,
        notStarted,
        delayed,
        completionPercent,
        totalDelayDays,
        healthColor,
        tasks: phaseTasks
      };
    });
  }, []);

  // Scope distribution statistics for Portfolio overview stacked bar chart
  const scopeBreakdown = useMemo(() => {
    return allScopes.map(scopeName => {
      const scopeTasks = tasks.filter(t => t.scope === scopeName);
      const total = scopeTasks.length;
      const completed = scopeTasks.filter(t => t.status === 'Complete').length;
      const delayed = scopeTasks.filter(t => t.status !== 'Complete' && getDelayDays(t.bFinish, t.fFinish) > 0).length;
      const inProgress = scopeTasks.filter(t => t.status === 'In Progress' && getDelayDays(t.bFinish, t.fFinish) <= 0).length;
      const notStarted = scopeTasks.filter(t => t.status === 'Not Started' && getDelayDays(t.bFinish, t.fFinish) <= 0).length;

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
  }, [allScopes]);

  // Phase Specific Scope Progress breakdown (circular gauges)
  const phaseScopes = useMemo(() => {
    return phaseStats.map(phase => {
      const scopesMap: Record<string, { total: number; completed: number }> = {};
      phase.tasks.forEach(t => {
        if (!scopesMap[t.scope]) {
          scopesMap[t.scope] = { total: 0, completed: 0 };
        }
        scopesMap[t.scope].total++;
        if (t.status === 'Complete') {
          scopesMap[t.scope].completed++;
        }
      });
      
      return Object.keys(scopesMap).map(scopeName => {
        const { total, completed } = scopesMap[scopeName];
        return {
          name: scopeName,
          total,
          completed,
          percent: total > 0 ? (completed / total) * 100 : 0
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
      
      const matchesPhase = selectedPhase === 'All' || t.phase === selectedPhase;
      const matchesScope = selectedScope === 'All' || t.scope === selectedScope;
      
      let matchesStatus = true;
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Delayed') {
          matchesStatus = t.status !== 'Complete' && getDelayDays(t.bFinish, t.fFinish) > 0;
        } else {
          matchesStatus = t.status === selectedStatus;
        }
      }

      return matchesSearch && matchesPhase && matchesScope && matchesStatus;
    });
  }, [searchQuery, selectedPhase, selectedScope, selectedStatus]);

  // Selected task in Drill-Down mode
  const selectedTask = useMemo(() => {
    if (selectedTaskId) {
      const found = tasks.find(t => `${t.phase}-${t.scope}-${t.stage}` === selectedTaskId);
      if (found) return found;
    }
    return filteredTasks[0] || null;
  }, [selectedTaskId, filteredTasks]);

  // Split filteredTasks into status groups for Kanban Board presentation view
  const boardColumns = useMemo(() => {
    const completeTasks: TaskData[] = [];
    const activeTasks: TaskData[] = [];
    const delayedTasks: TaskData[] = [];
    const pendingTasks: TaskData[] = [];

    filteredTasks.forEach(t => {
      const delay = getDelayDays(t.bFinish, t.fFinish);
      if (t.status === 'Complete') {
        completeTasks.push(t);
      } else if (delay > 0) {
        delayedTasks.push(t);
      } else if (t.status === 'In Progress') {
        activeTasks.push(t);
      } else {
        pendingTasks.push(t);
      }
    });

    return [
      { id: 'delayed', title: 'Delayed / Blocked', color: '#ff5a5f', border: 'rgba(255,90,95,0.25)', tasks: delayedTasks },
      { id: 'active', title: 'Active / In Progress', color: '#f1a73a', border: 'rgba(241,167,58,0.25)', tasks: activeTasks },
      { id: 'complete', title: 'Completed Milestones', color: '#46c08a', border: 'rgba(70,192,138,0.25)', tasks: completeTasks },
      { id: 'pending', title: 'Not Started / Pending', color: '#7e95ab', border: 'rgba(255,255,255,0.1)', tasks: pendingTasks }
    ];
  }, [filteredTasks]);

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
    if (isDelayed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-[#ff5a5f]/30 bg-[#ff5a5f]/10 text-[#ff5a5f] shadow-[0_0_8px_rgba(255,90,95,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5f] shadow-[0_0_6px_#ff5a5f] animate-pulse" />
          Delayed
        </span>
      );
    }
    if (status === 'In Progress') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-[#f1a73a]/30 bg-[#f1a73a]/10 text-[#f1a73a] shadow-[0_0_8px_rgba(241,167,58,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f1a73a] shadow-[0_0_6px_#f1a73a]" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase border border-white/10 bg-white/5 text-[#7e95ab]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7e95ab]/50" />
        Pending
      </span>
    );
  };

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
          {/* Custom Luxury Gold Lion Icon Logo */}
          <div className="w-[45px] h-[45px] rounded-xl bg-gradient-to-br from-[#16314f] to-[#0e2438] border border-white/15 flex items-center justify-center shadow-lg">
            <svg className="w-[28px] h-[28px] text-[#34c6a6]" viewBox="0 0 512 512" fill="currentColor">
              <path d="M256,16L220,96h72L256,16z"/>
              <path d="M220,96L140,140l50,60L220,96z"/>
              <path d="M292,96l80,44l-50,60L292,96z"/>
              <path d="M140,140L40,240l80,40L140,140z"/>
              <path d="M372,140l100,100l-80,40L372,140z"/>
              <path d="M190,200l-50-60L60,260l130-60z"/>
              <path d="M322,200l50-60l80,120l-130-60z"/>
              <path d="M256,280l-66-80H140l76,140L256,280z"/>
              <path d="M256,280l66-80h50l-76,140L256,280z"/>
              <path d="M216,340l-76-140H60l110,180L216,340z"/>
              <path d="M296,340l76-140h80l-110,180L296,340z"/>
              <path d="M256,280L216,340h80L256,280z"/>
              <path d="M216,340l40,120l40-120H216z"/>
            </svg>
          </div>
          <div className="w-[1px] h-[30px] bg-white/10"></div>
          <div className="brand-text">
            <span className="text-[12px] sm:text-[14px] font-semibold text-[#34c6a6] tracking-[.32em] uppercase block">
              East Projects
            </span>
            <b className="text-[10px] text-[#aebfd1] font-normal tracking-[.18em] uppercase block mt-[2px]">
              Design Programme Control Board
            </b>
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
                  <div className="donut glass-panel">
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
                          strokeDashoffset={263.89 - (263.89 * portfolioStats.completionPercent) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-white font-mono">{portfolioStats.completionPercent}%</span>
                    </div>
                    <div className="meta">
                      <div className="lab text-[10px] tracking-[.16em] uppercase text-[#7e95ab]">Overall Completion</div>
                      <div className="big text-[22px] font-bold mt-[0.3vh] text-white font-serif-lux">
                        {portfolioStats.completed} / {portfolioStats.total} <small className="text-[12px] text-[#aebfd1] font-semibold font-sans">Tasks</small>
                      </div>
                    </div>
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

                  <div className="kpi ok">
                    <div className="lab">Completed</div>
                    <div className="val text-[#46c08a] font-serif-lux">{portfolioStats.completed}</div>
                    <div className="w-full h-5 mt-1 overflow-hidden opacity-50">
                      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="glow-green" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#46c08a" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#46c08a" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,25 Q20,22 40,18 T80,10 T100,5" fill="none" stroke="#46c08a" strokeWidth="1.5" />
                        <path d="M0,25 Q20,22 40,18 T80,10 T100,5 L100,30 L0,30 Z" fill="url(#glow-green)" />
                      </svg>
                    </div>
                    <div className="foot mt-1">Tasks executed successfully</div>
                  </div>

                  <div className="kpi">
                    <div className="lab">In Progress</div>
                    <div className="val text-[#f1a73a] font-serif-lux">{portfolioStats.inProgress}</div>
                    <div className="w-full h-5 mt-1 overflow-hidden opacity-50">
                      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="glow-amber" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f1a73a" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#f1a73a" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,20 Q15,10 30,22 T60,12 T90,18 T100,10" fill="none" stroke="#f1a73a" strokeWidth="1.5" />
                        <path d="M0,20 Q15,10 30,22 T60,12 T90,18 T100,10 L100,30 L0,30 Z" fill="url(#glow-amber)" />
                      </svg>
                    </div>
                    <div className="foot mt-1">Currently active design stages</div>
                  </div>

                  <div className="kpi alarm">
                    <div className="lab">Delayed Tasks</div>
                    <div className="val text-[#ff5a5f] font-serif-lux">{portfolioStats.delayed}</div>
                    <div className="w-full h-5 mt-1 overflow-hidden opacity-50">
                      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="glow-red-delayed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff5a5f" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#ff5a5f" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,25 Q20,20 40,24 T80,10 T100,2" fill="none" stroke="#ff5a5f" strokeWidth="1.5" />
                        <path d="M0,25 Q20,20 40,24 T80,10 T100,2 L100,30 L0,30 Z" fill="url(#glow-red-delayed)" />
                      </svg>
                    </div>
                    <div className="foot mt-1">Tasks behind baseline timeline</div>
                  </div>

                  <div className="kpi alarm">
                    <div className="lab">Variance Delays</div>
                    <div className="val text-[#ff5a5f] font-serif-lux">+{portfolioStats.totalDelayDays}d</div>
                    <div className="w-full h-5 mt-1 overflow-hidden opacity-50">
                      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="glow-red" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff5a5f" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#ff5a5f" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,15 T30,17 T60,15 T80,8 T100,25" fill="none" stroke="#ff5a5f" strokeWidth="1.5" />
                        <path d="M0,15 T30,17 T60,15 T80,8 T100,25 L100,30 L0,30 Z" fill="url(#glow-red)" />
                      </svg>
                    </div>
                    <div className="foot mt-1">Total schedule delay variance</div>
                  </div>
                </div>

                {/* Split Summary Layout: Left Table (3/5), Right Scope distribution stacked bar graph (2/5) */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-grow min-h-[30vh] overflow-hidden">
                  
                  {/* Left Side: Summary table of Phase progress */}
                  <div className="lg:col-span-3 flex flex-col sumtable">
                    <div className="bh font-bold text-[14px] text-white flex items-center justify-between">
                      <span>Programme Breakdown by Phase</span>
                      <span className="text-[11px] text-[#7e95ab] font-mono font-normal">Active items tracked</span>
                    </div>
                    <div className="tablewrap flex-grow">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'center' }}>Project Phase</th>
                            <th style={{ textAlign: 'center' }}>Scope Completion</th>
                            <th style={{ textAlign: 'center' }}>Total Scope</th>
                            <th style={{ textAlign: 'center' }}>Completed</th>
                            <th style={{ textAlign: 'center' }}>Delayed</th>
                            <th style={{ textAlign: 'center' }}>Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {phaseStats.map((phase, idx) => (
                            <tr key={idx} className="hover:bg-[#16314f]/30 transition-colors">
                              <td>
                                <div className="proj">
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
                              <td className="num font-mono">{phase.total}</td>
                              <td className="num font-mono text-[#46c08a]">{phase.completed}</td>
                              <td className="num font-mono text-[#ff5a5f]">{phase.delayed}</td>
                              <td className="num var text-center font-mono">
                                {phase.totalDelayDays > 0 ? (
                                  <span className="late text-[#ff5a5f] font-semibold">+{phase.totalDelayDays}d</span>
                                ) : (
                                  <span className="early text-[#46c08a] font-semibold">On Time</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          
                          {/* Total Portfolio row */}
                          <tr className="portfolio-row">
                            <td>
                              <div className="proj">
                                <span className="dot g"></span>
                                <span className="text-white font-bold">TOTAL PORTFOLIO</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center justify-center gap-3">
                                <div className="bar flex-grow max-w-[150px]">
                                  <i style={{ width: `${portfolioStats.completionPercent}%` }}></i>
                                </div>
                                <span className="text-[12px] font-bold font-mono text-white">{portfolioStats.completionPercent}%</span>
                              </div>
                            </td>
                            <td className="num font-bold font-mono">{portfolioStats.total}</td>
                            <td className="num font-bold font-mono text-[#46c08a]">{portfolioStats.completed}</td>
                            <td className="num font-bold font-mono text-[#ff5a5f]">{portfolioStats.delayed}</td>
                            <td className="num var text-center font-mono font-bold">
                              {portfolioStats.totalDelayDays > 0 ? (
                                <span className="late text-[#ff5a5f]">+{portfolioStats.totalDelayDays}d</span>
                              ) : (
                                <span className="early text-[#46c08a]">On Time</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Side: Stacked bar chart representing tasks breakdown by Scope */}
                  <div className="lg:col-span-2 flex flex-col sumtable p-5">
                    <div className="bh font-bold text-[14px] text-white flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                      <span>Scope Distribution Chart</span>
                      <span className="text-[10px] text-[#7e95ab] uppercase font-bold tracking-widest font-sans">Progress by Domain</span>
                    </div>
                    <div className="space-y-4 flex-grow overflow-y-auto pr-1 scrollable-y">
                      {scopeBreakdown.map((scope, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-white font-semibold">
                              {scope.name}
                              {scope.delayed > 0 && (
                                <span className="text-[#ff5a5f] ml-2 text-[10px] font-bold">({scope.delayed} delayed)</span>
                              )}
                            </span>
                            <span className="text-[#aebfd1] font-mono">{scope.completed} / {scope.total} <small className="text-[#7e95ab] font-sans">Done</small></span>
                          </div>
                          {/* Stacked bar */}
                          <div className="w-full h-3 rounded-full bg-[#0b1d2e] overflow-hidden flex border border-white/5 relative">
                            {scope.completedPercent > 0 && (
                              <div 
                                style={{ width: `${scope.completedPercent}%` }} 
                                className="h-full bg-gradient-to-r from-[#1f7a5e] to-[#34c6a6] transition-all duration-500 relative" 
                                title={`Complete: ${scope.completed}`}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 w-full h-full animate-[pulse_2s_infinite]" />
                              </div>
                            )}
                            {scope.delayedPercent > 0 && (
                              <div 
                                style={{ width: `${scope.delayedPercent}%` }} 
                                className="h-full bg-[#ff5a5f] transition-all duration-500 relative" 
                                title={`Delayed: ${scope.delayed}`}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 w-full h-full animate-[pulse_2s_infinite]" />
                              </div>
                            )}
                            {scope.inProgressPercent > 0 && (
                              <div 
                                style={{ width: `${scope.inProgressPercent}%` }} 
                                className="h-full bg-[#f1a73a] transition-all duration-500" 
                                title={`In Progress: ${scope.inProgress}`}
                              />
                            )}
                            {scope.notStartedPercent > 0 && (
                              <div 
                                style={{ width: `${scope.notStartedPercent}%` }} 
                                className="h-full bg-white/5 transition-all duration-500" 
                                title={`Not Started: ${scope.notStarted}`}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* SLIDES 1-3: PROJECT DETAILS FOR THE 3 PHASES */}
              {phaseStats.map((phase, pIdx) => {
                const sIdx = pIdx + 1;
                const scopesList = phaseScopes[pIdx] || [];
                
                // Calculate critical upcoming milestones (top 5 sorted chronologically)
                const upcomingMilestones = phase.tasks
                  .filter(t => t.status !== 'Complete' && t.fFinish)
                  .sort((a, b) => {
                    const da = new Date(a.fFinish!).getTime();
                    const db = new Date(b.fFinish!).getTime();
                    return da - db;
                  })
                  .slice(0, 5);

                // Calculate active delay log blockers
                const delayedMilestones = phase.tasks
                  .filter(t => t.status !== 'Complete' && getDelayDays(t.bFinish, t.fFinish) > 0)
                  .sort((a, b) => {
                    const delayA = getDelayDays(a.bFinish, a.fFinish);
                    const delayB = getDelayDays(b.bFinish, b.fFinish);
                    return delayB - delayA;
                  });

                return (
                  <div key={pIdx} className={`slide ${slideIndex === sIdx ? 'on' : ''}`}>
                    <div className="slide-head flex items-end gap-[1.2vw] mb-[1.4vh] flex-none">
                      <span className="tag text-[12px] tracking-[.26em] text-[#34c6a6] font-semibold uppercase">Hassan Allam Properties</span>
                      <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-white leading-none">{phase.name}</h1>
                      <span className="pagebadge text-[11px] font-bold text-[#34c6a6] bg-[#34c6a6]/12 border border-[#34c6a6]/38 px-[0.8vw] py-[0.3vh] rounded-full self-center">Phase Control Board</span>
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
                              {phase.delayed > 0 ? (
                                <span>Accumulated delay: <b className="text-[#ff5a5f]">+{phase.totalDelayDays}d</b> ({phase.delayed} tasks)</span>
                              ) : (
                                <span>All active milestones on track</span>
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
                          {upcomingMilestones.map((t, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 hover:border-white/10 transition-colors rounded-xl p-3 flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34c6a6] to-[#0e2438] border border-white/10 flex items-center justify-center font-bold text-white text-[9px] shrink-0 mt-0.5">
                                {t.owner ? t.owner.split('/').map(w => w.trim().charAt(0)).join('') : '—'}
                              </div>
                              <div className="min-w-0 flex-grow text-left">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-bold text-[#7e95ab] uppercase tracking-wider block">{t.scope}</span>
                                  <span className="text-[9px] font-bold text-[#34c6a6] px-1.5 py-0.5 border border-[#34c6a6]/30 bg-[#34c6a6]/10 rounded-md shrink-0 leading-none">
                                    Active
                                  </span>
                                </div>
                                <span className="font-semibold text-white block text-[11px] truncate mt-0.5" title={t.stage}>{t.stage}</span>
                                <span className="text-[10px] font-mono text-[#aebfd1] block mt-0.5 flex items-center gap-1">
                                  <Calendar size={11} className="text-[#34c6a6]" />
                                  Due: {t.fFinish || '—'}
                                </span>
                                <span className="text-[9px] text-[#7e95ab] block mt-1">
                                  Owner: <b className="text-[#aebfd1] font-semibold">{t.owner || '—'}</b> | Agent: <b className="text-[#aebfd1] font-semibold">{t.consultant || '—'}</b>
                                </span>
                              </div>
                            </div>
                          ))}
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
                          <span>Blocker & Delay Alerts</span>
                          <span className="text-[10px] text-[#ff5a5f] uppercase font-bold tracking-widest font-sans flex items-center gap-1">
                            <AlertTriangle size={11} className="animate-pulse" />
                            Variance
                          </span>
                        </div>
                        
                        <div className="space-y-3.5 flex-grow overflow-y-auto pr-1 scrollable-y">
                          {delayedMilestones.map((t, idx) => {
                            const delay = getDelayDays(t.bFinish, t.fFinish);
                            return (
                              <div key={idx} className="bg-[#ff5a5f]/5 border border-[#ff5a5f]/15 hover:border-[#ff5a5f]/25 transition-colors rounded-xl p-3 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff5a5f] to-[#0e2438] border border-white/10 flex items-center justify-center font-bold text-white text-[9px] shrink-0 mt-0.5">
                                  {t.owner ? t.owner.split('/').map(w => w.trim().charAt(0)).join('') : '—'}
                                </div>
                                <div className="min-w-0 flex-grow text-left">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-[9px] font-bold text-[#ff5a5f] uppercase tracking-wider block">{t.scope}</span>
                                    <span className="text-[9px] font-bold text-[#ff5a5f] px-1.5 py-0.5 border border-[#ff5a5f]/30 bg-[#ff5a5f]/10 rounded-md shrink-0 font-mono leading-none">
                                      +{delay}d delay
                                    </span>
                                  </div>
                                  <span className="font-semibold text-white block text-[11px] truncate mt-0.5" title={t.stage}>{t.stage}</span>
                                  <span className="text-[10px] font-mono text-[#aebfd1] block mt-0.5 flex items-center gap-1.5">
                                    <Calendar size={11} className="text-[#ff5a5f]" />
                                    Planned: <b className="text-white font-normal">{t.bFinish || '—'}</b> → Forecast: <b className="text-white font-normal">{t.fFinish || '—'}</b>
                                  </span>
                                  <span className="text-[9px] text-[#7e95ab] block mt-1">
                                    Owner: <b className="text-[#aebfd1] font-semibold">{t.owner || '—'}</b> | Agent: <b className="text-[#aebfd1] font-semibold">{t.consultant || '—'}</b>
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
                
                {/* Phase Filter */}
                <div className="flex items-center gap-1.5 border border-white/10 bg-[#0b1d2e] rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest font-sans">
                  <Filter size={11} className="text-[#34c6a6]" />
                  <select 
                    value={selectedPhase}
                    onChange={(e) => handlePhaseFilterChange(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#aebfd1] text-[10px]"
                  >
                    <option value="All" className="text-slate-800 bg-white">All Phases</option>
                    {PHASES.map((p, idx) => (
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
                    <option value="All" className="text-slate-800 bg-white">All Scopes</option>
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
                    <option value="Complete" className="text-slate-800 bg-white">Complete</option>
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
                
                {/* View switcher */}
                <div className="flex items-center bg-[#0b1d2e] border border-white/10 rounded-lg p-0.5">
                  <button
                    onClick={() => setInteractiveViewMode('list')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider font-sans transition-all ${
                      interactiveViewMode === 'list' 
                        ? 'bg-[#34c6a6] text-[#0b1d2e] shadow-md' 
                        : 'text-[#aebfd1] hover:text-white'
                    }`}
                    title="List Workspace View"
                  >
                    <List size={11} />
                    List View
                  </button>
                  <button
                    onClick={() => setInteractiveViewMode('board')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider font-sans transition-all ${
                      interactiveViewMode === 'board' 
                        ? 'bg-[#34c6a6] text-[#0b1d2e] shadow-md' 
                        : 'text-[#aebfd1] hover:text-white'
                    }`}
                    title="Board Presentation View"
                  >
                    <LayoutGrid size={11} />
                    Board View
                  </button>
                </div>
              </div>
            </div>

            {/* MAIN WORKSPACE GRID */}
            {interactiveViewMode === 'list' ? (
              <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch overflow-hidden min-h-0 h-full">
                {/* Task table list (Left Side) */}
                <div className="lg:col-span-2 flex flex-col bg-[#13293e] border border-white/10 rounded-2xl shadow-xl overflow-hidden h-full min-h-0">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between flex-none">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <ListTodo size={14} className="text-[#34c6a6]" />
                      Interactive Work Streams
                    </h3>
                    <span className="text-[10px] text-[#7e95ab]">Click a row to load visual detail card</span>
                  </div>
                  
                  <div className="tablewrap flex-grow overflow-y-auto min-h-0">
                    <table className="text-xs">
                      <thead className="text-[9px]">
                        <tr>
                          <th className="idx">#</th>
                          <th>Stage / Milestone</th>
                          <th>Scope</th>
                          <th>Owner</th>
                          <th>Consultant</th>
                          <th>Baseline</th>
                          <th>Forecast</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center' }}>Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredTasks.map((t, idx) => {
                          const delay = getDelayDays(t.bFinish, t.fFinish);
                          const isDelayed = delay > 0 && t.status !== 'Complete';
                          const taskKey = `${t.phase}-${t.scope}-${t.stage}`;
                          const isSelected = selectedTask && `${selectedTask.phase}-${selectedTask.scope}-${selectedTask.stage}` === taskKey;
                          
                          return (
                            <tr 
                              key={idx} 
                              onClick={() => setSelectedTaskId(taskKey)}
                              className={`hover:bg-[#16314f]/50 transition-colors cursor-pointer ${isSelected ? 'bg-[#16314f]' : ''} ${isDelayed ? 'od' : ''}`}
                            >
                              <td className="idx">{idx + 1}</td>
                              <td className="stage font-medium text-white max-w-[200px] truncate">
                                {t.stage}
                                <span className="ph block text-[9px] text-[#7e95ab] mt-0.5 truncate">{t.phase}</span>
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
                                  <span className="pill r text-[8px] py-[2px]">+{delay}d</span>
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

                {/* Task Detail Card (Right Side) */}
                <div className="lg:col-span-1 flex flex-col h-full min-h-0">
                  {selectedTask ? (
                    <div className="flex-grow bg-[#13293e]/50 border border-white/10 rounded-2xl p-6 shadow-xl space-y-6 overflow-y-auto scrollable-y h-full min-h-0">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#34c6a6] border border-[#34c6a6]/30 px-2 py-0.5 rounded-md bg-[#34c6a6]/5">
                          {selectedTask.phase}
                        </span>
                        <h4 className="text-md font-bold text-white mt-3 font-serif-lux">{selectedTask.stage}</h4>
                        <p className="text-[11px] text-[#7e95ab] mt-1 uppercase tracking-wider">{selectedTask.scope}</p>
                      </div>

                      <div className="h-px bg-white/10"></div>

                      {/* Task details avatar grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34c6a6] to-[#0e2438] border border-white/10 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                            {selectedTask.owner ? selectedTask.owner.split('/').map(w => w.trim().charAt(0)).join('') : '—'}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[#7e95ab] text-[8px] uppercase tracking-wider block">Lead Owner</span>
                            <span className="font-semibold text-white block truncate text-[11px]" title={selectedTask.owner || ''}>{selectedTask.owner || '—'}</span>
                          </div>
                        </div>
                        
                        <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f1a73a] to-[#0e2438] border border-white/10 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                            {selectedTask.consultant ? selectedTask.consultant.split(' ').map(w => w.trim().charAt(0)).join('') : '—'}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[#7e95ab] text-[8px] uppercase tracking-wider block">Consultant</span>
                            <span className="font-semibold text-white block truncate text-[11px]" title={selectedTask.consultant || ''}>{selectedTask.consultant || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-white/10"></div>

                      {/* Milestone Lifecycle Steps Flow Chart */}
                      <div className="space-y-3">
                        <span className="text-[#7e95ab] text-[9px] uppercase tracking-wider block">Milestone Schedule Flow</span>
                        <div className="flex items-center justify-between text-center relative pt-2">
                          {/* Connection Line */}
                          <div className="absolute top-[17px] left-[10%] right-[10%] h-[2px] bg-white/10 z-0">
                            <div 
                              className="h-full bg-[#34c6a6] transition-all duration-300"
                              style={{
                                width: selectedTask.status === 'Complete' ? '100%' : selectedTask.status === 'In Progress' ? '50%' : '0%'
                              }}
                            />
                          </div>
                          
                          {/* Node 1: Baseline Target */}
                          <div className="flex flex-col items-center relative z-10 w-[30%]">
                            <div className="w-[10px] h-[10px] rounded-full bg-[#34c6a6] shadow-[0_0_8px_#34c6a6] mb-1.5" />
                            <span className="text-[9px] font-bold text-white block">Baseline Finish</span>
                            <span className="text-[9px] font-mono text-[#aebfd1] block mt-0.5">{selectedTask.bFinish || '—'}</span>
                          </div>

                          {/* Node 2: Forecast Finish */}
                          <div className="flex flex-col items-center relative z-10 w-[30%]">
                            <div className={`w-[10px] h-[10px] rounded-full mb-1.5 ${
                              selectedTask.status === 'Complete' || selectedTask.status === 'In Progress'
                                ? 'bg-[#f1a73a] shadow-[0_0_8px_#f1a73a]'
                                : 'bg-white/20'
                            }`} />
                            <span className="text-[9px] font-bold text-white block">Forecast Finish</span>
                            <span className="text-[9px] font-mono text-[#aebfd1] block mt-0.5">{selectedTask.fFinish || '—'}</span>
                          </div>

                          {/* Node 3: Status Commissioning */}
                          <div className="flex flex-col items-center relative z-10 w-[30%]">
                            <div className={`w-[10px] h-[10px] rounded-full mb-1.5 ${
                              selectedTask.status === 'Complete'
                                ? 'bg-[#46c08a] shadow-[0_0_8px_#46c08a]'
                                : 'bg-white/20'
                            }`} />
                            <span className="text-[9px] font-bold text-white block">Commissioning</span>
                            <span className="text-[9px] text-[#7e95ab] block mt-0.5 uppercase tracking-wider">{selectedTask.status}</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-white/10"></div>

                      {/* Gantt visual progress chart */}
                      <div>
                        <span className="text-[#7e95ab] text-[9px] uppercase tracking-wider block mb-2">Visual Gantt Progress Bar</span>
                        <div className="w-full bg-[#0b1d2e] h-4 rounded-full border border-white/10 overflow-hidden relative">
                          {/* Fill color based on status */}
                          <div 
                            className={`h-full transition-all duration-500 flex items-center justify-end pr-2 ${
                              selectedTask.status === 'Complete' ? 'bg-[#46c08a]' : 
                              getDelayDays(selectedTask.bFinish, selectedTask.fFinish) > 0 ? 'bg-[#ff5a5f]' : 'bg-[#f1a73a]'
                            }`}
                            style={{ 
                              width: `${selectedTask.status === 'Complete' ? 100 : selectedTask.status === 'In Progress' ? 50 : 10}%` 
                            }}
                          >
                            <span className="text-[8px] font-bold text-white font-mono leading-none">
                              {selectedTask.status === 'Complete' ? '100%' : selectedTask.status === 'In Progress' ? '50%' : '10%'}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-[#7e95ab] mt-1.5 font-mono">
                          <span>Start: 2024</span>
                          <span>Finish Forecast: {selectedTask.fFinish || '—'}</span>
                        </div>
                      </div>

                      {/* Blocker alert warning block */}
                      {getDelayDays(selectedTask.bFinish, selectedTask.fFinish) > 0 && selectedTask.status !== 'Complete' && (
                        <div className="bg-[#ff5a5f]/10 border border-[#ff5a5f]/30 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-[#ff5a5f] text-[10px] font-bold uppercase tracking-wider">
                            <AlertTriangle size={14} />
                            Active delay logged
                          </div>
                          <p className="text-[11px] text-[#ff5a5f]/90 italic leading-relaxed">
                            Task schedule exceeds baseline target by <b className="font-bold">{getDelayDays(selectedTask.bFinish, selectedTask.fFinish)} days</b>. Mitigation protocols recommended.
                          </p>
                        </div>
                      )}

                      <div className="bg-white/5 border border-white/5 p-3 rounded-lg flex items-center gap-3">
                        <Database size={14} className="text-[#34c6a6]" />
                        <span className="text-[10px] text-[#7e95ab] uppercase tracking-wider font-bold">Relational Bindings Active</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow bg-[#13293e]/50 border border-white/10 rounded-2xl p-6 shadow-xl flex items-center justify-center text-[#7e95ab] h-full min-h-0 text-center text-xs">
                      Select a milestone task row to view details.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch overflow-hidden min-h-0 h-full">
                {boardColumns.map((col, cIdx) => (
                  <div 
                    key={cIdx} 
                    className="flex flex-col rounded-2xl border bg-[#13293e]/40 h-full min-h-0 overflow-hidden"
                    style={{ borderColor: col.border }}
                  >
                    {/* Column Header */}
                    <div 
                      className="p-3.5 border-b flex items-center justify-between flex-none bg-[#13293e]/60"
                      style={{ borderBottomColor: col.border }}
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full animate-pulse" 
                          style={{ 
                            backgroundColor: col.color, 
                            boxShadow: `0 0 8px ${col.color}`
                          }} 
                        />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">
                          {col.title}
                        </h4>
                      </div>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white font-mono"
                        style={{ backgroundColor: `${col.color}20`, border: `1px solid ${col.border}` }}
                      >
                        {col.tasks.length}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div className="p-3.5 space-y-3 flex-grow overflow-y-auto scrollable-y min-h-0">
                      {col.tasks.map((t, tIdx) => {
                        const delay = getDelayDays(t.bFinish, t.fFinish);
                        const isSelected = selectedTask && selectedTask.phase === t.phase && selectedTask.stage === t.stage && selectedTask.scope === t.scope;
                        const taskKey = `${t.phase}-${t.scope}-${t.stage}`;

                        return (
                          <div 
                            key={tIdx}
                            onClick={() => {
                              setSelectedTaskId(taskKey);
                            }}
                            className={`p-3.5 rounded-xl border bg-[#0b1d2e]/80 hover:bg-[#0e2438] transition-all cursor-pointer text-left space-y-2.5 ${
                              isSelected ? 'border-[#34c6a6] shadow-[0_0_12px_rgba(52,198,166,0.15)] bg-[#16314f]/50' : 'border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[8px] font-bold text-[#7e95ab] uppercase tracking-wider truncate">
                                  {t.scope}
                                </span>
                                <span className="text-[8px] text-[#7e95ab] font-mono shrink-0">
                                  {t.phase.split(' ')[0]} {t.phase.includes('(') ? t.phase.substring(t.phase.indexOf('(')) : ''}
                                </span>
                              </div>
                              <h5 className="font-semibold text-white text-[11px] mt-1 leading-normal line-clamp-2" title={t.stage}>
                                {t.stage}
                              </h5>
                            </div>

                            {/* Avatars / Owner row */}
                            <div className="flex items-center gap-2 text-[9px] text-[#7e95ab]">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#34c6a6] to-[#0e2438] border border-white/10 flex items-center justify-center font-bold text-white text-[7px] shrink-0">
                                {t.owner ? t.owner.split('/').map(w => w.trim().charAt(0)).join('') : '—'}
                              </div>
                              <span className="truncate flex-grow">
                                Owner: <b className="text-[#aebfd1] font-semibold">{t.owner || '—'}</b>
                              </span>
                            </div>

                            {/* Timeline Date details */}
                            <div className="flex flex-col gap-0.5 text-[9px] border-t border-white/5 pt-2">
                              <div className="flex items-center justify-between text-[#7e95ab] font-mono">
                                <span>Planned:</span>
                                <span className="text-white">{t.bFinish || '—'}</span>
                              </div>
                              <div className="flex items-center justify-between text-[#7e95ab] font-mono">
                                <span>Forecast:</span>
                                <span className={delay > 0 ? 'text-[#ff5a5f] font-semibold' : 'text-white'}>
                                  {t.fFinish || '—'}
                                </span>
                              </div>
                              {delay > 0 && (
                                <div className="flex items-center justify-between text-[#ff5a5f] font-bold mt-1 font-mono">
                                  <span>Variance:</span>
                                  <span>+{delay}d delay</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {col.tasks.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 text-[#7e95ab]">
                          <CheckCircle2 size={24} className="opacity-30 mb-2" />
                          <span className="text-[10px]">No milestones in this stage.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            {slideIndex === 0 ? "Portfolio Overview" : PHASES[slideIndex - 1]}
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
          {[0, 1, 2, 3].map((idx) => (
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
