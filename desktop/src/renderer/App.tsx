import { useEffect, useMemo, useState } from 'react';
import type { AppState, MomentreelApi } from '../main/ipc-types';
import type { ClipRecord, VideoRecord } from '../engine/types';
import { t } from './i18n';

declare global {
  interface Window {
    momentreel: MomentreelApi;
  }
}

const api = () => window.momentreel;

const CAPTION_STYLES = ['classic', 'bold', 'minimal', 'viral', 'podcast'] as const;
const CROP_METHODS = ['track_speaker', 'track_action', 'blur_sides', 'wide_shot'] as const;

/** Local files reach the UI through the app's media:// protocol, never file://. */
function mediaUrl(file?: string): string | undefined {
  if (!file) return undefined;
  return `media://file${encodeURI(file.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:'))}`;
}

function formatTime(seconds?: number): string {
  if (seconds === undefined) return '';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}

function useAppState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null);
  useEffect(() => {
    void api().getState().then(setState);
    return api().onState(setState);
  }, []);
  return state;
}

function errorText(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  // ipcRenderer prefixes remote errors with the channel; the user only needs the reason
  return message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '');
}

export function App() {
  const state = useAppState();
  const [tab, setTab] = useState<'library' | 'connect' | 'settings'>('library');

  if (!state) return <div className="splash">Momentreel</div>;
  if (state.license.status !== 'active') return <Activation state={state} />;

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand">Momentreel</div>
        <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>
          {t.library}
        </button>
        <button className={tab === 'connect' ? 'active' : ''} onClick={() => setTab('connect')}>
          {t.connect}
          {!Object.values(state.mcp.installed).some(Boolean) && <span className="dot" />}
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          {t.settings}
        </button>
        <div className="version">v{state.version}</div>
      </nav>
      <main className="content">
        {state.license.offline && <div className="notice">{t.offlineNotice}</div>}
        <SetupBanner state={state} />
        {tab === 'library' && <Library state={state} />}
        {tab === 'connect' && <Connect state={state} />}
        {tab === 'settings' && <SettingsPanel state={state} />}
      </main>
    </div>
  );
}

function Activation({ state }: { state: AppState }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api().activateLicense(key);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="activation">
      <h1>{t.activateTitle}</h1>
      {state.license.status === 'expired-offline' ? <p className="warn">{t.offlineExpired}</p> : <p>{t.activateBody}</p>}
      <input
        autoFocus
        placeholder={t.licenseKey}
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
      />
      <button className="primary" disabled={busy || !key.trim()} onClick={() => void submit()}>
        {busy ? t.activating : t.activate}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function SetupBanner({ state }: { state: AppState }) {
  const { engine } = state;
  if (engine.problems.length === 0) return null;
  const download = engine.modelDownload;

  return (
    <div className="banner">
      <strong>{t.setupNeeded}</strong>
      <ul>
        {engine.problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {!engine.whisperModelInstalled &&
        (download ? (
          <Progress value={download.progress} label={`${t.downloading} ${download.progress}%`} />
        ) : (
          <button className="primary" onClick={() => void api().downloadModel(engine.whisperModel)}>
            {t.downloadModel} ({engine.models.find((m) => m.id === engine.whisperModel)?.sizeMb} MB)
          </button>
        ))}
    </div>
  );
}

function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress" title={label}>
      <div style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      {label && <span>{label}</span>}
    </div>
  );
}

function Library({ state }: { state: AppState }) {
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const video = state.videos.find((v) => v.id === selected) ?? state.videos[0];
  const clips = useMemo(() => state.clips.filter((c) => c.videoId === video?.id), [state.clips, video?.id]);

  const doImport = async (input: string | null) => {
    if (!input) return;
    setError(null);
    try {
      const created = await api().importVideo(input);
      setSelected(created.id);
      setSource('');
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="library">
      <div className="import-bar">
        <input
          placeholder={t.importPlaceholder}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void doImport(source.trim())}
        />
        <button className="primary" disabled={!source.trim()} onClick={() => void doImport(source.trim())}>
          {t.importLink}
        </button>
        <button onClick={() => void api().pickVideoFile().then(doImport)}>{t.importFile}</button>
      </div>
      {error && <p className="error">{error}</p>}

      {state.videos.length === 0 ? (
        <p className="empty">{t.emptyLibrary}</p>
      ) : (
        <div className="library-grid">
          <ul className="video-list">
            {state.videos.map((v) => (
              <VideoRow key={v.id} video={v} active={v.id === video?.id} onSelect={() => setSelected(v.id)} />
            ))}
          </ul>
          {video && <VideoDetail video={video} clips={clips} />}
        </div>
      )}
    </div>
  );
}

