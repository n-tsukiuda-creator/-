import React, { useState, useEffect } from 'react';
import { X, Plus, Wrench, Calendar, Sparkles, Check } from 'lucide-react';
import { Project, ProcessDefinition, Task } from '../types';
import { addDays, getTodayString } from '../utils/dateUtils';

interface AddProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  selectedProjectId?: string;
  allStandardProcesses: ProcessDefinition[];
  onAddProcess: (
    projectId: string,
    process: {
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
  ) => void;
}

const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#0D9488', // Teal
  '#10B981', // Emerald
  '#D97706', // Amber
  '#EA580C', // Orange
  '#E11D48', // Rose
  '#8B5CF6', // Purple
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#64748B', // Slate
];

const CUSTOM_TEMPLATES = [
  { name: '粉体焼付塗装', code: 'PAINT', color: '#6366F1' },
  { name: '外注三価クロメートメッキ', code: 'PLATING', color: '#0284C7' },
  { name: 'タップ・面取り', code: 'TAP', color: '#0D9488' },
  { name: 'サンドブラスト・研磨', code: 'BLAST', color: '#D97706' },
  { name: '組立・艤装', code: 'ASSY', color: '#8B5CF6' },
  { name: '超音波探傷検査(UT)', code: 'UT', color: '#E11D48' },
  { name: '熱処理・歪み取り', code: 'HEAT', color: '#EA580C' },
  { name: '木枠梱包・パレット積付', code: 'PACK', color: '#10B981' },
];

export const AddProcessModal: React.FC<AddProcessModalProps> = ({
  isOpen,
  onClose,
  projects,
  selectedProjectId,
  allStandardProcesses,
  onAddProcess,
}) => {
  const today = getTodayString();

  const [projectId, setProjectId] = useState<string>(selectedProjectId || projects[0]?.id || '');
  const [mode, setMode] = useState<'standard' | 'custom'>('standard');
  const [selectedStandardId, setSelectedStandardId] = useState<string>(allStandardProcesses[0]?.id || '');
  
  // Custom process fields
  const [customName, setCustomName] = useState<string>('');
  const [customCode, setCustomCode] = useState<string>('CUSTOM');
  const [customColor, setCustomColor] = useState<string>('#6366F1');

  // Dates & assignments
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(addDays(today, 2));
  const [assignedWorker, setAssignedWorker] = useState<string>('');
  const [machineName, setMachineName] = useState<string>('');

  useEffect(() => {
    if (selectedProjectId) {
      setProjectId(selectedProjectId);
    } else if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [selectedProjectId, projects]);

  // When selected project changes, smartly set default start date after the project's last task
  useEffect(() => {
    const proj = projects.find((p) => p.id === projectId);
    if (proj && proj.tasks.length > 0) {
      const lastEndDate = proj.tasks[proj.tasks.length - 1].endDate;
      if (lastEndDate) {
        setStartDate(addDays(lastEndDate, 1));
        setEndDate(addDays(lastEndDate, 3));
      }
    } else {
      setStartDate(today);
      setEndDate(addDays(today, 2));
    }
  }, [projectId, projects, today]);

  if (!isOpen) return null;

  const targetProject = projects.find((p) => p.id === projectId);

  const applyTemplate = (tpl: { name: string; code: string; color: string }) => {
    setCustomName(tpl.name);
    setCustomCode(tpl.code);
    setCustomColor(tpl.color);
    setMode('custom');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    if (mode === 'standard') {
      const std = allStandardProcesses.find((p) => p.id === selectedStandardId);
      if (!std) return;

      onAddProcess(projectId, {
        name: std.name,
        code: std.code,
        color: std.color,
        startDate,
        endDate,
        assignedWorker: assignedWorker.trim() || undefined,
        machineName: machineName.trim() || undefined,
        isStandard: true,
        existingDefId: std.id,
      });
    } else {
      if (!customName.trim()) return;

      onAddProcess(projectId, {
        name: customName.trim(),
        code: customCode.trim().toUpperCase() || 'CUST',
        color: customColor,
        startDate,
        endDate,
        assignedWorker: assignedWorker.trim() || undefined,
        machineName: machineName.trim() || undefined,
        isStandard: false,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">案件に工程を追加</h2>
              <p className="text-xs text-slate-400">
                基本工程または案件固有の追加工程（塗装・メッキ・検査等）
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {/* 1. Target Project Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              追加対象の物件 <span className="text-rose-400">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.projectNumber}] {p.name} (納期: {p.deliveryDate})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Mode Selector: Standard vs Custom */}
          <div className="flex p-0.5 bg-slate-950 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('standard')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                mode === 'standard'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              基本工程から選ぶ
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                mode === 'custom'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              案件固有の工程を新規追加
            </button>
          </div>

          {/* Standard Process Selector */}
          {mode === 'standard' ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                基本工程の選択
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allStandardProcesses.map((proc) => {
                  const isSelected = selectedStandardId === proc.id;
                  const alreadyInProject = targetProject?.tasks.some((t) => t.processId === proc.id);

                  return (
                    <button
                      key={proc.id}
                      type="button"
                      onClick={() => setSelectedStandardId(proc.id)}
                      className={`p-2 rounded text-left border text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-white font-bold ring-1 ring-amber-500'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: proc.color }}
                        />
                        <span className="truncate">{proc.name}</span>
                      </div>
                      {alreadyInProject && (
                        <span className="text-[10px] text-slate-500 font-normal">済</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Custom Process Creator */
            <div className="space-y-3 bg-slate-950/80 p-3.5 rounded border border-slate-800">
              {/* Quick Template chips */}
              <div>
                <label className="text-[11px] text-slate-400 flex items-center gap-1 mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>代表的な外注・追加工程プリセット:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOM_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="px-2 py-0.5 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  工程名 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 外注カチオン電着塗装、組立・配線、超音波探傷"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    工程略称コード (3〜6文字)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="例: PAINT, TAP, UT"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    識別カラー
                  </label>
                  <div className="flex items-center gap-1.5">
                    {COLOR_PRESETS.slice(0, 6).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCustomColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full cursor-pointer flex items-center justify-center transition-transform ${
                          customColor === c ? 'scale-110 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {customColor === c && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>予定開始日</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>予定完了日</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 4. Operator & Machine */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                作業担当者 / 外注先名
              </label>
              <input
                type="text"
                placeholder="例: 佐藤、外注:協和塗工"
                value={assignedWorker}
                onChange={(e) => setAssignedWorker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                使用設備・ライン
              </label>
              <input
                type="text"
                placeholder="例: 焼付乾燥炉、外部工場"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors shadow-sm cursor-pointer"
            >
              工程を追加する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
