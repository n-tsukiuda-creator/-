export type ProcessStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed';

export interface ProcessDefinition {
  id: string;
  name: string;
  code: string;
  color: string; // Tailwind color token or hex
  isStandard: boolean;
  category?: 'design' | 'cutting' | 'forming' | 'assembly' | 'finish' | 'shipping' | 'custom';
  description?: string;
}

export interface Task {
  id: string;
  projectId: string;
  processId: string;
  processName: string;
  code: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  actualStartDate?: string;
  actualEndDate?: string;
  status: ProcessStatus;
  progress: number; // 0 to 100
  assignedWorker?: string;
  machineName?: string;
  quantityCompleted?: number;
  quantityTotal?: number;
  notes?: string;
  order: number;
}

export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export interface Project {
  id: string;
  projectNumber: string; // 製番・工事番号
  name: string; // 物件名・品名
  clientName: string; // 得意先名
  deliveryDate: string; // 納期 YYYY-MM-DD
  orderDate: string; // 受注日 YYYY-MM-DD
  quantity: number; // 数量
  drawingNumber: string; // 図面番号
  material: string; // 材質・板厚 (e.g. SS400 t3.2)
  priority: Priority;
  notes: string;
  customProcesses: ProcessDefinition[]; // 案件固有の追加工程
  tasks: Task[];
}

export type ViewMode = 'by_project' | 'by_process';
export type TimeScale = 'day' | 'week' | 'month';

export interface FilterState {
  projectId: string; // 'all' or project ID
  processId: string; // 'all' or process ID
  status: 'all' | ProcessStatus | 'delayed';
  searchQuery: string;
  priority: 'all' | Priority;
}

export interface Collaborator {
  id: string;
  name: string;
  role: string; // e.g. "現場主任", "レーザー担当", "溶接班", "CAD設計", "品管/出荷"
  color: string;
  activeTaskId?: string;
  activeProjectId?: string;
  lastActive: number;
}

export interface ActivityNotification {
  id: string;
  userName: string;
  userColor: string;
  message: string;
  timestamp: number;
}