function VideoRow({ video, active, onSelect }: { video: VideoRecord; active: boolean; onSelect: () => void }) {
  const busy = video.status !== 'ready' && video.status !== 'failed';
  return (
    <li className={active ? 'active' : ''} onClick={onSelect}>
      {video.thumbnailPath ? <img src={mediaUrl(video.thumbnailPath)} alt="" /> : <div className="thumb-placeholder" />}
      <div>
        <div className="title">{video.title}</div>
        <div className={`status ${video.status}`}>
          {t.status[video.status]}
          {video.duration ? ` · ${formatTime(video.duration)}` : ''}
        </div>
        {busy && <Progress value={video.progress} />}
      </div>
    </li>
  );
}

function CopyButton({ text, label = t.copy }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? t.copied : label}
    </button>
  );
}

function VideoDetail({ video, clips }: { video: VideoRecord; clips: ClipRecord[] }) {
  const prompt = t.askAgentPrompt(video.title);
  return (
    <section className="video-detail">
      <header>
        <h2>{video.title}</h2>
        <div className="actions">
          <button onClick={() => void api().revealVideo(video.id)}>{t.openFolder}</button>
          <button
            className="danger"
            onClick={() => {
              if (confirm(t.confirmDeleteVideo)) void api().deleteVideo(video.id);
            }}
          >
            {t.delete}
          </button>
        </div>
      </header>
      {video.status === 'failed' && <p className="error">{video.error}</p>}
      {video.status !== 'ready' && video.status !== 'failed' && (
        <div className="stage">
          <span>
            {t.status[video.status]} {video.detail ? `· ${video.detail}` : ''}
          </span>
          <Progress value={video.progress} label={`${video.progress}%`} />
        </div>
      )}
      {video.status === 'ready' && (
        <div className="ask-agent">
          <span>{t.askAgent}</span>
          <code>{prompt}</code>
          <CopyButton text={prompt} />
        </div>
      )}

      <h3>{t.clips}</h3>
      {clips.length === 0 ? <p className="empty">{t.noClips}</p> : <div className="clips">{clips.map((c) => <ClipCard key={c.id} clip={c} />)}</div>}
    </section>
  );
}

