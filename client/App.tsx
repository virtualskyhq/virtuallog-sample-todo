import { useEffect, useState, type CSSProperties } from 'react';
import log, { virtualLogDomain } from './log';
import {
  hasIdentity,
  saveSession,
  saveAccessToken,
  clearSession,
  getUserName,
  getSessionId,
  generateSessionId,
} from './session';
import { createApi, type Todo } from './api';

const api = createApi(log);

export const App = () => {
  const [configured, setConfigured] = useState(hasIdentity());

  if (!configured) {
    return <LoginGate onDone={() => setConfigured(true)} />;
  }

  return <TodoApp onResetSetup={() => setConfigured(false)} />;
};

type LoginGateProps = { onDone: () => void };

const LoginGate = ({ onDone }: LoginGateProps) => {
  const [userName, setUserName] = useState(getUserName() ?? '');
  const [sessionId, setSessionId] = useState(getSessionId() ?? '');

  const allFilled = userName.trim() !== '' && sessionId.trim() !== '';

  const handleGenerateId = () => setSessionId(generateSessionId(16));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allFilled) return;
    const identity = { userName: userName.trim(), sessionId: sessionId.trim() };
    const { accessToken } = await api.login(identity.userName, identity.sessionId);
    saveSession(identity);
    saveAccessToken(accessToken);
    log.info('Setup completed', identity);
    onDone();
  };

  return (
    <div style={styles.overlay}>
      <form style={styles.setupCard} onSubmit={handleSubmit}>
        <h1 style={styles.setupTitle}>Who's logging?</h1>
        <p style={styles.setupSubtitle}>
          Identify yourself so you can filter your own activity in VirtualLog.
          The server connection is configured from the environment — you only
          set who you are.
        </p>

        <Field label="User Name" required>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g. alice@example.com"
            style={styles.input}
            autoFocus
          />
        </Field>

        <Field label="Browser Session ID" required>
          <div style={styles.inputWithButton}>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Paste from VirtualLog or generate one"
              style={{ ...styles.input, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleGenerateId}
              style={styles.secondaryButton}
            >
              Generate
            </button>
          </div>
          <p style={styles.fieldHint}>
            Groups every log from this browser into one session. Paste your
            browserSessionId from VirtualLog to correlate, or generate a fresh
            one, then filter by it on the dashboard to see only your activity.
          </p>
        </Field>

        <button
          type="submit"
          disabled={!allFilled}
          style={{
            ...styles.primaryButton,
            ...styles.setupSubmit,
            ...(allFilled ? {} : styles.primaryButtonDisabled),
          }}
        >
          Enter app
        </button>
      </form>
    </div>
  );
};

type FieldProps = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
};

const Field = ({ label, required, children }: FieldProps) => (
  <div style={styles.fieldWrap}>
    <label style={styles.label}>
      {label}
      {required && <span style={styles.requiredMark}>*</span>}
    </label>
    {children}
  </div>
);

type TodoAppProps = { onResetSetup: () => void };

