import React, { useState, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { GanttChart } from './components/GanttChart';
import { TaskEditModal } from './components/TaskEditModal';
import { ProjectModal } from './components/ProjectModal';
import { AddProcessModal } from './components/AddProcessModal';
import { ProcessMasterModal } from './components/ProcessMasterModal';
import { UserProfileModal } from './components/UserProfileModal';
import { LiveActivityToast } from './components/LiveActivityToast';
import { useRealtimeCollaboration } from './hooks/useRealtimeCollaboration';
import {
  Project,
  Task,
  ProcessDefinition,
  ProcessStatus,
  ViewMode,
  TimeScale,
  FilterState,
} from './types';
import { isOverdue, getTodayString } from './utils/dateUtils';

const STORAGE_VIEWMODE_KEY = 'mfg_gantt_viewmode_v2';
const STORAGE_TIMESCALE_KEY = 'mfg_gantt_timescale_v2';

export default function App() {
  const today = getTodayString();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Real-time Multi-User Collaborative State Hook
  const {
    currentUser,
    collaborators,
    connectionStatus,
    projects,
    setProjects,
    standardProcesses,
    notifications,
    updateUserProfile,
    setFocus,
    updateTask,
    deleteTask,
    saveProject,
    deleteProject,
    addProcessToProject,
    updateProcesses,
    resetState,
  } = useRealtimeCollaboration();

  // Local UI view settings
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

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_VIEWMODE_KEY, mode);
    } catch {}
  };

  const handleTimeScaleChange = (scale: TimeScale) => {
    setTimeScale(scale);
    try {
      localStorage.setItem(STORAGE_TIMESCALE_KEY, scale);
    } catch {}
  };

  // 2. Filters
  const [filters, setFilters] = useState<FilterState>({
    projectId: 'all',
    processId: 'all',
    status: 'all',
    searchQuery: '',
    priority: 'all',
  });

  const [jumpToTodayTrigger, setJumpToTodayTrigger] = useState(0);

  // 3. Modals State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskData, setSelectedTaskData] = useState<{ task: Task; project: Project } | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [isAddProcessModalOpen, setIsAddProcessModalOpen] = useState(false);
  const [addProcessTargetProjectId, setAddProcessTargetProjectId] = useState<string | undefined>(undefined);

  const [isProcessMasterModalOpen, setIsProcessMasterModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);

  // Combine processes for filter dropdown
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
        if (filters.projectId !== 'all' && project.id !== filters.projectId) {
          return false;
        }

        if (filters.processId !== 'all') {
          const hasProcess = project.tasks.some((t) => t.processId === filters.processId);
          if (!hasProcess) return false;
        }

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

  // 5. Actions Handlers
  const handleSelectTask = (task: Task, project: Project) => {
    const fullProject = projects.find((p) => p.id === project.id) || project;
    setSelectedTaskData({ task, project: fullProject });
    setIsTaskModalOpen(true);
    // Broadcast active editing presence to other browsers
    setFocus(task.id, project.id);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskData(null);
    setFocus(undefined, undefined);
  };

  const handleOpenNewProject = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setIsProjectModalOpen(true);
  };

  const handleOpenAddProcess = (projectId: string) => {
    setAddProcessTargetProjectId(projectId);
    setIsAddProcessModalOpen(true);
  };

  // 6. Backup Export / Import / Reset
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
    a.download = `製作工程ガント共同データ_${getTodayString()}.json`;
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
          parsed.projects.forEach((p: Project) => saveProject(p));
          alert(`データを正常にインポートしました (${parsed.projects.length} 件の物件)`);
        } else {
          alert('ファイル形式が正しくありません (projects 配列が必要です)。');
        }
      } catch (err) {
        alert('JSONファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

      {/* Live Toast for Collaborative Activity */}
      <LiveActivityToast notifications={notifications} />

      {/* 1. Header with Multi-User Collaborative Presence */}
      <Header
        projects={projects}
        collaborators={collaborators}
        currentUser={currentUser}
        connectionStatus={connectionStatus}
        onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
        onOpenNewProject={handleOpenNewProject}
        onOpenProcessMaster={() => setIsProcessMasterModalOpen(true)}
        onExportData={handleExportData}
        onImportData={handleImportDataClick}
        onResetData={resetState}
      />

      {/* 2. Filter Bar */}
      <FilterBar
        projects={projects}
        allProcesses={allKnownProcesses}
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        timeScale={timeScale}
        onTimeScaleChange={handleTimeScaleChange}
        onJumpToToday={() => setJumpToTodayTrigger((prev) => prev + 1)}
      />

      {/* 3. Main Gantt Chart with Realtime Collaborators Awareness */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <GanttChart
          projects={filteredProjects}
          allProcesses={standardProcesses}
          viewMode={viewMode}
          timeScale={timeScale}
          collaborators={collaborators}
          currentUserId={currentUser.id}
          onSelectTask={handleSelectTask}
          onAddProcessToProject={handleOpenAddProcess}
          onEditProject={handleEditProject}
          onDeleteProject={deleteProject}
          jumpToTodayTrigger={jumpToTodayTrigger}
        />
      </main>

      {/* 4. Modals */}
      {/* Task Progress & Record Edit Modal */}
      {selectedTaskData && (
        <TaskEditModal
          isOpen={isTaskModalOpen}
          onClose={handleCloseTaskModal}
          task={selectedTaskData.task}
          project={selectedTaskData.project}
          currentUser={currentUser}
          collaborators={collaborators}
          onSave={updateTask}
          onDelete={deleteTask}
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
        onSaveProject={saveProject}
      />

      {/* Add Custom/Standard Process Modal */}
      <AddProcessModal
        isOpen={isAddProcessModalOpen}
        onClose={() => setIsAddProcessModalOpen(false)}
        projects={projects}
        selectedProjectId={addProcessTargetProjectId}
        allStandardProcesses={standardProcesses}
        onAddProcess={addProcessToProject}
      />

      {/* Standard Processes Master Modal */}
      <ProcessMasterModal
        isOpen={isProcessMasterModalOpen}
        onClose={() => setIsProcessMasterModalOpen(false)}
        processes={standardProcesses}
        onSaveProcesses={updateProcesses}
      />

      {/* User Profile & Collaborative Presence Modal */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        currentUser={currentUser}
        collaborators={collaborators}
        onSaveProfile={updateUserProfile}
      />
    </div>
  );
}
