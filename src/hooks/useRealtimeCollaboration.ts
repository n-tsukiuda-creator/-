import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Project,
  ProcessDefinition,
  Task,
  Collaborator,
  ActivityNotification,
} from '../types';
import { STANDARD_PROCESSES, getInitialProjects } from '../data/initialData';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

const USER_STORAGE_KEY = 'mfg_gantt_user_profile_v2';

const DEFAULT_ROLES = [
  '現場主任 / 管理',
  'CAM / 図面設計',
  'レーザー切断班',
  'プレス・ベンダー班',
  '溶接・組立班',
  '出荷・品質管理',
];

const USER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
];

export interface CurrentUserProfile {
  id: string;
  name: string;
  role: string;
  color: string;
}

export function useRealtimeCollaboration() {
  // Current user identity from localStorage
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}

    const randomColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    const randomRole = DEFAULT_ROLES[Math.floor(Math.random() * DEFAULT_ROLES.length)];
    const defaultName = `作業者-${Math.floor(100 + Math.random() * 900)}`;

    return {
      id: `usr-${Date.now()}`,
      name: defaultName,
      role: randomRole,
      color: randomColor,
    };
  });

  // Authoritative synced state
  const [projects, setProjects] = useState<Project[]>(getInitialProjects);
  const [standardProcesses, setStandardProcesses] = useState<ProcessDefinition[]>(STANDARD_PROCESSES);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserRef = useRef<CurrentUserProfile>(currentUser);
  currentUserRef.current = currentUser;

  // Save user profile changes
  const updateUserProfile = useCallback((name: string, role: string, color: string) => {
    const updated: CurrentUserProfile = {
      ...currentUserRef.current,
      name: name.trim() || currentUserRef.current.name,
      role: role.trim() || currentUserRef.current.role,
      color,
    };
    setCurrentUser(updated);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Send to websocket if connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'user:join',
          payload: {
            name: updated.name,
            role: updated.role,
            color: updated.color,
          },
        })
      );
    }
  }, []);

  // Helper to add temporary live activity notification
  const addNotification = useCallback((userName: string, userColor: string, message: string) => {
    const notif: ActivityNotification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      userName,
      userColor,
      message,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [notif, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    }, 4500);
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus((prev) => (prev === 'disconnected' ? 'reconnecting' : 'connecting'));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        // Join with current user details
        ws.send(
          JSON.stringify({
            type: 'user:join',
            payload: {
              name: currentUserRef.current.name,
              role: currentUserRef.current.role,
              color: currentUserRef.current.color,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, payload } = msg;

          switch (type) {
            case 'init': {
              setProjects(payload.projects || []);
              setStandardProcesses(payload.standardProcesses || STANDARD_PROCESSES);
              setCollaborators(payload.users || []);
              break;
            }

            case 'presence:update': {
              setCollaborators(payload.users || []);
              break;
            }

            case 'task:updated': {
              const { task, userName } = payload;
              setProjects((prev) =>
                prev.map((proj) => {
                  if (proj.id !== task.projectId) return proj;
                  return {
                    ...proj,
                    tasks: proj.tasks.map((t) => (t.id === task.id ? task : t)),
                  };
                })
              );
              if (userName !== currentUserRef.current.name) {
                addNotification(
                  userName,
                  '#F59E0B',
                  `工程「${task.processName}」の進捗を更新 (${task.progress}%)`
                );
              }
              break;
            }

            case 'task:deleted': {
              const { taskId, projectId, userName } = payload;
              setProjects((prev) =>
                prev.map((proj) => {
                  if (proj.id !== projectId) return proj;
                  return {
                    ...proj,
                    tasks: proj.tasks.filter((t) => t.id !== taskId),
                  };
                })
              );
              if (userName !== currentUserRef.current.name) {
                addNotification(userName, '#EF4444', `工程を削除しました`);
              }
              break;
            }

            case 'project:created': {
              const { project, userName } = payload;
              setProjects((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
              if (userName !== currentUserRef.current.name) {
                addNotification(userName, '#10B981', `新案件「${project.name}」を登録`);
              }
              break;
            }

            case 'project:updated': {
              const { project, userName } = payload;
              setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
              if (userName !== currentUserRef.current.name) {
                addNotification(userName, '#3B82F6', `案件「${project.name}」を更新`);
              }
              break;
            }

            case 'project:deleted': {
              const { projectId, userName } = payload;
              setProjects((prev) => prev.filter((p) => p.id !== projectId));
              if (userName !== currentUserRef.current.name) {
                addNotification(userName, '#EF4444', `案件を削除しました`);
              }
              break;
            }

            case 'processes:updated': {
              const { processes, userName } = payload;
              setStandardProcesses(processes);
              if (userName !== currentUserRef.current.name) {
                addNotification(userName, '#8B5CF6', `標準工程マスタを更新しました`);
              }
              break;
            }

            case 'state:reset': {
              setProjects(payload.projects);
              setStandardProcesses(payload.standardProcesses);
              addNotification('システム', '#64748B', `工場データを初期リセットしました`);
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error('[Client WS] Failed to parse message', err);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        socketRef.current = null;
        // Auto-reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.error('[Client WS] Socket error', err);
        ws.close();
      };
    } catch (err) {
      console.error('[Client WS] Connection setup failed', err);
      setConnectionStatus('disconnected');
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, [addNotification]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  // WebSocket dispatch actions
  const send = useCallback((type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type,
          payload: {
            ...payload,
            userName: currentUserRef.current.name,
          },
        })
      );
    }
  }, []);

  // Broadcast focus when editing a task
  const setFocus = useCallback(
    (activeTaskId?: string, activeProjectId?: string) => {
      send('user:focus', { activeTaskId, activeProjectId });
    },
    [send]
  );

  const updateTask = useCallback(
    (task: Task) => {
      // Optimistic local update
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== task.projectId) return proj;
          return {
            ...proj,
            tasks: proj.tasks.map((t) => (t.id === task.id ? task : t)),
          };
        })
      );
      send('task:update', { task });
    },
    [send]
  );

  const deleteTask = useCallback(
    (taskId: string, projectId: string) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          return {
            ...proj,
            tasks: proj.tasks.filter((t) => t.id !== taskId),
          };
        })
      );
      send('task:delete', { taskId, projectId });
    },
    [send]
  );

  const saveProject = useCallback(
    (project: Project) => {
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === project.id);
        if (exists) {
          return prev.map((p) => (p.id === project.id ? project : p));
        } else {
          return [project, ...prev];
        }
      });

      const isUpdate = projects.some((p) => p.id === project.id);
      send(isUpdate ? 'project:update' : 'project:create', { project });
    },
    [projects, send]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      send('project:delete', { projectId });
    },
    [send]
  );

  const addProcessToProject = useCallback(
    (projectId: string, processData: any) => {
      send('process:add', { projectId, processData });
    },
    [send]
  );

  const updateProcesses = useCallback(
    (processes: ProcessDefinition[]) => {
      setStandardProcesses(processes);
      send('processes:update', { processes });
    },
    [send]
  );

  const resetState = useCallback(() => {
    send('state:reset', {});
  }, [send]);

  return {
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
  };
}
