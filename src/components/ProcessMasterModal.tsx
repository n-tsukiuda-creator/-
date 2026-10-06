import React, { useState } from 'react';
import { X, Plus, Trash2, RotateCcw, Wrench, Check } from 'lucide-react';
import { ProcessDefinition } from '../types';
import { STANDARD_PROCESSES } from '../data/initialData';

interface ProcessMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  processes: ProcessDefinition[];
  onSaveProcesses: (updated: ProcessDefinition[]) => void;
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
  '#16A34A', // Green
  '#64748B', // Slate
];

export const ProcessMasterModal: React.FC<ProcessMasterModalProps> = ({
  isOpen,
  onClose,
  processes,
  onSaveProcesses,
}) => {
  const [procList, setProcList] = useState<ProcessDefinition[]>(processes);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newProc: ProcessDefinition = {
      id: `proc_master_${Date.now()}`,
      name: newName.trim(),
      code: newCode.trim().toUpperCase() || 'STD',
      color: newColor,
      isStandard: true,
      description: newDesc.trim() || undefined,
    };

    const updated = [...procList, newProc];
    setProcList(updated);
    setNewName('');
    setNewCode('');
    setNewDesc('');
  };

  const handleDelete = (id: string) => {
    if (confirm('この標準工程をマスタから削除しますか？既存のタスクの表示には影響しません。')) {
      setProcList(procList.filter((p) => p.id !== id));
    }
  };

  const handleResetToDefault = () => {
    if (confirm('基本工程マスタを工場初期設定 (図面・複合機・レーザー・溶接・出荷 等) に復元しますか？')) {
      setProcList(STANDARD_PROCESSES);
    }
  };

  const handleSaveAndClose = () => {
    onSaveProcesses(procList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">標準製作工程マスタ設定</h2>
              <p className="text-xs text-slate-400">
                基本工程の定義・管理（図面、レーザー、ベンダー、溶接、出荷など）
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Master List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>登録済み基本工程 ({procList.length} 件)</span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>工場標準初期値に戻す</span>
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded bg-slate-950/60 max-h-[260px] overflow-y-auto custom-scrollbar">
              {procList.map((proc, index) => (
                <div
                  key={proc.id}
                  className="px-3 py-2 flex items-center justify-between gap-3 text-xs hover:bg-slate-900"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-mono text-slate-500 text-[11px] w-4">
                      {index + 1}
                    </span>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: proc.color }}
                    />
                    <div className="truncate">
                      <span className="font-bold text-slate-200 mr-2">{proc.name}</span>
                      <span className="font-mono text-[10px] text-slate-400 px-1 py-0.2 bg-slate-800 rounded mr-2">
                        {proc.code}
                      </span>
                      {proc.description && (
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          {proc.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(proc.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Master Process */}
          <form onSubmit={handleAddNew} className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>新しい標準工程を登録</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">工程名</label>
                <input
                  type="text"
                  required
                  placeholder="例: パイプレーザー、研磨"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">略称コード (英数字)</label>
                <input
                  type="text"
                  placeholder="例: PLASER, POLISH"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">識別カラー</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full cursor-pointer flex items-center justify-center ${
                      newColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {newColor === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs rounded border border-slate-700 cursor-pointer"
              >
                ＋ マスタに追加
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-850 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            キャンセル
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
          >
            設定を反映する
          </button>
        </div>
      </div>
    </div>
  );
};
