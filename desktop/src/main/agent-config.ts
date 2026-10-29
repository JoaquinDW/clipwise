/**
 * One-click "connect Momentreel to my agent".
 *
 * Each client keeps its MCP servers in its own config file. We add (or
 * replace) a `momentreel` entry and leave every other entry alone, backing the
 * file up first. Clients that speak HTTP get the local URL and token; the rest
 * launch the stdio bridge through the app's own binary.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { SERVER_NAME } from '../mcp/constants';

export type AgentId = 'claude-desktop' | 'codex' | 'cursor' | 'claude-code';

export interface BridgeLaunch {
  /** The Electron binary, run as node. */
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface Connection {
  url: string;
  token: string;
  bridge: BridgeLaunch;
}

function home(...parts: string[]): string {
  return path.join(os.homedir(), ...parts);
}

export function agentConfigPath(agent: Exclude<AgentId, 'claude-code'>): string {
  switch (agent) {
    case 'claude-desktop':
      return process.platform === 'win32'
        ? path.join(process.env.APPDATA || home('AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
        : process.platform === 'darwin'
          ? home('Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
          : home('.config', 'Claude', 'claude_desktop_config.json');
    case 'codex':
      return path.join(process.env.CODEX_HOME || home('.codex'), 'config.toml');
    case 'cursor':
      return home('.cursor', 'mcp.json');
  }
}

function backup(file: string): void {
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.momentreel-backup`);
}

function updateJson(file: string, edit: (config: Record<string, unknown>) => void): void {
  let config: Record<string, unknown> = {};
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8').trim();
    // Refuse to overwrite a file we cannot parse: it would wipe the user's other servers
    config = text ? JSON.parse(text) : {};
  }
  edit(config);
  backup(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}

function servers(config: Record<string, unknown>): Record<string, unknown> {
  const existing = config.mcpServers;
  const map = existing && typeof existing === 'object' ? (existing as Record<string, unknown>) : {};
  config.mcpServers = map;
  return map;
}

/** TOML basic strings share JSON's escapes for everything a path can contain. */
const tomlString = (value: string) => JSON.stringify(value);

/** Replace our `[mcp_servers.momentreel]` table, or append it. Other tables are untouched. */
export function upsertCodexToml(existing: string, bridge: BridgeLaunch): string {
  const header = `[mcp_servers.${SERVER_NAME}]`;
  const block = [
    header,
    `command = ${tomlString(bridge.command)}`,
    `args = [${bridge.args.map(tomlString).join(', ')}]`,
    `env = { ${Object.entries(bridge.env)
      .map(([k, v]) => `${k} = ${tomlString(v)}`)
      .join(', ')} }`,
  ].join('\n');

  const lines = existing.split('\n');
  const start = lines.findIndex((l) => l.trim() === header);
  if (start === -1) {
    const trimmed = existing.replace(/\s+$/, '');
    return `${trimmed}${trimmed ? '\n\n' : ''}${block}\n`;
  }
  // Our table runs until the next table header (or a sub-table of ours)
  let end = start + 1;
  while (end < lines.length && !/^\s*\[/.test(lines[end])) end++;
  return [...lines.slice(0, start), block, '', ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n');
}

export function claudeCodeCommand(connection: Connection): string {
  return `claude mcp add --transport http ${SERVER_NAME} ${connection.url} --header "Authorization: Bearer ${connection.token}"`;
}

/** Writes the entry and returns the file it went into. */
export function installAgent(agent: Exclude<AgentId, 'claude-code'>, connection: Connection): string {
  const file = agentConfigPath(agent);
  switch (agent) {
    case 'claude-desktop':
      updateJson(file, (config) => {
        servers(config)[SERVER_NAME] = connection.bridge;
      });
      break;
    case 'cursor':
      updateJson(file, (config) => {
        servers(config)[SERVER_NAME] = { url: connection.url, headers: { Authorization: `Bearer ${connection.token}` } };
      });
      break;
    case 'codex': {
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      backup(file);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, upsertCodexToml(current, connection.bridge));
      break;
    }
  }
  return file;
}

export function isAgentInstalled(agent: Exclude<AgentId, 'claude-code'>): boolean {
  const file = agentConfigPath(agent);
  try {
    const text = fs.readFileSync(file, 'utf8');
    return agent === 'codex' ? text.includes(`[mcp_servers.${SERVER_NAME}]`) : SERVER_NAME in (JSON.parse(text).mcpServers ?? {});
  } catch {
    return false;
  }
}