const TodoApp = ({ onResetSetup }: TodoAppProps) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState('');
  const sessionId = getSessionId();
  const userName = getUserName();

  useEffect(() => {
    log.info('App loaded', { userAgent: navigator.userAgent });
    api
      .list()
      .then(setTodos)
      .catch(() => {
        /* api.ts already logged it */
      });
  }, []);

  const addTodo = async () => {
    const title = draft.trim();
    if (!title) {
      log.warn('Empty title rejected');
      return;
    }
    log.info('Add todo clicked', { title });
    try {
      const todo = await api.create(title);
      setTodos((prev) => [todo, ...prev]);
      setDraft('');
    } catch {
      /* logged in api.ts */
    }
  };

  const toggleTodo = async (todo: Todo) => {
    log.info('Toggle clicked', { todoId: todo.id });
    try {
      const updated = await api.toggle(todo.id);
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      /* logged */
    }
  };

  const deleteTodo = async (todo: Todo) => {
    log.info('Delete clicked', { todoId: todo.id });
    try {
      await api.remove(todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch {
      /* logged */
    }
  };

  const resetSetup = async () => {
    log.info('Setup reset');
    await api.clear().catch(() => { /* logged in api.ts */ });
    await api.logout().catch(() => { /* best-effort */ });
    clearSession();
    onResetSetup();
  };

  const triggerServerError = async () => {
    try {
      await api.triggerServerError();
    } catch {
      /* expected — server returns 500 on purpose */
    }
  };

  const triggerClientError = () => {
    const detail = 'Simulated client error from Playground';
    log.error('Simulated client error', { error: detail });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Todo</h1>
          <p style={styles.subtitle}>
            VirtualLog sample app — every action below emits a typed log event.
          </p>
        </div>
        <button type="button" style={styles.iconButton} onClick={resetSetup}>
          Reset setup
        </button>
      </header>

      <div style={styles.sessionBadge}>
        <span style={styles.dot} /> {userName} ·{' '}
        <code style={styles.code}>{sessionId}</code>
      </div>

      <section style={styles.composeRow}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTodo();
          }}
          placeholder="What needs to be done?"
          style={{ ...styles.input, flex: 1 }}
        />
        <button type="button" style={styles.primaryButton} onClick={addTodo}>
          Add
        </button>
      </section>

      <ul style={styles.list}>
        {todos.map((todo) => (
          <li key={todo.id} style={styles.listItem}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo)}
              style={styles.checkbox}
            />
            <span
              style={{
                ...styles.listLabel,
                ...(todo.completed ? styles.listLabelDone : {}),
              }}
            >
              {todo.title}
            </span>
            <button
              type="button"
              style={styles.deleteButton}
              onClick={() => deleteTodo(todo)}
              aria-label="Delete"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && (
        <p style={styles.empty}>No todos yet. Add one above to start logging.</p>
      )}

      <section style={styles.playground}>
        <h3 style={styles.playgroundTitle}>Playground</h3>
        <p style={styles.hint}>
          Trigger sample events to populate your VirtualLog dashboard.
        </p>
        <div style={styles.buttonRow}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={triggerServerError}
          >
            Trigger server error
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={triggerClientError}
          >
            Trigger client error
          </button>
        </div>
      </section>

      <footer style={styles.footer}>
        VirtualLog endpoint:{' '}
        <code style={styles.code}>
          {virtualLogDomain || 'not configured (console only)'}
        </code>
      </footer>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 640,
    margin: '40px auto',
    padding: '0 20px 60px',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: '#1a1a1a',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
  },
  title: { margin: 0, fontSize: 32, fontWeight: 700 },
  subtitle: { margin: '4px 0 0', color: '#6b7280', fontSize: 14 },
  iconButton: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    background: '#fff',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: '#1a1a1a',
    zIndex: 1000,
  },
  setupCard: {
    width: '100%',
    maxWidth: 480,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 28,
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  setupTitle: { margin: 0, fontSize: 22, fontWeight: 700 },
  setupSubtitle: {
    margin: '6px 0 20px',
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 1.5,
  },
  setupSubmit: { width: '100%', marginTop: 8, padding: '10px 16px' },
  fieldWrap: { marginBottom: 16 },
  fieldHint: {
    margin: '6px 0 0',
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  requiredMark: { color: '#dc2626', marginLeft: 4 },
  inputWithButton: { display: 'flex', gap: 8 },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: '#374151',
  },
  input: {
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  primaryButton: {
    padding: '8px 16px',
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  primaryButtonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
  secondaryButton: {
    padding: '8px 14px',
    background: '#fff',
    color: '#1a1a1a',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  sessionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    background: '#ecfdf5',
    color: '#065f46',
    borderRadius: 999,
    fontSize: 12,
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#10b981',
    display: 'inline-block',
  },
  composeRow: { display: 'flex', gap: 8, marginBottom: 16 },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 4px',
    borderBottom: '1px solid #f3f4f6',
  },
  checkbox: { width: 16, height: 16, cursor: 'pointer' },
  listLabel: { flex: 1, fontSize: 15 },
  listLabelDone: { textDecoration: 'line-through', color: '#9ca3af' },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: 14,
    padding: 4,
  },
  empty: { color: '#9ca3af', textAlign: 'center', padding: '32px 0' },
  playground: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #e5e7eb',
  },
  playgroundTitle: { marginTop: 0, marginBottom: 4, fontSize: 16 },
  buttonRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 },
  hint: { fontSize: 13, color: '#6b7280', margin: 0 },
  footer: {
    marginTop: 40,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 11,
    background: '#f3f4f6',
    padding: '1px 6px',
    borderRadius: 4,
  },
};
