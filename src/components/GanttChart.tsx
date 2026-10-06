import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Wrench,
  Calendar,
  Layers,
  ChevronRightCircle,
} from 'lucide-react';
import {
  Project,
  Task,
  ProcessDefinition,
  ProcessStatus,
  ViewMode,
  TimeScale,
} from '../types';
import {
  parseDate,
  formatDate,
  addDays,
  daysDiff,
  getDayOfWeekStr,
  isWeekend,
  isSunday,
  isSaturday,
  isOverdue,
  formatShortDate,
  getTodayString,
} from '../utils/dateUtils';

interface GanttChartProps {
  projects: Project[];
  allProcesses: ProcessDefinition[];
  viewMode: ViewMode;
  timeScale: TimeScale;
  onSelectTask: (task: Task, project: Project) => void;
  onAddProcessToProject: (projectId: string) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  jumpToTodayTrigger: number;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  projects,
  allProcesses,
  viewMode,
  timeScale,
  onSelectTask,
  onAddProcessToProject,
  onEditProject,
  onDeleteProject,
  jumpToTodayTrigger,
}) => {
  const todayStr = getTodayString();
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [collapsedProcesses, setCollapsedProcesses] = useState<Record<string, boolean>>({});
  const [hoveredTask, setHoveredTask] = useState<{ task: Task; project: Project } | null>(null);

  // Column width based on time scale
  const colWidth = useMemo(() => {
    switch (timeScale) {
      case 'day':
        return 44; // px per day
      case 'week':
        return 22; // px per day
      case 'month':
        return 12; // px per day
    }
  }, [timeScale]);

  // Determine overall start date and end date
  const { minDateStr, maxDateStr, totalDays, datesList } = useMemo(() => {
    let minDate = todayStr;
    let maxDate = todayStr;

    projects.forEach((proj) => {
      if (proj.deliveryDate && proj.deliveryDate > maxDate) {
        maxDate = proj.deliveryDate;
      }
      if (proj.orderDate && proj.orderDate < minDate) {
        minDate = proj.orderDate;
      }
      proj.tasks.forEach((t) => {
        if (t.startDate && t.startDate < minDate) minDate = t.startDate;
        if (t.endDate && t.endDate > maxDate) maxDate = t.endDate;
      });
    });

    // Provide safety buffer: 7 days before min, 14 days after max
    const paddedMinDateStr = addDays(minDate, -7);
    const paddedMaxDateStr = addDays(maxDate, 14);

    const diff = Math.max(30, daysDiff(paddedMinDateStr, paddedMaxDateStr) + 1);

    const list: string[] = [];
    for (let i = 0; i < diff; i++) {
      list.push(addDays(paddedMinDateStr, i));
    }

    return {
      minDateStr: paddedMinDateStr,
      maxDateStr: paddedMaxDateStr,
      totalDays: diff,
      datesList: list,
    };
  }, [projects, todayStr]);

  // Month grouping for header
  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    let currentMonth = '';
    let currentCount = 0;

    datesList.forEach((dateStr) => {
      const parts = dateStr.split('-');
      const monthLabel = `${parts[0]}年 ${parseInt(parts[1], 10)}月`;

      if (monthLabel !== currentMonth) {
        if (currentMonth !== '') {
          groups.push({ label: currentMonth, count: currentCount });
        }
        currentMonth = monthLabel;
        currentCount = 1;
      } else {
        currentCount++;
      }
    });

    if (currentMonth !== '') {
      groups.push({ label: currentMonth, count: currentCount });
    }

    return groups;
  }, [datesList]);

  // Scroll to today position
  const scrollToToday = () => {
    if (!timelineScrollRef.current) return;
    const todayIndex = datesList.indexOf(todayStr);
    if (todayIndex >= 0) {
      const targetLeft = todayIndex * colWidth - timelineScrollRef.current.clientWidth / 3;
      timelineScrollRef.current.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToToday();
  }, [jumpToTodayTrigger, minDateStr, colWidth]);

  // Toggle collapses
  const toggleProjectCollapse = (projId: string) => {
    setCollapsedProjects((prev) => ({
      ...prev,
      [projId]: !prev[projId],
    }));
  };

  const toggleProcessCollapse = (procId: string) => {
    setCollapsedProcesses((prev) => ({
      ...prev,
      [procId]: !prev[procId],
    }));
  };

  // Helper to find process color
  const getProcessColor = (processId: string, customProcs: ProcessDefinition[] = []) => {
    const custom = customProcs.find((p) => p.id === processId);
    if (custom) return custom.color;
    const std = allProcesses.find((p) => p.id === processId);
    return std ? std.color : '#64748B';
  };

  // Helper for overall project progress calculation
  const getProjectProgress = (tasks: Task[]): number => {
    if (!tasks || tasks.length === 0) return 0;
    const total = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
    return Math.round(total / tasks.length);
  };

  // Calculate task bar position in pixels
  const getTaskBarCoords = (startDate: string, endDate: string) => {
    const startOffsetDays = daysDiff(minDateStr, startDate);
    const durationDays = Math.max(1, daysDiff(startDate, endDate) + 1);

    const left = startOffsetDays * colWidth;
    const width = Math.max(colWidth - 2, durationDays * colWidth - 4);
    return { left, width };
  };

  const todayIndex = datesList.indexOf(todayStr);
  const todayLeftPx = todayIndex >= 0 ? todayIndex * colWidth + colWidth / 2 : -1;

  // Render By-Process Grouped Data
  const processGroupedData = useMemo(() => {
    if (viewMode !== 'by_process') return [];

    const map = new Map<string, { definition: ProcessDefinition; tasks: { task: Task; project: Project }[] }>();

    // Initialize map with all known processes
    allProcesses.forEach((proc) => {
      map.set(proc.id, { definition: proc, tasks: [] });
    });

    // Populate with tasks
    projects.forEach((proj) => {
      proj.tasks.forEach((task) => {
        let entry = map.get(task.processId);
        if (!entry) {
          // May be custom process
          const custom = proj.customProcesses?.find((p) => p.id === task.processId);
          const def: ProcessDefinition = custom || {
            id: task.processId,
            name: task.processName,
            code: task.code || 'ETC',
            color: '#64748B',
            isStandard: false,
          };
          entry = { definition: def, tasks: [] };
          map.set(task.processId, entry);
        }
        entry.tasks.push({ task, project: proj });
      });
    });

    // Return entries that have tasks or are standard processes
    return Array.from(map.values()).filter((group) => group.tasks.length > 0 || group.definition.isStandard);
  }, [projects, allProcesses, viewMode]);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Scrollable Container with synchronized Left Header and Right Timeline */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================= LEFT FIXED COLUMN ================= */}
        <div className="w-[380px] lg:w-[440px] flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-md">
          {/* Header Row */}
          <div className="h-[68px] border-b border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between text-xs font-semibold text-slate-300">
            {viewMode === 'by_project' ? (
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  物件・案件 / 製作工程一覧
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  {projects.length} 件表示中
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  工程・設備 / 割当物件一覧
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  {processGroupedData.length} 工程
                </span>
              </div>
            )}
          </div>

          {/* Body Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 custom-scrollbar">
            {viewMode === 'by_project' ? (
              // ========= BY PROJECT VIEW =========
              projects.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  該当する物件が見つかりません。
                </div>
              ) : (
                projects.map((project) => {
                  const isCollapsed = collapsedProjects[project.id];
                  const overallProgress = getProjectProgress(project.tasks);
                  const isProjOverdue = isOverdue(project.deliveryDate, overallProgress === 100 ? 'completed' : 'in_progress', todayStr);

                  return (
                    <div key={project.id} className="bg-slate-900/40">
                      {/* Project Header Item */}
                      <div className="h-[52px] px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors border-l-4 border-l-amber-500">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => toggleProjectCollapse(project.id)}
                            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                            title={isCollapsed ? '工程を展開' : '工程を折りたたむ'}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-300" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-amber-400 text-xs">
                                {project.projectNumber}
                              </span>
                              <span className="font-semibold text-xs text-slate-100 truncate" title={project.name}>
                                {project.name}
                              </span>
                              {project.priority === 'urgent' && (
                                <span className="text-[10px] px-1 py-0.2 bg-rose-950 text-rose-300 border border-rose-800 rounded font-bold">
                                  至急
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                              <span>{project.clientName || '得意先未設定'}</span>
                              <span className="text-slate-600">|</span>
                              <span>納期: <span className={isProjOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>{formatShortDate(project.deliveryDate)}</span></span>
                              <span className="text-slate-600">|</span>
                              <span>{project.quantity}台</span>
                            </div>
                          </div>
                        </div>

                        {/* Project Actions & Progress */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Mini Progress */}
                          <div className="text-right w-12 hidden sm:block">
                            <span className="text-xs font-mono font-bold text-slate-200">
                              {overallProgress}%
                            </span>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${overallProgress}%` }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => onAddProcessToProject(project.id)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="この物件に工程を追加"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditProject(project)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="物件情報を編集"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteProject(project.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="物件を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Project Tasks Rows */}
                      {!isCollapsed && (
                        <div className="divide-y divide-slate-800/40 bg-slate-950/60">
                          {project.tasks.length === 0 ? (
                            <div className="h-[40px] pl-10 pr-3 flex items-center justify-between text-xs text-slate-500">
                              <span>登録工程なし</span>
                              <button
                                onClick={() => onAddProcessToProject(project.id)}
                                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                              >
                                ＋工程を追加
                              </button>
                            </div>
                          ) : (
                            project.tasks.map((task) => {
                              const procColor = getProcessColor(task.processId, project.customProcesses);
                              const isTaskOverdue = isOverdue(task.endDate, task.status, todayStr);

                              return (
                                <div
                                  key={task.id}
                                  onClick={() => onSelectTask(task, project)}
                                  className="h-[40px] pl-7 pr-3 flex items-center justify-between gap-2 hover:bg-slate-800/50 cursor-pointer transition-colors group"
                                >
                                  {/* Process Name & Badge */}
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: procColor }}
                                    />
                                    <span className="font-medium text-xs text-slate-200 truncate group-hover:text-amber-300">
                                      {task.processName}
                                    </span>
                                    {task.code && (
                                      <span className="text-[10px] font-mono text-slate-500">
                                        {task.code}
                                      </span>
                                    )}
                                  </div>

                                  {/* Worker / Machine Info */}
                                  <div className="text-[11px] text-slate-400 truncate max-w-[90px] hidden sm:block">
                                    {task.assignedWorker || task.machineName || '-'}
                                  </div>

                                  {/* Status indicator & Progress */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                        task.status === 'completed'
                                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                          : task.status === 'in_progress'
                                          ? isTaskOverdue
                                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                            : 'bg-amber-950/80 text-amber-300 border-amber-800'
                                          : task.status === 'on_hold'
                                          ? 'bg-orange-950/80 text-orange-300 border-orange-800'
                                          : 'bg-slate-800 text-slate-400 border-slate-700'
                                      }`}
                                    >
                                      {task.status === 'completed'
                                        ? '完了'
                                        : task.status === 'in_progress'
                                        ? '進行中'
                                        : task.status === 'on_hold'
                                        ? '保留'
                                        : '未着手'}
                                    </span>

                                    <span className="text-xs font-mono font-bold w-9 text-right text-slate-300">
                                      {task.progress}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              // ========= BY PROCESS VIEW =========
              processGroupedData.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  工程が見つかりません。
                </div>
              ) : (
                processGroupedData.map((group) => {
                  const isCollapsed = collapsedProcesses[group.definition.id];
                  const activeTasks = group.tasks.filter((t) => t.task.status === 'in_progress').length;

                  return (
                    <div key={group.definition.id} className="bg-slate-900/40">
                      {/* Process Header Row */}
                      <div className="h-[48px] px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors border-l-4"
                           style={{ borderLeftColor: group.definition.color }}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => toggleProcessCollapse(group.definition.id)}
                            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-300" />
                            )}
                          </button>

                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="w-3 h-3 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: group.definition.color }}
                            />
                            <span className="font-bold text-xs text-slate-100 truncate">
                              {group.definition.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 px-1 py-0.2 bg-slate-800 rounded">
                              {group.definition.code}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {activeTasks > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded font-semibold">
                              稼働中: {activeTasks}件
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-400">
                            割当計: {group.tasks.length}件
                          </span>
                        </div>
                      </div>

                      {/* Tasks under this Process */}
                      {!isCollapsed && (
                        <div className="divide-y divide-slate-800/40 bg-slate-950/60">
                          {group.tasks.length === 0 ? (
                            <div className="h-[36px] pl-10 pr-3 flex items-center text-xs text-slate-500">
                              現在この工程の予定はありません
                            </div>
                          ) : (
                            group.tasks.map(({ task, project }) => (
                              <div
                                key={task.id}
                                onClick={() => onSelectTask(task, project)}
                                className="h-[40px] pl-7 pr-3 flex items-center justify-between gap-2 hover:bg-slate-800/50 cursor-pointer transition-colors group"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-mono text-amber-400 text-xs font-semibold">
                                    {project.projectNumber}
                                  </span>
                                  <span className="font-medium text-xs text-slate-200 truncate group-hover:text-amber-300">
                                    {project.name}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-400 truncate max-w-[80px]">
                                  {task.assignedWorker || '-'}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs font-mono font-bold text-slate-300">
                                    {task.progress}%
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* ================= RIGHT GANTT TIMELINE ================= */}
        <div
          ref={timelineScrollRef}
          className="flex-1 overflow-x-auto overflow-y-auto bg-slate-950 relative select-none custom-scrollbar"
        >
          <div style={{ width: `${totalDays * colWidth}px` }} className="min-h-full flex flex-col relative">
            {/* Top Timeline Headers (Sticky Top) */}
            <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 flex flex-col">
              {/* Month Row */}
              <div className="h-[32px] flex border-b border-slate-800/80 bg-slate-900">
                {monthGroups.map((group, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${group.count * colWidth}px` }}
                    className="border-r border-slate-800 px-3 flex items-center text-xs font-bold text-slate-200 bg-slate-900/90 truncate"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    {group.label}
                  </div>
                ))}
              </div>

              {/* Day / Date Row */}
              <div className="h-[36px] flex bg-slate-900/95">
                {datesList.map((dateStr) => {
                  const dayNum = parseInt(dateStr.split('-')[2], 10);
                  const dow = getDayOfWeekStr(dateStr);
                  const isSun = isSunday(dateStr);
                  const isSat = isSaturday(dateStr);
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={dateStr}
                      style={{ width: `${colWidth}px` }}
                      className={`flex flex-col items-center justify-center border-r border-slate-800/60 text-[11px] transition-colors ${
                        isToday
                          ? 'bg-amber-500/20 font-bold text-amber-300'
                          : isSun
                          ? 'bg-rose-950/20 text-rose-400'
                          : isSat
                          ? 'bg-sky-950/20 text-sky-400'
                          : 'text-slate-400'
                      }`}
                    >
                      <span className="leading-tight">{dayNum}</span>
                      <span className="text-[10px] leading-tight opacity-80">{dow}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vertical Today Line through entire timeline */}
            {todayLeftPx >= 0 && (
              <div
                style={{ left: `${todayLeftPx}px` }}
                className="absolute top-0 bottom-0 w-[2px] bg-amber-500 z-10 pointer-events-none opacity-90 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              >
                <div className="sticky top-[68px] -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow">
                  本日
                </div>
              </div>
            )}

            {/* Background Vertical Grid Lines */}
            <div className="absolute inset-0 top-[68px] flex pointer-events-none">
              {datesList.map((dateStr) => {
                const isSun = isSunday(dateStr);
                const isSat = isSaturday(dateStr);
                const isToday = dateStr === todayStr;

                return (
                  <div
                    key={dateStr}
                    style={{ width: `${colWidth}px` }}
                    className={`border-r border-slate-900/80 h-full ${
                      isToday
                        ? 'bg-amber-500/[0.04]'
                        : isSun
                        ? 'bg-rose-950/[0.06]'
                        : isSat
                        ? 'bg-sky-950/[0.04]'
                        : ''
                    }`}
                  />
                );
              })}
            </div>

            {/* Timeline Rows matching Left Column exact heights! */}
            <div className="flex-1 divide-y divide-slate-800/80 relative z-0">
              {viewMode === 'by_project' ? (
                // ========= BY PROJECT ROWS =========
                projects.map((project) => {
                  const isCollapsed = collapsedProjects[project.id];

                  // Project Summary Span
                  let projStart = project.orderDate || project.tasks[0]?.startDate || todayStr;
                  let projEnd = project.deliveryDate || project.tasks[project.tasks.length - 1]?.endDate || todayStr;

                  if (project.tasks.length > 0) {
                    const taskStarts = project.tasks.map((t) => t.startDate).sort();
                    const taskEnds = project.tasks.map((t) => t.endDate).sort();
                    if (taskStarts[0]) projStart = taskStarts[0];
                    if (taskEnds[taskEnds.length - 1]) projEnd = taskEnds[taskEnds.length - 1];
                  }

                  const summaryCoords = getTaskBarCoords(projStart, projEnd);
                  const deliveryOffsetDays = daysDiff(minDateStr, project.deliveryDate);
                  const deliveryLeftPx = deliveryOffsetDays * colWidth + colWidth / 2;

                  return (
                    <div key={project.id}>
                      {/* Project Row Timeline Bar */}
                      <div className="h-[52px] relative flex items-center">
                        {/* Overall summary bracket/bar */}
                        <div
                          style={{
                            left: `${summaryCoords.left}px`,
                            width: `${summaryCoords.width}px`,
                          }}
                          className="absolute h-4 rounded bg-slate-800/90 border border-slate-700 overflow-hidden flex items-center px-2 group"
                        >
                          <div
                            className="absolute top-0 bottom-0 left-0 bg-emerald-600/40"
                            style={{ width: `${getProjectProgress(project.tasks)}%` }}
                          />
                          <span className="relative z-10 text-[10px] font-mono text-slate-300 truncate">
                            {project.projectNumber} 全体工程
                          </span>
                        </div>

                        {/* Delivery Date Milestone Marker */}
                        {deliveryLeftPx >= 0 && (
                          <div
                            style={{ left: `${deliveryLeftPx}px` }}
                            className="absolute -translate-x-1/2 flex items-center justify-center z-10"
                            title={`納期: ${project.deliveryDate}`}
                          >
                            <div className="w-4 h-4 rotate-45 bg-rose-600 border border-white/80 shadow-md flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Child Process Tasks Rows */}
                      {!isCollapsed && (
                        <div className="divide-y divide-slate-800/40">
                          {project.tasks.length === 0 ? (
                            <div className="h-[40px]" />
                          ) : (
                            project.tasks.map((task) => {
                              const coords = getTaskBarCoords(task.startDate, task.endDate);
                              const procColor = getProcessColor(task.processId, project.customProcesses);
                              const isTaskOverdue = isOverdue(task.endDate, task.status, todayStr);

                              return (
                                <div key={task.id} className="h-[40px] relative flex items-center">
                                  {/* Interactive Gantt Bar */}
                                  <div
                                    onClick={() => onSelectTask(task, project)}
                                    onMouseEnter={() => setHoveredTask({ task, project })}
                                    onMouseLeave={() => setHoveredTask(null)}
                                    style={{
                                      left: `${coords.left}px`,
                                      width: `${coords.width}px`,
                                      backgroundColor: `${procColor}25`, // light background
                                      borderColor: procColor,
                                    }}
                                    className={`absolute h-7 rounded border cursor-pointer overflow-hidden transition-transform hover:scale-[1.01] hover:brightness-110 flex items-center px-2 shadow-sm select-none ${
                                      isTaskOverdue ? 'ring-2 ring-rose-500' : ''
                                    }`}
                                  >
                                    {/* Progress Fill inside Bar */}
                                    <div
                                      style={{
                                        width: `${task.progress}%`,
                                        backgroundColor: procColor,
                                      }}
                                      className="absolute top-0 bottom-0 left-0 opacity-80"
                                    />

                                    {/* Content on Bar */}
                                    <div className="relative z-10 flex items-center justify-between w-full text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate">
                                      <div className="flex items-center gap-1.5 truncate">
                                        {task.status === 'completed' ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                                        ) : isTaskOverdue ? (
                                          <AlertTriangle className="w-3.5 h-3.5 text-rose-300 animate-pulse flex-shrink-0" />
                                        ) : task.status === 'in_progress' ? (
                                          <Clock className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                                        ) : null}
                                        <span className="truncate">{task.processName}</span>
                                        {task.assignedWorker && (
                                          <span className="text-[10px] font-normal opacity-90 hidden sm:inline">
                                            ({task.assignedWorker})
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-mono text-[11px] ml-1 flex-shrink-0">
                                        {task.progress}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // ========= BY PROCESS ROWS =========
                processGroupedData.map((group) => {
                  const isCollapsed = collapsedProcesses[group.definition.id];

                  return (
                    <div key={group.definition.id}>
                      {/* Process Row */}
                      <div className="h-[48px] relative flex items-center bg-slate-900/20" />

                      {/* Tasks under this Process */}
                      {!isCollapsed && (
                        <div className="divide-y divide-slate-800/40">
                          {group.tasks.length === 0 ? (
                            <div className="h-[36px]" />
                          ) : (
                            group.tasks.map(({ task, project }) => {
                              const coords = getTaskBarCoords(task.startDate, task.endDate);
                              const isTaskOverdue = isOverdue(task.endDate, task.status, todayStr);

                              return (
                                <div key={task.id} className="h-[40px] relative flex items-center">
                                  <div
                                    onClick={() => onSelectTask(task, project)}
                                    onMouseEnter={() => setHoveredTask({ task, project })}
                                    onMouseLeave={() => setHoveredTask(null)}
                                    style={{
                                      left: `${coords.left}px`,
                                      width: `${coords.width}px`,
                                      backgroundColor: `${group.definition.color}25`,
                                      borderColor: group.definition.color,
                                    }}
                                    className={`absolute h-7 rounded border cursor-pointer overflow-hidden transition-transform hover:scale-[1.01] hover:brightness-110 flex items-center px-2 shadow-sm ${
                                      isTaskOverdue ? 'ring-2 ring-rose-500' : ''
                                    }`}
                                  >
                                    <div
                                      style={{
                                        width: `${task.progress}%`,
                                        backgroundColor: group.definition.color,
                                      }}
                                      className="absolute top-0 bottom-0 left-0 opacity-80"
                                    />
                                    <div className="relative z-10 flex items-center justify-between w-full text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate">
                                      <span className="truncate">
                                        [{project.projectNumber}] {project.name}
                                      </span>
                                      <span className="font-mono text-[11px] ml-1 flex-shrink-0">
                                        {task.progress}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredTask && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded p-3 text-xs max-w-sm text-slate-200 pointer-events-none animate-in fade-in duration-100">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-amber-400">
              [{hoveredTask.project.projectNumber}] {hoveredTask.project.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                hoveredTask.task.status === 'completed'
                  ? 'bg-emerald-950 text-emerald-300'
                  : hoveredTask.task.status === 'in_progress'
                  ? 'bg-amber-950 text-amber-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              進捗: {hoveredTask.task.progress}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div>
              <span className="text-slate-500">工程:</span> {hoveredTask.task.processName}
            </div>
            <div>
              <span className="text-slate-500">担当者:</span> {hoveredTask.task.assignedWorker || '未定'}
            </div>
            <div>
              <span className="text-slate-500">予定期間:</span> {hoveredTask.task.startDate} 〜 {hoveredTask.task.endDate}
            </div>
            <div>
              <span className="text-slate-500">使用設備:</span> {hoveredTask.task.machineName || '未指定'}
            </div>
            {hoveredTask.task.quantityTotal && (
              <div className="col-span-2">
                <span className="text-slate-500">加工数量:</span> {hoveredTask.task.quantityCompleted || 0} / {hoveredTask.task.quantityTotal} 台
              </div>
            )}
            {hoveredTask.task.notes && (
              <div className="col-span-2 text-amber-200/90 pt-1 border-t border-slate-800">
                <span className="text-slate-500">申し送り:</span> {hoveredTask.task.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
