'use client';

import React, { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  PlayCircle,
  Database,
  Building2,
  Calendar,
  Filter,
  ListTodo,
  AlertTriangle
} from 'lucide-react';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

// Master Portfolio Projects list (matching dashboard)
const projects = [
  { id: 1, name: 'SLNX', progress: 27.1, status: 'Commercial on hold', delay: 94, nextDeadline: '2026-05-03', overdueTasks: 27 },
  { id: 2, name: 'SLR', progress: 37.0, status: 'Delayed', delay: 226, nextDeadline: '2026-06-22', overdueTasks: 6 },
  { id: 3, name: 'CRI', progress: 59.7, status: 'Delayed', delay: 0, nextDeadline: '2026-06-25', overdueTasks: 1 },
  { id: 4, name: 'HPT', progress: 57.2, status: 'Delayed', delay: 277, nextDeadline: '2026-06-25', overdueTasks: 1 },
  { id: 5, name: 'DRJ', progress: 43.2, status: 'Delayed', delay: 20, nextDeadline: '2026-07-15', overdueTasks: 4 },
  { id: 6, name: 'Encore', progress: 70.8, status: 'Delayed', delay: 4, nextDeadline: '2026-07-20', overdueTasks: 2 },
  { id: 7, name: 'Keys 52', progress: 92.5, status: 'Delayed', delay: 234, nextDeadline: '2026-08-01', overdueTasks: 12 },
  { id: 8, name: 'Lotus', progress: 1.9, status: 'On Track', delay: 35, nextDeadline: '2026-08-10', overdueTasks: 0 },
  { id: 9, name: 'SLW NOA', progress: 43.2, status: 'Delayed', delay: 64, nextDeadline: '2026-08-15', overdueTasks: 8 },
];

// Helper to generate dynamic tasks based on project constraints
const generateTasksForProject = (project: typeof projects[0]) => {
  // Baseline tasks requested by user
  const baseTasks = [
    { id: 1, name: 'Overall Design Phase', type: 'Design', baselineStart: '2025-09-28', actualFinish: '2026-05-14', status: 'Completed' },
    { id: 2, name: 'General Design Development', type: 'Design', baselineStart: '2025-09-28', actualFinish: '2026-05-14', status: 'Completed' },
    { id: 3, name: 'Landscape Engineering (Phase 04)', type: 'Construction', baselineStart: '2025-11-01', actualFinish: '-', status: 'In Progress' },
    { id: 4, name: 'Tender Execution Package', type: 'Procurement', baselineStart: '2025-11-01', actualFinish: '-', status: 'Delayed' },
  ];

  // If project is completed / higher progress, adjust base status
  if (project.progress > 80) {
    baseTasks[2].status = 'Completed';
    baseTasks[2].actualFinish = '2026-04-10';
    baseTasks[3].status = 'Completed';
    baseTasks[3].actualFinish = '2026-05-01';
  }

  // Adjust base delay based on project status
  if (project.status === 'On Track') {
    baseTasks[3].status = 'In Progress';
  }

  const generated: typeof baseTasks = [...baseTasks];

  // Add project-specific delayed tasks to match overdueTasks metric
  const delayCount = project.overdueTasks;
  const delayedSubTasks = [
    { name: 'Excavation & Shoring Permits', type: 'Engineering' },
    { name: 'Main Feeder Substations Hookup', type: 'Construction' },
    { name: 'Structural Foundation Pour Block A', type: 'Construction' },
    { name: 'Core Elevator Shaft Shuttering', type: 'Construction' },
    { name: 'Glazing Subcontractor Procurement', type: 'Procurement' },
    { name: 'HVAC Piping Insulation Installation', type: 'Construction' },
    { name: 'Fire Fighting System Approvals', type: 'Engineering' },
    { name: 'Internal Plastering & Masonry Work', type: 'Construction' },
    { name: 'Drywall Partition Framing (Floor 2)', type: 'Construction' },
    { name: 'Primary Electrical Switchgears Order', type: 'Procurement' },
    { name: 'Landscape Hardscape Curbstone Layout', type: 'Construction' },
    { name: 'Waterproofing of Underground Tanks', type: 'Construction' }
  ];

  for (let i = 0; i < delayCount; i++) {
    const detail = delayedSubTasks[i % delayedSubTasks.length];
    const taskName = `${detail.name} (Sec ${Math.floor(i / 10) + 1})`;
    
    // Distribute starts and target dates
    const startDay = 10 + (i * 3);
    const startMonth = 1 + Math.floor(startDay / 30);
    const startDateStr = `2026-0${startMonth}-${String(startDay % 28 + 1).padStart(2, '0')}`;
    
    generated.push({
      id: generated.length + 1,
      name: taskName,
      type: detail.type,
      baselineStart: startDateStr,
      actualFinish: '-',
      status: 'Delayed'
    });
  }

  // Add some upcoming tasks if progress is not 100% and delayed tasks are low
  if (project.progress < 50) {
    generated.push(
      { id: generated.length + 1, name: 'Interior Gypsum False Ceiling Work', type: 'Construction', baselineStart: '2026-09-10', actualFinish: '-', status: 'Upcoming' },
      { id: generated.length + 1, name: 'Main Entrance Granite Cladding', type: 'Construction', baselineStart: '2026-10-01', actualFinish: '-', status: 'Upcoming' }
    );
  }

  return generated;
};

