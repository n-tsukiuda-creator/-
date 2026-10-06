import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { GanttChart } from './components/GanttChart';
import { TaskEditModal } from './components/TaskEditModal';
import { ProjectModal } from './components/ProjectModal';
import { AddProcessModal } from './components/AddProcessModal';
import { ProcessMasterModal } from './components/ProcessMasterModal';
import {
  Project,
  Task,
  ProcessDefinition,
  ProcessStatus,
  ViewMode,
  TimeScale,
  FilterState,
} from './types';
import { STANDARD_PROCESSES, getInitialProjects } from './data/initialData';
import { isOverdue, getTodayString } from './utils/dateUtils';

const STORAGE_PROJECTS_KEY = 'mfg_gantt_projects_v2';
const STORAGE_PROCESSES_KEY = 'mfg_gantt_processes_v2';
const STORAGE_VIEWMODE_KEY = 'mfg_gantt_viewmode_v2';
const STORAGE_TIMESCALE_KEY = 'mfg_gantt_timescale_v2';

export default function App() {
  const today = getTodayString();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Core State with LocalStorage
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading projects from localStorage', e);
    }
    return getInitialProjects();
  });

  const [standardProcesses, setStandardProcesses] = useState<ProcessDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROCESSES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading processes from localStorage', e);
    }
    return STANDARD_PROCESSES;
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VIEWMODE_KEY);
      if (saved === 'by_project' || saved === 'by_process') return saved;
    } catch {}
    return 'by_project';
  });

  const [timeScale, setTimeScale] = useState<TimeScale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TIMESCALE_KEY);
      if (saved === 'day' || saved === 'week' || saved === 'month') return saved;
    } catch {}
    return 'day';
  });

  // Save to LocalStorage on updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROCESSES_KEY, JSON.stringify(standardProcesses));
    } catch (e) {
      console.error('Failed to save processes to localStorage', e);
    }
  }, [standardProcesses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VIEWMODE_KEY, viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TIMESCALE_KEY, timeScale);
    } catch {}
  }, [timeScale]);

  // 2. Filter State
  const [filters, setFilters] = useState<FilterState>({
    projectId: 'all',
    processId: 'all',
    status: 'all',
    searchQuery: '',
    priority: 'all',
  });

  // Jump to Today Trigger
  const [jumpToTodayTrigger, setJumpToTodayTrigger] = useState(0);

  // 3. Modals State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskData, setSelectedTaskData] = useState<{ task: Task; project: Project } | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [isAddProcessModalOpen, setIsAddProcessModalOpen] = useState(false);
  const [addProcessTargetProjectId, setAddProcessTargetProjectId] = useState<string | undefined>(undefined);

  const [isProcessMasterModalOpen, setIsProcessMasterModalOpen] = useState(false);

  // Collect all processes (standard + all custom defined in any project) for filter dropdowns
  const allKnownProcesses = useMemo(() => {
    const map = new Map<string, ProcessDefinition>();
    standardProcesses.forEach((p) => map.set(p.id, p));
    projects.forEach((proj) => {
      proj.customProcesses?.forEach((cp) => {
        if (!map.has(cp.id)) map.set(cp.id, cp);
      });
      proj.tasks.forEach((t) => {
        if (!map.has(t.processId)) {
          map.set(t.processId, {
            id: t.processId,
            name: t.processName,
            code: t.code || 'PROC',
            color: '#64748B',
            isStandard: false,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [standardProcesses, projects]);

  // 4. Filtering Logic
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        // Project ID filter
        if (filters.projectId !== 'all' && project.id !== filters.projectId) {
          return false;
        }

        // Process ID filter
        if (filters.processId !== 'all') {
          const hasProcess = project.tasks.some((t) => t.processId === filters.processId);
          if (!hasProcess) return false;
        }

        // Search Query filter
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchesProject =
            project.projectNumber.toLowerCase().includes(q) ||
            project.name.toLowerCase().includes(q) ||
            (project.clientName && project.clientName.toLowerCase().includes(q)) ||
            (project.drawingNumber && project.drawingNumber.toLowerCase().includes(q)) ||
            (project.material && project.material.toLowerCase().includes(q)) ||
            (project.notes && project.notes.toLowerCase().includes(q));

          const matchesAnyTask = project.tasks.some(
            (t) =>
              t.processName.toLowerCase().includes(q) ||
              (t.assignedWorker && t.assignedWorker.toLowerCase().includes(q)) ||
              (t.machineName && t.machineName.toLowerCase().includes(q)) ||
              (t.notes && t.notes.toLowerCase().includes(q))
          );

          if (!matchesProject && !matchesAnyTask) return false;
        }

        // Status Filter
        if (filters.status !== 'all') {
          if (filters.status === 'delayed') {
            const hasOverdueTask = project.tasks.some((t) => isOverdue(t.endDate, t.status, today));
            const isProjectOverdue = isOverdue(project.deliveryDate, 'in_progress', today);
            if (!hasOverdueTask && !isProjectOverdue) return false;
          } else {
            const hasStatusTask = project.tasks.some((t) => t.status === filters.status);
            if (!hasStatusTask) return false;
          }
        }

        return true;
      })
      .map((project) => {
        // If a specific process or status is filtered, we also filter the visible task rows
        let tasks = project.tasks;
        if (filters.processId !== 'all') {
          tasks = tasks.filter((t) => t.processId === filters.processId);
        }
        if (filters.status !== 'all') {
          if (filters.status === 'delayed') {
            tasks = tasks.filter((t) => isOverdue(t.endDate, t.status, today));
          } else {
            tasks = tasks.filter((t) => t.status === filters.status);
          }
        }
        return {
          ...project,
          tasks,
        };
      });
  }, [projects, filters, today]);

  // 5. Handlers for Task and Project Actions
  const handleSelectTask = (task: Task, project: Project) => {
    // Find the full project from main state (in case filtered)
    const fullProject = projects.find((p) => p.id === project.id) || project;
    setSelectedTaskData({ task, project: fullProject });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (updatedTask: Task) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== updatedTask.projectId) return proj;
        const updatedTasks = proj.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
        return {
          ...proj,
          tasks: updatedTasks,
        };
      })
    );
  };

  const handleDeleteTask = (taskId: string, projectId: string) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          tasks: proj.tasks.filter((t) => t.id !== taskId),
        };
      })
    );
  };

  const handleOpenNewProject = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (savedProject: Project) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === savedProject.id);
      if (exists) {
        return prev.map((p) => (p.id === savedProject.id ? savedProject : p));
      } else {
        return [savedProject, ...prev];
      }
    });
  };

  const handleDeleteProject = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    if (confirm(`物件「${target.name}」(製番: ${target.projectNumber}) を削除しますか？`)) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  };

  const handleOpenAddProcess = (projectId: string) => {
    setAddProcessTargetProjectId(projectId);
    setIsAddProcessModalOpen(true);
  };

  const handleAddProcess = (
    projectId: string,
    processData: {
      name: string;
      code: string;
      color: string;
      startDate: string;
      endDate: string;
      assignedWorker?: string;
      machineName?: string;
      isStandard: boolean;
      existingDefId?: string;
    }
  ) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;

        let processId = processData.existingDefId;
        let customProcesses = proj.customProcesses || [];

        if (!processId) {
          processId = `custom-proc-${Date.now()}`;
          const newDef: ProcessDefinition = {
            id: processId,
            name: processData.name,
            code: processData.code,
            color: processData.color,
            isStandard: false,
            category: 'custom',
          };
          customProcesses = [...customProcesses, newDef];
        }

        const newTask: Task = {
          id: `task-${Date.now()}`,
          projectId,
          processId,
          processName: processData.name,
          code: processData.code,
          startDate: processData.startDate,
          endDate: processData.endDate,
          status: 'not_started',
          progress: 0,
          assignedWorker: processData.assignedWorker,
          machineName: processData.machineName,
          order: (proj.tasks.length || 0) + 1,
        };

        return {
          ...proj,
          customProcesses,
          tasks: [...proj.tasks, newTask],
        };
      })
    );
  };

  // 6. Data Import / Export / Reset
  const handleExportData = () => {
    const dataToExport = {
      version: '2.4',
      exportDate: new Date().toISOString(),
      projects,
      standardProcesses,
    };
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `製作工程ガントデータ_${getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDataClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.projects && Array.isArray(parsed.projects)) {
          setProjects(parsed.projects);
          if (parsed.standardProcesses && Array.isArray(parsed.standardProcesses)) {
            setStandardProcesses(parsed.standardProcesses);
          }
          alert(`データを正常にインポートしました (${parsed.projects.length} 件の物件)`);
        } else {
          alert('ファイル形式が正しくありません (projects 配列が必要です)。');
        }
      } catch (err) {
        alert('JSONファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleResetData = () => {
    if (confirm('サンプル初期データ（各種板金・製缶案件と標準工程）にリセットしますか？')) {
      const init = getInitialProjects();
      setProjects(init);
      setStandardProcesses(STANDARD_PROCESSES);
      localStorage.removeItem(STORAGE_PROJECTS_KEY);
      localStorage.removeItem(STORAGE_PROCESSES_KEY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Hidden File Input for Data Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* 1. Industrial Header Bar */}
      <Header
        projects={projects}
        onOpenNewProject={handleOpenNewProject}
        onOpenProcessMaster={() => setIsProcessMasterModalOpen(true)}
        onExportData={handleExportData}
        onImportData={handleImportDataClick}
        onResetData={handleResetData}
      />

      {/* 2. Filter Bar (Project, Process, Status, Search, Mode, TimeScale) */}
      <FilterBar
        projects={projects}
        allProcesses={allKnownProcesses}
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        timeScale={timeScale}
        onTimeScaleChange={setTimeScale}
        onJumpToToday={() => setJumpToTodayTrigger((prev) => prev + 1)}
      />

      {/* 3. Main Interactive Gantt Chart */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <GanttChart
          projects={filteredProjects}
          allProcesses={standardProcesses}
          viewMode={viewMode}
          timeScale={timeScale}
          onSelectTask={handleSelectTask}
          onAddProcessToProject={handleOpenAddProcess}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
          jumpToTodayTrigger={jumpToTodayTrigger}
        />
      </main>

      {/* 4. Modals */}
      {/* Task Progress & Record Edit Modal */}
      {selectedTaskData && (
        <TaskEditModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTaskData(null);
          }}
          task={selectedTaskData.task}
          project={selectedTaskData.project}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Project Register / Edit Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        projectToEdit={projectToEdit}
        allStandardProcesses={standardProcesses}
        onSaveProject={handleSaveProject}
      />

      {/* Add Custom/Standard Process Modal */}
      <AddProcessModal
        isOpen={isAddProcessModalOpen}
        onClose={() => setIsAddProcessModalOpen(false)}
        projects={projects}
        selectedProjectId={addProcessTargetProjectId}
        allStandardProcesses={standardProcesses}
        onAddProcess={handleAddProcess}
      />

      {/* Standard Processes Master Modal */}
      <ProcessMasterModal
        isOpen={isProcessMasterModalOpen}
        onClose={() => setIsProcessMasterModalOpen(false)}
        processes={standardProcesses}
        onSaveProcesses={(updated) => setStandardProcesses(updated)}
      />
    </div>
  );
}
