import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { STANDARD_PROCESSES, getInitialProjects } from './src/data/initialData.ts';
import { Project, ProcessDefinition, Task, Collaborator } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.resolve(__dirname, 'data_store.json');

// --- Persistent State Storage ---
let projects: Project[] = [];
let standardProcesses: ProcessDefinition[] = STANDARD_PROCESSES;

const loadPersistedData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.projects && Array.isArray(parsed.projects)) {
        projects = parsed.projects;
      }
      if (parsed.standardProcesses && Array.isArray(parsed.standardProcesses)) {
        standardProcesses = parsed.standardProcesses;
      }
      console.log(`[Store] Loaded ${projects.length} projects from ${DATA_FILE}`);
      return;
    }
  } catch (err) {
    console.error('[Store] Failed to load persisted data, falling back to initial data', err);
  }

  projects = getInitialProjects();
  standardProcesses = STANDARD_PROCESSES;
  savePersistedData();
};

const savePersistedData = () => {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ projects, standardProcesses, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('[Store] Failed to save persisted data', err);
  }
};

loadPersistedData();

// --- Express App & HTTP Server ---
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Track connected collaborators
const clients = new Map<WebSocket, Collaborator>();

const getActiveCollaborators = (): Collaborator[] => {
  return Array.from(clients.values());
};

const broadcast = (data: any, exceptWs?: WebSocket) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== exceptWs) {
      client.send(message);
    }
  });
};

const broadcastPresence = () => {
  broadcast({
    type: 'presence:update',
    payload: { users: getActiveCollaborators() },
  });
};

// WebSocket Connection Lifecycle
wss.on('connection', (ws) => {
  let currentUserId = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Default collaborator info until joined
  const collaborator: Collaborator = {
    id: currentUserId,
    name: '作業員',
    role: '製造現場',
    color: '#3B82F6',
    lastActive: Date.now(),
  };

  clients.set(ws, collaborator);

  ws.on('message', (messageRaw) => {
    try {
      const message = JSON.parse(messageRaw.toString());
      const { type, payload } = message;

      switch (type) {
        case 'user:join': {
          const user = clients.get(ws);
          if (user) {
            user.name = payload.name || user.name;
            user.role = payload.role || user.role;
            user.color = payload.color || user.color;
            user.lastActive = Date.now();
          }

          // Send current full state to the newly joined client
          ws.send(
            JSON.stringify({
              type: 'init',
              payload: {
                projects,
                standardProcesses,
                users: getActiveCollaborators(),
                currentUserId,
              },
            })
          );

          broadcastPresence();
          break;
        }

        case 'user:focus': {
          const user = clients.get(ws);
          if (user) {
            user.activeTaskId = payload.activeTaskId;
            user.activeProjectId = payload.activeProjectId;
            user.lastActive = Date.now();
            broadcastPresence();
          }
          break;
        }

        case 'task:update': {
          const updatedTask: Task = payload.task;
          const userName = payload.userName || clients.get(ws)?.name || '作業員';

          projects = projects.map((proj) => {
            if (proj.id !== updatedTask.projectId) return proj;
            const updatedTasks = proj.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
            return { ...proj, tasks: updatedTasks };
          });

          savePersistedData();

          // Broadcast to everyone including or excluding sender
          broadcast({
            type: 'task:updated',
            payload: { task: updatedTask, userName },
          });
          break;
        }

        case 'task:delete': {
          const { taskId, projectId } = payload;
          const userName = payload.userName || clients.get(ws)?.name || '作業員';

          projects = projects.map((proj) => {
            if (proj.id !== projectId) return proj;
            return { ...proj, tasks: proj.tasks.filter((t) => t.id !== taskId) };
          });

          savePersistedData();

          broadcast({
            type: 'task:deleted',
            payload: { taskId, projectId, userName },
          });
          break;
        }

        case 'project:create': {
          const newProject: Project = payload.project;
          const userName = payload.userName || clients.get(ws)?.name || '作業員';

          // Avoid duplicate ID
          projects = [newProject, ...projects.filter((p) => p.id !== newProject.id)];
          savePersistedData();

          broadcast({
            type: 'project:created',
            payload: { project: newProject, userName },
          });
          break;
        }

        case 'project:update': {
          const updatedProject: Project = payload.project;
          const userName = payload.userName || clients.get(ws)?.name || '作業員';

          projects = projects.map((p) => (p.id === updatedProject.id ? updatedProject : p));
          savePersistedData();

          broadcast({
            type: 'project:updated',
            payload: { project: updatedProject, userName },
          });
          break;
        }

        case 'project:delete': {
          const { projectId } = payload;
          const userName = payload.userName || clients.get(ws)?.name || '作業員';

          projects = projects.filter((p) => p.id !== projectId);
          savePersistedData();

          broadcast({
            type: 'project:deleted',
            payload: { projectId, userName },
          });
          break;
        }

        case 'process:add': {
          const { projectId, processData } = payload;
          const userName = payload.userName || clients.get(ws)?.name || '作業員';

          projects = projects.map((proj) => {
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
              id: `task-${Date.now()}-${Math.floor(Math.random() * 100)}`,
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
          });

          savePersistedData();

          const targetProj = projects.find((p) => p.id === projectId);
          broadcast({
            type: 'project:updated',
            payload: { project: targetProj, userName },
          });
          break;
        }

        case 'processes:update': {
          standardProcesses = payload.processes;
          savePersistedData();

          broadcast({
            type: 'processes:updated',
            payload: { processes: standardProcesses, userName: payload.userName },
          });
          break;
        }

        case 'state:reset': {
          projects = getInitialProjects();
          standardProcesses = STANDARD_PROCESSES;
          savePersistedData();

          broadcast({
            type: 'state:reset',
            payload: { projects, standardProcesses },
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[WS] Error processing message', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcastPresence();
  });

  ws.on('error', (err) => {
    console.error('[WS] Socket error', err);
    clients.delete(ws);
    broadcastPresence();
  });
});

// REST Endpoints
app.get('/api/state', (_req, res) => {
  res.json({
    projects,
    standardProcesses,
    users: getActiveCollaborators(),
  });
});

app.post('/api/reset', (_req, res) => {
  projects = getInitialProjects();
  standardProcesses = STANDARD_PROCESSES;
  savePersistedData();
  broadcast({
    type: 'state:reset',
    payload: { projects, standardProcesses },
  });
  res.json({ success: true, count: projects.length });
});

// Full-Stack Server Mounting (Vite dev middlewares in dev, dist in production)
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Production Server] Manufacturing Gantt live on port ${PORT}`);
  });
}

startServer();