type SortField = 'name' | 'type' | 'baselineStart' | 'actualFinish' | 'status';
type SortDirection = 'asc' | 'desc';

export default function ProjectDetailPage({ params }: ProjectPageProps) {
  // Resolve params asynchronously via React's use() hook
  const { id } = use(params);
  const projectId = parseInt(id, 10);

  // Retrieve project details
  const project = useMemo(() => {
    return projects.find(p => p.id === projectId) || null;
  }, [projectId]);

  // Generate dynamic tasks matching project specs
  const allTasks = useMemo(() => {
    if (!project) return [];
    return generateTasksForProject(project);
  }, [project]);

  // Filter & sorting states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Task type options
  const taskTypes = useMemo(() => {
    const types = new Set(allTasks.map(t => t.type));
    return ['All', ...Array.from(types)];
  }, [allTasks]);

  // Filtering & Sorting logic
  const processedTasks = useMemo(() => {
    let result = [...allTasks];

    // 1. Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(query));
    }

    // 2. Type filter
    if (typeFilter !== 'All') {
      result = result.filter(t => t.type === typeFilter);
    }

    // 3. Status filter
    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }

    // 4. Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allTasks, searchQuery, typeFilter, statusFilter, sortField, sortDirection]);

  // Task statistics
  const taskStats = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'Completed').length;
    const inProgress = allTasks.filter(t => t.status === 'In Progress').length;
    const delayed = allTasks.filter(t => t.status === 'Delayed').length;
    const upcoming = allTasks.filter(t => t.status === 'Upcoming').length;

    return { total, completed, inProgress, delayed, upcoming };
  }, [allTasks]);

  if (!project) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8 font-sans flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Project Not Found</h2>
          <p className="text-slate-500">The project ID #{id} does not exist in Hassan Allam Properties schedules.</p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navy-light text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Portfolio
          </Link>
        </div>
      </div>
    );
  }

  // Icons based on status
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Completed': 
        return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
      case 'Delayed': 
        return <AlertCircle size={16} className="text-rose-500 shrink-0 animate-pulse" />;
      case 'In Progress': 
        return <PlayCircle size={16} className="text-blue-500 shrink-0" />;
      case 'Upcoming':
      default:
        return <Clock size={16} className="text-slate-400 shrink-0" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Completed': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'Delayed': 
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50';
      case 'In Progress': 
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50';
      case 'Upcoming':
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={13} className="text-slate-400 opacity-40 group-hover:opacity-100" />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={13} className="text-brand-gold" />
      : <ArrowDown size={13} className="text-brand-gold" />;
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-brand-gold transition-colors">Portfolio</Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">{project.name} Task Grid</span>
          </div>

          <Link 
            href="/" 
            className="inline-flex items-center justify-center gap-2 bg-[var(--card-bg)] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-[var(--border-color)] px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm w-fit"
          >
            <ArrowLeft size={16} />
            Back to Portfolio
          </Link>
        </div>

        {/* Project Profile Header */}
        <header className="relative bg-brand-navy text-white rounded-2xl p-6 shadow-lg border-b-4 border-brand-gold overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-dark via-brand-navy to-brand-navy-light opacity-95"></div>
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-gold/25 text-brand-gold rounded-xl border border-brand-gold/30">
                <Building2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white uppercase">{project.name} Tasks</h2>
                  <span className="bg-brand-gold/25 text-brand-gold text-[10px] font-bold border border-brand-gold/20 px-2 py-0.5 rounded tracking-wide uppercase">
                    Schedule Detail
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1.5 font-medium flex items-center gap-4">
                  <span className="flex items-center gap-1"><Calendar size={13} className="text-brand-gold"/> Next Deadline: {project.nextDeadline}</span>
                  {project.delay > 0 && <span className="text-rose-400 font-semibold">Variance: +{project.delay} days</span>}
                </p>
              </div>
            </div>

            {/* Overall Progress Gauge */}
            <div className="flex items-center gap-4 bg-white/5 dark:bg-black/10 px-4 py-3 rounded-xl border border-white/10 w-fit shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Overall Progress</span>
                <span className="text-lg font-bold font-mono text-brand-gold mt-0.5 block">{project.progress}%</span>
              </div>
              <div className="w-16 bg-white/10 h-2.5 rounded-full overflow-hidden shrink-0">
                <div className="bg-brand-gold h-full rounded-full" style={{ width: `${project.progress}%` }}></div>
              </div>
            </div>
          </div>
        </header>

        {/* Task Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm text-center">
            <span className="text-slate-400 text-xs block">Total Tasks</span>
            <span className="text-2xl font-bold font-mono mt-1 block text-slate-800 dark:text-slate-200">{taskStats.total}</span>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm text-center">
            <span className="text-slate-400 text-xs block">Completed</span>
            <span className="text-2xl font-bold font-mono mt-1 block text-emerald-600">{taskStats.completed}</span>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm text-center">
            <span className="text-slate-400 text-xs block">In Progress</span>
            <span className="text-2xl font-bold font-mono mt-1 block text-blue-600">{taskStats.inProgress}</span>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm text-center">
            <span className="text-slate-400 text-xs block">Delayed</span>
            <span className="text-2xl font-bold font-mono mt-1 block text-rose-600">{taskStats.delayed}</span>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm text-center col-span-2 md:col-span-1">
            <span className="text-slate-400 text-xs block">Upcoming</span>
            <span className="text-2xl font-bold font-mono mt-1 block text-slate-500">{taskStats.upcoming}</span>
          </div>
        </div>

        {/* Warning Badge if Delayed tasks are high */}
        {project.overdueTasks > 0 && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="text-rose-500 animate-bounce shrink-0" size={20} />
            <p className="text-xs text-rose-700 dark:text-rose-400">
              There are <span className="font-bold">{project.overdueTasks} critical-path bottlenecks</span> flagged for this development phase. View full schedules below to trace dependency blocks.
            </p>
          </div>
        )}

        {/* Task Data Grid Section */}
        <section className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden">
          
          {/* Data Grid Toolbar */}
          <div className="px-6 py-5 border-b border-[var(--border-color)] bg-slate-50/50 dark:bg-slate-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ListTodo size={18} className="text-brand-gold" />
                Task-Level Execution Database
                <span className="text-xs font-normal text-slate-400">({processedTasks.length} elements)</span>
              </h3>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 sm:flex-none">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search task..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-gold transition-colors placeholder:text-slate-400"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1.5 border border-[var(--border-color)] bg-[var(--card-bg)] rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                <Filter size={12} className="text-brand-gold" />
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="All">All Types</option>
                  {taskTypes.filter(t => t !== 'All').map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 border border-[var(--border-color)] bg-[var(--card-bg)] rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                <Filter size={12} className="text-brand-gold" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Upcoming">Upcoming</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-[var(--border-color)] text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">
                      Task Name
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-2">
                      Type
                      {renderSortIcon('type')}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('baselineStart')}>
                    <div className="flex items-center gap-2">
                      Baseline Start
                      {renderSortIcon('baselineStart')}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('actualFinish')}>
                    <div className="flex items-center gap-2">
                      Actual Finish
                      {renderSortIcon('actualFinish')}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group animate-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">
                      Status
                      {renderSortIcon('status')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {processedTasks.length > 0 ? (
                  processedTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                        {task.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {task.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                        {task.baselineStart}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                        {task.actualFinish}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-600">
                      No matching task-level schedules found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Database mock note */}
        <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
          <Database size={12} />
          <span>Local relational mapping representation. Ready for Supabase connection.</span>
        </div>

      </div>
    </div>
  );
}
