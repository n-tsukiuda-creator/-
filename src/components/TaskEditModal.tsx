import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  Calendar,
  User,
  Wrench,
  FileText,
  Trash2,
  Layers,
  Save,
} from 'lucide-react';
import { Task, Project, ProcessStatus, Collaborator } from '../types';
import { getTodayString } from '../utils/dateUtils';
import { CurrentUserProfile } from '../hooks/useRealtimeCollaboration';

interface TaskEditModalProps {
  task: Task;
  project: Project;
  isOpen: boolean;
  currentUser?: CurrentUserProfile;
  collaborators?: Collaborator[];
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string, projectId: string) => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  project,
  isOpen,
  currentUser,
  collaborators = [],
  onClose,
  onSave,
  onDelete,
}) => {
  const today = getTodayString();
  const otherEditors = collaborators.filter((c) => c.activeTaskId === task.id && c.id !== currentUser?.id);

  const [status, setStatus] = useState<ProcessStatus>(task.status);
  const [progress, setProgress] = useState<number>(task.progress);
  const [startDate, setStartDate] = useState<string>(task.startDate);
  const [endDate, setEndDate] = useState<string>(task.endDate);
  const [actualStartDate, setActualStartDate] = useState<string>(task.actualStartDate || '');
  const [actualEndDate, setActualEndDate] = useState<string>(task.actualEndDate || '');
  const [assignedWorker, setAssignedWorker] = useState<string>(task.assignedWorker || '');
  const [machineName, setMachineName] = useState<string>(task.machineName || '');
  const [quantityCompleted, setQuantityCompleted] = useState<number | ''>(
    task.quantityCompleted !== undefined ? task.quantityCompleted : ''
  );
  const [quantityTotal, setQuantityTotal] = useState<number | ''>(
    task.quantityTotal !== undefined ? task.quantityTotal : project.quantity || ''
  );
  const [notes, setNotes] = useState<string>(task.notes || '');

  if (!isOpen) return null;

  const handleStatusSelect = (newStatus: ProcessStatus) => {
    setStatus(newStatus);
    if (newStatus === 'completed') {
      setProgress(100);
      if (!actualEndDate) setActualEndDate(today);
      if (!actualStartDate) setActualStartDate(task.startDate || today);
    } else if (newStatus === 'in_progress') {
      if (progress === 0) setProgress(20);
      if (progress === 100) setProgress(80);
      if (!actualStartDate) setActualStartDate(today);
    } else if (newStatus === 'not_started') {
      setProgress(0);
      setActualStartDate('');
      setActualEndDate('');
    }
  };

  const handleProgressChange = (val: number) => {
    setProgress(val);
    if (val === 100) {
      setStatus('completed');
      if (!actualEndDate) setActualEndDate(today);
    } else if (val > 0 && status === 'not_started') {
      setStatus('in_progress');
      if (!actualStartDate) setActualStartDate(today);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...task,
      status,
      progress: Math.min(100, Math.max(0, Number(progress))),
      startDate,
      endDate,
      actualStartDate: actualStartDate || undefined,
      actualEndDate: actualEndDate || undefined,
      assignedWorker: assignedWorker.trim() || undefined,
      machineName: machineName.trim() || undefined,
      quantityCompleted: quantityCompleted === '' ? undefined : Number(quantityCompleted),
      quantityTotal: quantityTotal === '' ? undefined : Number(quantityTotal),
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                {project.projectNumber}
              </span>
              <h2 className="text-base font-bold text-white">
                {task.processName} 工程の進捗・実績入力
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">
                物件名: {project.name} ({project.clientName || '得意先未指定'})
              </span>
              {currentUser && (
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  入力者: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role})
                </span>
              )}
            </div>

            {otherEditors.length > 0 && (
              <div className="mt-2 text-xs bg-amber-950/80 border border-amber-600/80 text-amber-200 px-2.5 py-1 rounded flex items-center gap-1.5 animate-pulse">
                <span>⚠️ {otherEditors.map((e) => e.name).join(', ')} さんも現在この工程画面を開いています</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
          {/* 1. Status Selection (Interactive Segmented buttons) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              進捗状態の選択 <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleStatusSelect('not_started')}
                className={`py-2 px-3 rounded text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  status === 'not_started'
                    ? 'bg-slate-800 text-slate-100 border-slate-500 ring-2 ring-slate-400'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <PauseCircle className="w-4 h-4 text-slate-400" />
                <span>未着手</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusSelect('in_progress')}
                className={`py-2 px-3 rounded text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  status === 'in_progress'
                    ? 'bg-amber-950/80 text-amber-200 border-amber-600 ring-2 ring-amber-500'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>進行中</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusSelect('on_hold')}
                className={`py-2 px-3 rounded text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  status === 'on_hold'
                    ? 'bg-orange-950/80 text-orange-200 border-orange-600 ring-2 ring-orange-500'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span>保留・段取</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusSelect('completed')}
                className={`py-2 px-3 rounded text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  status === 'completed'
                    ? 'bg-emerald-950/80 text-emerald-200 border-emerald-600 ring-2 ring-emerald-500'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>完了</span>
              </button>
            </div>
          </div>

          {/* 2. Progress Percentage Slider & Presets */}
          <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                進捗率: <span className="font-mono text-base font-bold text-amber-400">{progress}%</span>
              </label>
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1">
                {[0, 25, 50, 75, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleProgressChange(val)}
                    className={`px-2 py-0.5 text-[11px] rounded font-mono cursor-pointer transition-colors ${
                      progress === val
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-850 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => handleProgressChange(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* 3. Dates: Scheduled vs Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scheduled Dates */}
            <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>予定日程</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">予定開始日</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">予定完了日</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Actual Dates */}
            <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>実績日程 (実績管理)</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">実績開始日</label>
                  <button
                    type="button"
                    onClick={() => setActualStartDate(today)}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    本日を入力
                  </button>
                </div>
                <input
                  type="date"
                  value={actualStartDate}
                  onChange={(e) => setActualStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">実績完了日</label>
                  <button
                    type="button"
                    onClick={() => setActualEndDate(today)}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    本日を入力
                  </button>
                </div>
                <input
                  type="date"
                  value={actualEndDate}
                  onChange={(e) => setActualEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Operator & Machine */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>作業担当者 / オペレーター</span>
              </label>
              <input
                type="text"
                placeholder="例: 佐藤、田中 (レーザー班)"
                value={assignedWorker}
                onChange={(e) => setAssignedWorker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span>使用設備・号機</span>
              </label>
              <input
                type="text"
                placeholder="例: ファイバーレーザー1号機, ベンダー3号"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 5. Production Lot Quantities */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                加工完了数
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={quantityCompleted}
                onChange={(e) =>
                  setQuantityCompleted(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                工程総数量 (ロット)
              </label>
              <input
                type="number"
                min="0"
                placeholder="台数"
                value={quantityTotal}
                onChange={(e) =>
                  setQuantityTotal(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* 6. Notes / Memo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>現場申し送り事項・作業メモ</span>
            </label>
            <textarea
              rows={2}
              placeholder="板厚公差注意、カス上がりチェック済、次工程への連絡など..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm(`工程「${task.processName}」をこの案件から削除しますか？`)) {
                  onDelete(task.id, project.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded border border-rose-900/60 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>工程削除</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>進捗を保存する</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
