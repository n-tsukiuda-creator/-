import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Layers, CheckSquare, Square, Trash2, ArrowUpDown } from 'lucide-react';
import { Project, ProcessDefinition, Priority, Task, ProcessStatus } from '../types';
import { addDays, getTodayString } from '../utils/dateUtils';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  allStandardProcesses: ProcessDefinition[];
  onSaveProject: (project: Project) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  allStandardProcesses,
  onSaveProject,
}) => {
  const today = getTodayString();

  const [projectNumber, setProjectNumber] = useState('');
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(addDays(today, 10));
  const [orderDate, setOrderDate] = useState(today);
  const [quantity, setQuantity] = useState<number>(1);
  const [drawingNumber, setDrawingNumber] = useState('');
  const [material, setMaterial] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [notes, setNotes] = useState('');

  // Selected processes for this project
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
  const [customProcesses, setCustomProcesses] = useState<ProcessDefinition[]>([]);
  const [newCustomProcName, setNewCustomProcName] = useState('');

  useEffect(() => {
    if (projectToEdit) {
      setProjectNumber(projectToEdit.projectNumber);
      setName(projectToEdit.name);
      setClientName(projectToEdit.clientName || '');
      setDeliveryDate(projectToEdit.deliveryDate);
      setOrderDate(projectToEdit.orderDate || today);
      setQuantity(projectToEdit.quantity || 1);
      setDrawingNumber(projectToEdit.drawingNumber || '');
      setMaterial(projectToEdit.material || '');
      setPriority(projectToEdit.priority || 'normal');
      setNotes(projectToEdit.notes || '');
      setCustomProcesses(projectToEdit.customProcesses || []);

      // Existing task process IDs
      setSelectedProcessIds(projectToEdit.tasks.map((t) => t.processId));
    } else {
      // Default new project
      setProjectNumber(`M26-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setClientName('');
      setDeliveryDate(addDays(today, 10));
      setOrderDate(today);
      setQuantity(1);
      setDrawingNumber('');
      setMaterial('SS400 t3.2');
      setPriority('normal');
      setNotes('');
      setCustomProcesses([]);

      // Default standard selection: DWG, LASER, BEND, WELD, SHIP
      const defaultPicks = ['proc_drawing', 'proc_laser', 'proc_bender', 'proc_welding', 'proc_shipping'];
      setSelectedProcessIds(defaultPicks);
    }
  }, [projectToEdit, isOpen, today]);

  if (!isOpen) return null;

  const toggleProcessSelect = (procId: string) => {
    if (selectedProcessIds.includes(procId)) {
      setSelectedProcessIds(selectedProcessIds.filter((id) => id !== procId));
    } else {
      setSelectedProcessIds([...selectedProcessIds, procId]);
    }
  };

  const handleAddCustomProcessInline = () => {
    if (!newCustomProcName.trim()) return;
    const newId = `custom-proc-${Date.now()}`;
    const newProc: ProcessDefinition = {
      id: newId,
      name: newCustomProcName.trim(),
      code: 'CUST',
      color: '#6366F1',
      isStandard: false,
      category: 'custom',
    };
    setCustomProcesses([...customProcesses, newProc]);
    setSelectedProcessIds([...selectedProcessIds, newId]);
    setNewCustomProcName('');
  };

  const handleRemoveCustomProcess = (procId: string) => {
    setCustomProcesses(customProcesses.filter((p) => p.id !== procId));
    setSelectedProcessIds(selectedProcessIds.filter((id) => id !== procId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectNumber.trim()) return;

    // Build or update project
    const projectId = projectToEdit ? projectToEdit.id : `proj-${Date.now()}`;

    // Available process pools
    const combinedProcesses = [...allStandardProcesses, ...customProcesses];

    // Build tasks based on selected process IDs
    // If editing existing project, keep existing task statuses and progress
    const existingTasksMap = new Map(projectToEdit?.tasks.map((t) => [t.processId, t]));

    const daysCount = Math.max(1, selectedProcessIds.length);
    const totalDayWindow = Math.max(1, Math.floor((new Date(deliveryDate).getTime() - new Date(orderDate).getTime()) / (1000 * 60 * 60 * 24)));
    const stepDays = Math.max(1, Math.floor(totalDayWindow / daysCount));

    let runningDate = orderDate;

    const newTasks: Task[] = selectedProcessIds.map((procId, index) => {
      const def = combinedProcesses.find((p) => p.id === procId);
      const existing = existingTasksMap.get(procId);

      const taskStartDate = existing?.startDate || runningDate;
      const taskEndDate = existing?.endDate || addDays(taskStartDate, Math.max(1, stepDays - 1));
      runningDate = addDays(taskEndDate, 1);

      if (existing) {
        return {
          ...existing,
          processName: def?.name || existing.processName,
          code: def?.code || existing.code,
          order: index + 1,
        };
      }

      const initialStatus: ProcessStatus = index === 0 ? 'in_progress' : 'not_started';

      return {
        id: `task-${Date.now()}-${index}`,
        projectId,
        processId: procId,
        processName: def?.name || '工程',
        code: def?.code || 'PROC',
        startDate: taskStartDate,
        endDate: taskEndDate,
        status: initialStatus,
        progress: index === 0 ? 10 : 0,
        order: index + 1,
      };
    });

    const updatedProject: Project = {
      id: projectId,
      projectNumber: projectNumber.trim(),
      name: name.trim(),
      clientName: clientName.trim(),
      deliveryDate,
      orderDate,
      quantity: Number(quantity) || 1,
      drawingNumber: drawingNumber.trim(),
      material: material.trim(),
      priority,
      notes: notes.trim(),
      customProcesses,
      tasks: newTasks,
    };

    onSaveProject(updatedProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {projectToEdit ? '物件・案件情報の編集' : '新規製作物件の登録'}
              </h2>
              <p className="text-xs text-slate-400">
                製番、納期、材質および適用する製作工程ラインを設定
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Row 1: Project Number, Name, Client */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                製番 / 工事番号 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例: M26-105"
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                物件名 / 品名 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例: 制御盤外殻キャビネット A型"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 2: Client, Delivery Date, Order Date, Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                得意先 / 発注元
              </label>
              <input
                type="text"
                placeholder="例: ○○電機 (株)"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                納期 <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                優先度
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="urgent" className="text-rose-400">至急 (特急)</option>
                <option value="high" className="text-amber-400">高 (急ぎ)</option>
                <option value="normal">通常</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          {/* Row 3: Quantity, Drawing Number, Material */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                数量 (ロット数)
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                図面番号
              </label>
              <input
                type="text"
                placeholder="例: DWG-TK-26081"
                value={drawingNumber}
                onChange={(e) => setDrawingNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                材質・板厚仕様
              </label>
              <input
                type="text"
                placeholder="例: SUS304 2B t1.5 / SS400"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 4. Process Sequence Selection */}
          <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-200">
                  製作工程ラインの選択
                </label>
                <p className="text-[11px] text-slate-400">
                  この案件で通過する工程にチェックを入れてください (順序反映)
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">
                選択中: {selectedProcessIds.length} 工程
              </span>
            </div>

            {/* Standard Processes Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {allStandardProcesses.map((proc) => {
                const isChecked = selectedProcessIds.includes(proc.id);
                return (
                  <button
                    key={proc.id}
                    type="button"
                    onClick={() => toggleProcessSelect(proc.id)}
                    className={`p-2 rounded text-left border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isChecked
                        ? 'border-amber-500 bg-amber-500/10 text-white font-semibold'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: proc.color }}
                      />
                      <span className="truncate">{proc.name}</span>
                    </div>
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 ml-1" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Project Custom Processes list */}
            {customProcesses.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400">
                  この案件の独自追加工程:
                </span>
                <div className="flex flex-wrap gap-2">
                  {customProcesses.map((cp) => {
                    const isChecked = selectedProcessIds.includes(cp.id);
                    return (
                      <div
                        key={cp.id}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border ${
                          isChecked
                            ? 'bg-indigo-950/60 text-indigo-200 border-indigo-700'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleProcessSelect(cp.id)}
                          className="flex items-center gap-1.5 font-medium cursor-pointer"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cp.color }}
                          />
                          <span>{cp.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomProcess(cp.id)}
                          className="text-slate-500 hover:text-rose-400 ml-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick add custom process inline */}
            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="＋ 独自工程を追加 (例: 焼付塗装、外注メッキ、面取りタップ...)"
                value={newCustomProcName}
                onChange={(e) => setNewCustomProcName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomProcessInline();
                  }
                }}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomProcessInline}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 cursor-pointer"
              >
                追加
              </button>
            </div>
          </div>

          {/* 5. Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              特記事項・現場連絡メモ
            </label>
            <textarea
              rows={2}
              placeholder="客先検査立会い日、曲げR指定、傷防止養生などの連絡事項"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
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
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors shadow-sm cursor-pointer"
            >
              {projectToEdit ? '物件情報を保存' : '案件を登録してスケジュール生成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
