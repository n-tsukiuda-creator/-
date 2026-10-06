import React from 'react';
import {
  Search,
  Filter,
  Calendar,
  Grid,
  Layers,
  Wrench,
  X,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Project,
  ProcessDefinition,
  ProcessStatus,
  ViewMode,
  TimeScale,
  FilterState,
} from '../types';

interface FilterBarProps {
  projects: Project[];
  allProcesses: ProcessDefinition[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  timeScale: TimeScale;
  onTimeScaleChange: (scale: TimeScale) => void;
  onJumpToToday: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  projects,
  allProcesses,
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  timeScale,
  onTimeScaleChange,
  onJumpToToday,
}) => {
  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, projectId: e.target.value });
  };

  const handleProcessSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, processId: e.target.value });
  };

  const handleStatusClick = (status: FilterState['status']) => {
    onFilterChange({ ...filters, status });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, searchQuery: e.target.value });
  };

  const clearFilters = () => {
    onFilterChange({
      projectId: 'all',
      processId: 'all',
      status: 'all',
      searchQuery: '',
      priority: 'all',
    });
  };

  const hasActiveFilters =
    filters.projectId !== 'all' ||
    filters.processId !== 'all' ||
    filters.status !== 'all' ||
    filters.searchQuery.trim() !== '';

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 text-slate-200 px-4 py-2.5 space-y-2.5">
      {/* Primary Toolbar Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Mode Toggle & Timeline Scale */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Segmented Control */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded border border-slate-800">
            <button
              onClick={() => onViewModeChange('by_project')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                viewMode === 'by_project'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="物件・案件ごとにツリー表示"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>物件別ガント</span>
            </button>
            <button
              onClick={() => onViewModeChange('by_process')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                viewMode === 'by_process'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="工程・設備ごとに負荷表示"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>工程・設備別ガント</span>
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          {/* Time Scale Buttons */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded border border-slate-800">
            <button
              onClick={() => onTimeScaleChange('day')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                timeScale === 'day'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              日別
            </button>
            <button
              onClick={() => onTimeScaleChange('week')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                timeScale === 'week'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              週別
            </button>
            <button
              onClick={() => onTimeScaleChange('month')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                timeScale === 'month'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              月別
            </button>
          </div>

          {/* Jump to Today button */}
          <button
            onClick={onJumpToToday}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded transition-colors cursor-pointer"
            title="ガントチャートの表示位置を「今日」に合わせる"
          >
            <Target className="w-3.5 h-3.5" />
            <span>今日</span>
          </button>
        </div>

        {/* Right: Search Input */}
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="製番、品名、図番、担当者で検索..."
            className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 text-xs pl-8 pr-7 py-1.5 rounded border border-slate-800 focus:border-amber-500 focus:outline-none transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Secondary Filter Row: Project & Process & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter Select */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">物件絞込:</span>
            <select
              value={filters.projectId}
              onChange={handleProjectSelect}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                すべての物件 ({projects.length}件)
              </option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id} className="bg-slate-900 text-slate-200">
                  [{proj.projectNumber}] {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Process Filter Select */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">工程絞込:</span>
            <select
              value={filters.processId}
              onChange={handleProcessSelect}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                すべての工程 (全工程)
              </option>
              {allProcesses.map((proc) => (
                <option key={proc.id} value={proc.id} className="bg-slate-900 text-slate-200">
                  {proc.name} [{proc.code}]
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          {/* Status Quick Filter Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-slate-500 text-[11px] mr-1 hidden lg:inline">状態:</span>
            <button
              onClick={() => handleStatusClick('all')}
              className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                filters.status === 'all'
                  ? 'bg-slate-800 text-white font-medium border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全状態
            </button>
            <button
              onClick={() => handleStatusClick('not_started')}
              className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                filters.status === 'not_started'
                  ? 'bg-slate-800 text-slate-200 font-semibold border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              未着手
            </button>
            <button
              onClick={() => handleStatusClick('in_progress')}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                filters.status === 'in_progress'
                  ? 'bg-amber-950/80 text-amber-300 font-semibold border border-amber-700'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>進行中</span>
            </button>
            <button
              onClick={() => handleStatusClick('on_hold')}
              className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                filters.status === 'on_hold'
                  ? 'bg-orange-950/80 text-orange-300 font-semibold border border-orange-700'
                  : 'text-orange-400/80 hover:text-orange-300'
              }`}
            >
              保留・段取
            </button>
            <button
              onClick={() => handleStatusClick('completed')}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                filters.status === 'completed'
                  ? 'bg-emerald-950/80 text-emerald-300 font-semibold border border-emerald-700'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>完了</span>
            </button>
            <button
              onClick={() => handleStatusClick('delayed')}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                filters.status === 'delayed'
                  ? 'bg-rose-950 text-rose-300 font-bold border border-rose-700'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>遅延のみ</span>
            </button>
          </div>
        </div>

        {/* Clear Filter Button if active */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer py-0.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>フィルター解除</span>
          </button>
        )}
      </div>
    </div>
  );
};