function ClipCard({ clip }: { clip: ClipRecord }) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(String(clip.startTime));
  const [end, setEnd] = useState(String(clip.endTime));
  const [error, setError] = useState<string | null>(null);
  const busy = clip.status === 'queued' || clip.status === 'rendering';

  const update = async (patch: Parameters<MomentreelApi['updateClip']>[1]) => {
    setError(null);
    try {
      await api().updateClip(clip.id, patch);
      setEditing(false);
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <article className="clip">
      <div className="player">
        {clip.status === 'ready' && clip.filePath ? (
          // The version suffix busts the cache after a re-render overwrites the file
          <video src={`${mediaUrl(clip.filePath)}?v=${encodeURIComponent(clip.updatedAt)}`} poster={mediaUrl(clip.thumbnailPath)} controls preload="metadata" />
        ) : (
          <div className="player-placeholder">
            {busy ? <Progress value={clip.progress} label={`${t.status[clip.status]} ${clip.progress}%`} /> : t.status[clip.status]}
          </div>
        )}
      </div>
      <div className="meta">
        <div className="title">{clip.title}</div>
        <div className="sub">
          {formatTime(clip.startTime)}–{formatTime(clip.endTime)} · {Math.round(clip.endTime - clip.startTime)}s
          {clip.score !== undefined && <span className="score">{clip.score}</span>}
        </div>
        {clip.hookText && <div className="hook">“{clip.hookText}”</div>}
        {clip.error && <div className="error">{clip.error}</div>}
        {error && <div className="error">{error}</div>}

        <div className="controls">
          <label>
            {t.captionStyle}
            <select
              disabled={busy}
              value={clip.burnCaptions ? clip.captionStyle : 'none'}
              onChange={(e) =>
                void update(
                  e.target.value === 'none'
                    ? { burnCaptions: false }
                    : { burnCaptions: true, captionStyle: e.target.value as ClipRecord['captionStyle'] }
                )
              }
            >
              {CAPTION_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="none">{t.noCaptions}</option>
            </select>
          </label>
          <label>
            {t.framing}
            <select
              disabled={busy}
              value={clip.cropStrategy.method}
              onChange={(e) => void update({ cropStrategy: { method: e.target.value as ClipRecord['cropStrategy']['method'] } })}
            >
              {CROP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t.crop[m]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {editing ? (
          <div className="trim">
            <label>
              {t.start}
              <input type="number" step="0.1" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              {t.end}
              <input type="number" step="0.1" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
            <button className="primary" onClick={() => void update({ startTime: Number(start), endTime: Number(end) })}>
              {t.rerender}
            </button>
          </div>
        ) : null}

        <div className="actions">
          {clip.filePath && <button onClick={() => void api().revealClip(clip.id)}>{t.showInFolder}</button>}
          <button disabled={busy} onClick={() => setEditing(!editing)}>
            {t.start} / {t.end}
          </button>
          <button className="danger" onClick={() => void api().deleteClip(clip.id)}>
            {t.delete}
          </button>
        </div>
      </div>
    </article>
  );
}

function Connect({ state }: { state: AppState }) {
  const [message, setMessage] = useState<string | null>(null);
  const install = async (agent: 'claude-desktop' | 'codex' | 'cursor') => {
    try {
      const file = await api().installAgent(agent);
      setMessage(t.installedTo(file));
    } catch (err) {
      setMessage(errorText(err));
    }
  };

  const agents: Array<{ id: 'claude-desktop' | 'codex' | 'cursor'; name: string }> = [
    { id: 'claude-desktop', name: 'Claude Desktop' },
    { id: 'codex', name: 'Codex' },
    { id: 'cursor', name: 'Cursor' },
  ];

  return (
    <div className="connect">
      <h2>{t.connectTitle}</h2>
      <p>{t.connectBody}</p>
      {message && <div className="notice">{message}</div>}
      <div className="agents">
        {agents.map((a) => (
          <div className="agent" key={a.id}>
            <div className="name">{a.name}</div>
            {state.mcp.installed[a.id] && <span className="badge">{t.installed}</span>}
            <button className={state.mcp.installed[a.id] ? '' : 'primary'} onClick={() => void install(a.id)}>
              {state.mcp.installed[a.id] ? t.reinstall : t.install}
            </button>
          </div>
        ))}
        <div className="agent wide">
          <div className="name">Claude Code</div>
          <p>{t.claudeCodeHint}</p>
          <code className="command">{state.mcp.claudeCodeCommand}</code>
          <button onClick={() => void api().copyClaudeCodeCommand()}>{t.copyCommand}</button>
        </div>
      </div>
      <div className="endpoint">
        {t.mcpEndpoint}: <code>{state.mcp.url}</code> ·{' '}
        <span className={state.mcp.running ? 'ok' : 'error'}>{state.mcp.running ? t.mcpRunning : t.mcpStopped}</span>
        {state.mcp.error && <p className="error">{state.mcp.error}</p>}
      </div>
    </div>
  );
}

function SettingsPanel({ state }: { state: AppState }) {
  const { settings, engine, license } = state;
  const [port, setPort] = useState(String(settings.mcpPort));

  return (
    <div className="settings">
      <section>
        <h3>{t.whisperModel}</h3>
        <ul className="models">
          {engine.models.map((m) => (
            <li key={m.id}>
              <input
                type="radio"
                checked={settings.whisperModel === m.id}
                onChange={() => void api().updateSettings({ whisperModel: m.id })}
              />
              <span>
                {m.label} · {m.sizeMb} MB
              </span>
              {m.installed ? (
                <span className="badge">{t.installedModel}</span>
              ) : engine.modelDownload?.id === m.id ? (
                <Progress value={engine.modelDownload.progress} label={`${engine.modelDownload.progress}%`} />
              ) : (
                <button disabled={!!engine.modelDownload} onClick={() => void api().downloadModel(m.id)}>
                  {t.downloadModel}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>{t.language}</h3>
        <select value={settings.language} onChange={(e) => void api().updateSettings({ language: e.target.value })}>
          <option value="">{t.autoDetect}</option>
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="it">Italiano</option>
        </select>
      </section>

      <section>
        <h3>{t.defaultCaptionStyle}</h3>
        <select
          value={settings.defaultCaptionStyle}
          onChange={(e) => void api().updateSettings({ defaultCaptionStyle: e.target.value as typeof settings.defaultCaptionStyle })}
        >
          {CAPTION_STYLES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h3>{t.port}</h3>
        <input type="number" value={port} onChange={(e) => setPort(e.target.value)} />
        <button disabled={Number(port) === settings.mcpPort} onClick={() => void api().updateSettings({ mcpPort: Number(port) })}>
          {t.save}
        </button>
      </section>

      <section>
        <h3>{t.libraryFolder}</h3>
        <code>{state.libraryDir}</code>
      </section>

      <section>
        <h3>{t.licenseSection}</h3>
        {license.status === 'active' && <p>{t.licensedTo(license.email ?? license.keyHint)}</p>}
        <button className="danger" onClick={() => void api().deactivateLicense()}>
          {t.deactivate}
        </button>
      </section>
    </div>
  );
}
