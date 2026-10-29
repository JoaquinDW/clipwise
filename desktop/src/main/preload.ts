import { contextBridge, ipcRenderer } from 'electron';
import type { AppState, MomentreelApi } from './ipc-types';

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);

const api: MomentreelApi = {
  getState: () => invoke('state:get'),
  onState: (listener) => {
    const wrapped = (_event: unknown, state: AppState) => listener(state);
    ipcRenderer.on('state', wrapped);
    return () => ipcRenderer.removeListener('state', wrapped);
  },
  activateLicense: (key) => invoke('license:activate', key),
  deactivateLicense: () => invoke('license:deactivate'),
  importVideo: (source) => invoke('video:import', source),
  pickVideoFile: () => invoke('video:pick'),
  deleteVideo: (id) => invoke('video:delete', id),
  revealVideo: (id) => invoke('video:reveal', id),
  updateClip: (id, patch) => invoke('clip:update', id, patch),
  deleteClip: (id) => invoke('clip:delete', id),
  revealClip: (id) => invoke('clip:reveal', id),
  downloadModel: (id) => invoke('model:download', id),
  updateSettings: (patch) => invoke('settings:update', patch),
  installAgent: (agent) => invoke('agent:install', agent),
  copyClaudeCodeCommand: () => invoke('agent:copy-claude-code'),
  openExternal: (url) => invoke('shell:open-external', url),
};

contextBridge.exposeInMainWorld('momentreel', api);
