import { describe, expect, it } from 'vitest';
import { upsertCodexToml } from '../src/main/agent-config';

const bridge = { command: '/Applications/Momentreel.app/Contents/MacOS/Momentreel', args: ['/x/bridge.js', '--data-dir', '/d'], env: { ELECTRON_RUN_AS_NODE: '1' } };

describe('upsertCodexToml', () => {
  it('appends our table and keeps the rest of the file', () => {
    const out = upsertCodexToml('model = "o3"\n\n[mcp_servers.other]\ncommand = "x"\n', bridge);
    expect(out).toContain('model = "o3"');
    expect(out).toContain('[mcp_servers.other]');
    expect(out).toContain('[mcp_servers.momentreel]');
    expect(out).toContain('args = ["/x/bridge.js", "--data-dir", "/d"]');
    expect(out).toContain('env = { ELECTRON_RUN_AS_NODE = "1" }');
  });

  it('replaces an existing momentreel table instead of duplicating it', () => {
    const first = upsertCodexToml('[mcp_servers.momentreel]\ncommand = "old"\nargs = []\n\n[profiles.x]\nmodel = "y"\n', bridge);
    expect(first.match(/\[mcp_servers\.momentreel\]/g)).toHaveLength(1);
    expect(first).not.toContain('"old"');
    expect(first).toContain('[profiles.x]');
  });

  it('escapes Windows paths', () => {
    const out = upsertCodexToml('', { ...bridge, command: 'C:\\Program Files\\Momentreel\\Momentreel.exe' });
    expect(out).toContain('command = "C:\\\\Program Files\\\\Momentreel\\\\Momentreel.exe"');
  });
});
