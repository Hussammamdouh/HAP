import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  MoreHorizontal, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  Eye,
  ListTodo
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

interface ProjectTableProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

type SortField = 'name' | 'progress' | 'status' | 'delay' | 'nextDeadline' | 'overdueTasks';
type SortDirection = 'asc' | 'desc';

export default function ProjectTable({ projects, onSelectProject }: ProjectTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Status badge styling helper
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'On Track': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'Delayed': 
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50';
      case 'Commercial on hold': 
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50';
      default: 
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
    }
  };

  // Handles header column sorting clicks
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort indicators
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="text-brand-gold" />
      : <ArrowDown size={14} className="text-brand-gold" />;
  };

  // Filters & sorts projects in memory
  const processedProjects = useMemo(() => {
    let result = [...projects];

    // 1. Search Query Filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }

    // 2. Status Filter
    if (statusFilter !== 'All') {
      result = result.filter(p => p.status === statusFilter);
    }

    // 3. Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [projects, searchQuery, statusFilter, sortField, sortDirection]);

  return (
    <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden transition-all duration-300">
      
      {/* Table Toolbar */}
      <div className="px-6 py-5 border-b border-[var(--border-color)] bg-slate-50/50 dark:bg-slate-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Project Master Schedule
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
              ({processedProjects.length} shown)
            </span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Sort and filter through properties schedule</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-gold transition-colors placeholder:text-slate-400"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2 border border-[var(--border-color)] bg-[var(--card-bg)] rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
            <Filter size={14} className="text-brand-gold" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              <option value="All">All Statuses</option>
              <option value="On Track">On Track</option>
              <option value="Delayed">Delayed</option>
              <option value="Commercial on hold">Commercial on hold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-[var(--border-color)] text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-2">
                  Project Name
                  {renderSortIcon('name')}
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('progress')}>
                <div className="flex items-center gap-2">
                  Progress
                  {renderSortIcon('progress')}
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-2">
                  Status
                  {renderSortIcon('status')}
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('delay')}>
                <div className="flex items-center gap-2">
                  Variance (Days)
                  {renderSortIcon('delay')}
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('nextDeadline')}>
                <div className="flex items-center gap-2">
                  Next Deadline
                  {renderSortIcon('nextDeadline')}
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 group" onClick={() => handleSort('overdueTasks')}>
                <div className="flex items-center gap-2">
                  Overdue Tasks
                  {renderSortIcon('overdueTasks')}
                </div>
              </th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {processedProjects.length > 0 ? (
              processedProjects.map((project) => (
                <tr 
                  key={project.id} 
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer group/row"
                  onClick={() => onSelectProject(project)}
                >
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200 text-sm group-hover/row:text-brand-gold transition-colors">
                    {project.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-brand-gold h-2 rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 font-medium font-mono text-xs">{project.progress.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {project.delay > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono text-xs">+{project.delay} d</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">On time</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-brand-gold"/>
                      {project.nextDeadline}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {project.overdueTasks > 0 ? (
                      <span className="inline-flex items-center justify-center bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold w-6 h-6 rounded-lg dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400">
                        {project.overdueTasks}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => onSelectProject(project)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-navy hover:bg-slate-100 dark:hover:text-brand-gold dark:hover:bg-slate-800 transition-colors"
                      title="Quick View Details"
                    >
                      <Eye size={18} />
                    </button>
                    <Link 
                      href={`/projects/${project.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-navy hover:bg-slate-100 dark:hover:text-brand-gold dark:hover:bg-slate-800 transition-colors"
                      title="Open Task Board"
                    >
                      <ListTodo size={18} />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-slate-600">
                  No projects matching filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
