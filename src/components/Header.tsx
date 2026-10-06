import React from 'react';
import {
  Factory,
  Plus,
  SlidersHorizontal,
  Download,
  Upload,
  RotateCcw,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Project, Collaborator } from '../types';
import { isOverdue, getTodayString } from '../utils/dateUtils';
import { ConnectionStatus, CurrentUserProfile } from '../hooks/useRealtimeCollaboration';

interface HeaderProps {
  projects: Project[];
  collaborators: Collaborator[];
  currentUser: CurrentUserProfile;
  connectionStatus: ConnectionStatus;
  onOpenUserProfile: () => void;
  onOpenNewProject: () => void;
  onOpenProcessMaster: () => void;
  onExportData: () => void;
  onImportData: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  collaborators,
  currentUser,
  connectionStatus,
  onOpenUserProfile,
  onOpenNewProject,
  onOpenProcessMaster,
  onExportData,
  onImportData,
  onResetData,
}) => {
  const today = getTodayString();

  // Aggregate stats
  const totalProjects = projects.length;

  let activeTasksCount = 0;
  let completedTasksCount = 0;
  let overdueTasksCount = 0;

  projects.forEach((proj) => {
    proj.tasks.forEach((task) => {
      if (task.status === 'in_progress') activeTasksCount++;
      if (task.status === 'completed') completedTasksCount++;
      if (isOverdue(task.endDate, task.status, today)) overdueTasksCount++;
    });
  });

  const handlePrint = () => {
    window.print();
  };

  const isLive = connectionStatus === 'connected';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      {/* Top Navbar */}
      <div className="max-w-[1920px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-inner">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                製作工程管理システム
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono font-medium border border-slate-700">
                PROD-GANTT
              </span>
            </div>
            <p className="text-xs text-slate-400">
              板金・製缶・機械加工 リアルタイム共同工程管理
            </p>
          </div>
        </div>

        {/* Live Multi-user Presence & Realtime Status */}
        <div className="flex items-center gap-2">
          {/* Realtime Collaborative Status Chip */}
          <button
            onClick={onOpenUserProfile}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all cursor-pointer ${
              isLive
                ? 'bg-slate-800/90 border-emerald-500/50 text-slate-200 hover:bg-slate-800'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
            title="クリックして名前・担当部署を変更"
          >
            <span className="relative flex h-2 w-2">
              {isLive ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              )}
            </span>

            <span className="font-medium hidden sm:inline">
              {isLive ? '共同入力有効' : '再接続中...'}
            </span>

            {/* Collaborators Count & Avatars */}
            <div className="flex items-center -space-x-1.5 ml-1">
              {collaborators.slice(0, 3).map((collab) => (
                <div
                  key={collab.id}
                  className="w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: collab.color }}
                  title={`${collab.name} (${collab.role})`}
                >
                  {collab.name.charAt(0)}
                </div>
              ))}
              {collaborators.length > 3 && (
                <div className="w-5 h-5 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-200">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>

            {/* Current User Badge */}
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-700/80">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentUser.color }}
              />
              <span className="font-bold text-white text-[11px] max-w-[90px] truncate">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-400 hidden md:inline">
                ({currentUser.role})
              </span>
            </div>
          </button>
        </div>

        {/* Live Shop Floor KPI Badges */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <div>
              <span className="text-slate-400 block text-[9px] leading-tight">案件数</span>
              <span className="font-bold text-white text-xs">{totalProjects}</span> 件
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <div>
              <span className="text-slate-400 block text-[9px] leading-tight">進行中</span>
              <span className="font-bold text-amber-400 text-xs">{activeTasksCount}</span> 工程
            </div>
          </div>

          <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${
              overdueTasksCount > 0
                ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300'
            }`}
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 ${overdueTasksCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}
            />
            <div>
              <span className="block text-[9px] leading-tight">期日警戒</span>
              <span className={`font-bold text-xs ${overdueTasksCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {overdueTasksCount}
              </span> 件
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="text-slate-400 block text-[9px] leading-tight">完了</span>
              <span className="font-bold text-emerald-400 text-xs">{completedTasksCount}</span> 工程
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenNewProject}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>新規物件登録</span>
          </button>

          <button
            onClick={onOpenProcessMaster}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition-colors cursor-pointer"
            title="標準工程マスタの確認・設定"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">工程マスタ</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition-colors cursor-pointer"
            title="現場印刷用プレビュー"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">印刷</span>
          </button>

          {/* Backup & Tools Menu */}
          <div className="flex items-center bg-slate-800 rounded border border-slate-700 p-0.5">
            <button
              onClick={onExportData}
              className="p-1.5 hover:bg-slate-700 text-slate-300 rounded hover:text-white transition-colors cursor-pointer"
              title="JSONデータ保存 (エクスポート)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onImportData}
              className="p-1.5 hover:bg-slate-700 text-slate-300 rounded hover:text-white transition-colors cursor-pointer"
              title="JSONデータ読込 (インポート)"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onResetData}
              className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-amber-300 rounded transition-colors cursor-pointer"
              title="デモ初期データに戻す"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
