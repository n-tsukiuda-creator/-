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
} from 'lucide-react';
import { Project, ProcessStatus } from '../types';
import { isOverdue, getTodayString } from '../utils/dateUtils';

interface HeaderProps {
  projects: Project[];
  onOpenNewProject: () => void;
  onOpenProcessMaster: () => void;
  onExportData: () => void;
  onImportData: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
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
                PROD-GANTT v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              板金・製缶・機械加工 現場工程スケジューラー
            </p>
          </div>
        </div>

        {/* Live Shop Floor KPI Badges */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
            <Layers className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-slate-400 block text-[10px] leading-tight">管理案件数</span>
              <span className="font-bold text-white text-sm">{totalProjects}</span> 件
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-slate-400 block text-[10px] leading-tight">進行中工程</span>
              <span className="font-bold text-amber-400 text-sm">{activeTasksCount}</span> 工程
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${
            overdueTasksCount > 0
              ? 'bg-rose-950/50 border-rose-800 text-rose-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${overdueTasksCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
            <div>
              <span className="block text-[10px] leading-tight">期日超過・警戒</span>
              <span className={`font-bold text-sm ${overdueTasksCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {overdueTasksCount}
              </span> 件
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-slate-400 block text-[10px] leading-tight">完了工程</span>
              <span className="font-bold text-emerald-400 text-sm">{completedTasksCount}</span> 工程
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
