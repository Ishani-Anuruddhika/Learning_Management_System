import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, errorMessage, setToken } from '../api';
import type { AuthUser, RegisterOptions } from '../types';

interface Props {
  onLogin: (user: AuthUser) => void;
}

type Mode = 'signin' | 'forgot' | 'reset' | 'register';

const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO === 'true';

const ROLE_ORDER = ['admin', 'dept_head', 'district_head', 'district_coordinator', 'head_accounts', 'store_officer'] as const;
const HEAD_OFFICE_DEPARTMENTS = [
  'Administration Division',
  'Finance Division',
  'Government Audit Division',
  'Planning Division',
  'Quotation Division',
  'Maintenance Division',
  'IT Division',
  'Training Division',
  'Internal Audit Division',
  'Director Staff Division',
  'Information & Publication Division',
  'Work Shop Division',
  'DMCU Division',
];
const LAB_DEPARTMENTS = [
  'Registration',
  'Chemical Lab',
  'Pressure Lab',
  'Electrical Lab',
  'Humanity & Moisture Lab',
  'Petrol Pump & Pattern Approval',
];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  dept_head: 'Department Head',
  district_head: 'District Head',
  district_coordinator: 'Head of District Coordinator',
  head_accounts: 'Head of Accounts',
  store_officer: 'Store Officer',
};
const formatRoleLabel = (roleName: string | undefined, fallback = '') => {
  if (!roleName) return fallback;
  return ROLE_LABELS[roleName] ?? (fallback || roleName.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
};

const DEMO_ACCOUNTS = [
  { label: 'District Head (Colombo)', username: 'colombo.head', password: 'dist123' },
  { label: 'Department Head (IT)', username: 'it.head', password: 'dept123' },
  { label: 'District Coordinator', username: 'coordinator', password: 'coord123' },
  { label: 'Head of Accounts', username: 'accounts', password: 'acc123' },
  { label: 'Store Officer', username: 'store', password: 'store123' },
];

//Username: admin Password: ChangeMe#12345

/** The emailed link looks like  https://app/?reset=<token> */
const resetTokenFromUrl = (): string => new URLSearchParams(window.location.search).get('reset') ?? '';

const field = 'w-full rounded-lg border px-3.5 py-3 text-sm outline-none';
const fieldStyle = { background: '#0d1117', borderColor: '#30363d', color: '#c9d1d9' };
const selectStyle = { ...fieldStyle, colorScheme: 'dark' as const };
const optionStyle = { background: '#161b22', color: '#c9d1d9' };
const label = 'block text-xs font-semibold mb-1.5';

function Banner({ kind, children }: { kind: 'error' | 'ok' | 'info'; children: ReactNode }) {
  const c = kind === 'error' ? '#da3633' : kind === 'ok' ? '#2ea043' : '#f0a428';
  return (
    <div className="px-3 py-2 rounded text-sm border" style={{ background: `${c}12`, borderColor: `${c}40`, color: c }}>
      {children}
    </div>
  );
}

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<Mode>(() =>
    resetTokenFromUrl() ? 'reset' : new URLSearchParams(window.location.search).has('register') ? 'register' : 'signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotLogin, setForgotLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [devLink, setDevLink] = useState('');
  const [loading, setLoading] = useState(false);

  // Create-account form
  const [options, setOptions] = useState<RegisterOptions | null>(null);
  const [reg, setReg] = useState({
    name: '', employeeId: '', email: '', username: '', role: 'dept_head', departmentId: '', districtId: '', password: '', confirm: '',
  });
  const [registered, setRegistered] = useState('');

  useEffect(() => {
    if (mode !== 'register' || options) return;
    api.get<RegisterOptions>('/register/options')
      .then(o => {
        const ordered = [...o.roles].sort((a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name));
        const departmentOrder = new Map([...HEAD_OFFICE_DEPARTMENTS, ...LAB_DEPARTMENTS].map((name, index) => [name, index]));
        const departments = [...o.departments].sort((a, b) =>
          (departmentOrder.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
          (departmentOrder.get(b.name) ?? Number.MAX_SAFE_INTEGER) ||
          a.name.localeCompare(b.name));
        const firstRequestRole = ordered.find(r => r.name !== 'admin');
        setOptions({ ...o, roles: ordered, departments });
        if (firstRequestRole) setReg(r => ({ ...r, role: firstRequestRole.name }));
      })
      .catch(e => setError(errorMessage(e)));
  }, [mode, options]);

  const regRole = reg.role;
  const setR = (k: keyof typeof reg, v: string) => setReg(r => ({ ...r, [k]: v }));

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (reg.password.length < 8) { setError('Use at least 8 characters for the password.'); return; }
    if (reg.password !== reg.confirm) { setError('The two passwords do not match.'); return; }
    if (regRole === 'district_head' && !reg.districtId) { setError('Choose your district.'); return; }
    if (regRole === 'dept_head' && !reg.departmentId) { setError('Choose your department.'); return; }
    const requestedRole = options?.roles.find(r => r.name === regRole && r.name !== 'admin');
    if (!requestedRole) { setError('This role is unavailable. Please contact an administrator.'); return; }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/register', {
        name: reg.name.trim(),
        employeeId: reg.employeeId.trim(),
        email: reg.email.trim(),
        username: reg.username.trim(),
        roleId: Number(requestedRole.id),
        departmentId: regRole === 'dept_head' ? Number(reg.departmentId) : null,
        districtId: regRole === 'district_head' ? Number(reg.districtId) : null,
        password: reg.password,
        password_confirmation: reg.confirm,
      });
      setRegistered(res.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function go(next: Mode) {
    setMode(next);
    setError('');
    setNotice('');
    setDevLink('');
    setRegistered('');
  }

  async function signIn(u: string, p: string) {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/login', { username: u.trim(), password: p });
      setToken(res.token);
      onLogin(res.user);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setDevLink('');
    setLoading(true);
    try {
      const res = await api.post<{ message: string; devResetLink?: string }>('/forgot-password', { login: forgotLogin.trim() });
      setNotice(res.message);
      if (res.devResetLink) setDevLink(res.devResetLink);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Use at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('The two passwords do not match.'); return; }

    setLoading(true);
    try {
      await api.post('/reset-password', {
        token: resetTokenFromUrl(),
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      window.history.replaceState({}, '', window.location.pathname); // drop the token from the address bar
      setNewPassword('');
      setConfirmPassword('');
      setMode('signin');
      setNotice('Password updated. Sign in with your new password.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const heading = mode === 'signin' ? 'Sign in with the account issued by your administrator'
    : mode === 'forgot' ? 'Enter your username or email and we will send you a reset link'
    : mode === 'register' ? 'Request an account. An administrator approves it before you can sign in'
    : 'Choose a new password for your account';

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0d1117' }}>
      <div className={`w-full ${mode === 'register' ? 'max-w-lg' : 'max-w-md'}`}>
        <div className="mb-8 text-center">
          <div className="text-xs font-mono mb-2" style={{ color: '#1d6fef', letterSpacing: '0.2em' }}>DMUSS</div>
          <h1 className="font-serif font-bold text-3xl" style={{ color: '#c9d1d9' }}>Stock Control System</h1>
          <p className="text-sm mt-2" style={{ color: '#8b949e' }}>{heading}</p>
        </div>

        {mode === 'signin' && (
          <form onSubmit={e => { e.preventDefault(); void signIn(username, password); }}
            className="rounded-xl border p-6 space-y-4" style={{ background: '#161b22', borderColor: '#30363d' }}>
            {notice && <Banner kind="ok">{notice}</Banner>}
            {error && <Banner kind="error">{error}</Banner>}

            <div>
              <label className={label} style={{ color: '#8b949e' }}>USERNAME</label>
              <input className={field} style={fieldStyle} value={username} autoComplete="username" autoFocus
                onChange={e => setUsername(e.target.value)} placeholder="e.g. colombo.head" required />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: '#8b949e' }}>PASSWORD</label>
                <button type="button" onClick={() => go('forgot')} className="text-xs" style={{ color: '#1d6fef' }}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input className={field} style={fieldStyle} type={showPassword ? 'text' : 'password'} value={password}
                  autoComplete="current-password" onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#8b949e' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-60" style={{ background: '#1d6fef', color: '#fff' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <p className="text-xs text-center" style={{ color: '#8b949e' }}>
              Don't have an account?{' '}
              <button type="button" onClick={() => go('register')} style={{ color: '#1d6fef' }}>Create Account</button>
            </p>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={sendLink} className="rounded-xl border p-6 space-y-4" style={{ background: '#161b22', borderColor: '#30363d' }}>
            {error && <Banner kind="error">{error}</Banner>}
            {notice && <Banner kind="ok">{notice}</Banner>}
            {devLink && (
              <Banner kind="info">
                <div className="font-semibold mb-1">Development mode</div>
                <div className="mb-2">No mail server needed here. Use this link:</div>
                <a href={devLink} className="underline break-all">{devLink}</a>
              </Banner>
            )}

            <div>
              <label className={label} style={{ color: '#8b949e' }}>USERNAME OR EMAIL</label>
              <input className={field} style={fieldStyle} value={forgotLogin} autoFocus
                onChange={e => setForgotLogin(e.target.value)} placeholder="e.g. colombo.head" required />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-60" style={{ background: '#1d6fef', color: '#fff' }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <button type="button" onClick={() => go('signin')} className="w-full text-sm" style={{ color: '#8b949e' }}>
              ← Back to sign in
            </button>
          </form>
        )}


        {mode === 'register' && (
          <div className="rounded-xl border p-6" style={{ background: '#161b22', borderColor: '#30363d' }}>
            {registered ? (
              <div className="space-y-4">
                <Banner kind="ok">{registered}</Banner>
                <p className="text-xs" style={{ color: '#8b949e' }}>
                  You will be able to sign in as <span className="font-mono" style={{ color: '#c9d1d9' }}>{reg.username}</span> once it is approved.
                </p>
                <button type="button" onClick={() => go('signin')} className="w-full py-3 rounded-lg font-semibold text-sm" style={{ background: '#1d6fef', color: '#fff' }}>
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={createAccount} className="space-y-4">
                {error && <Banner kind="error">{error}</Banner>}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={label} style={{ color: '#8b949e' }}>FULL NAME</label>
                    <input className={field} style={fieldStyle} value={reg.name} autoFocus onChange={e => setR('name', e.target.value)} required />
                  </div>
                  <div>
                    <label className={label} style={{ color: '#8b949e' }}>EMPLOYEE ID</label>
                    <input className={field} style={fieldStyle} value={reg.employeeId} onChange={e => setR('employeeId', e.target.value)} required />
                  </div>
                  <div>
                    <label className={label} style={{ color: '#8b949e' }}>USERNAME</label>
                    <input className={field} style={fieldStyle} value={reg.username} autoComplete="username"
                      onChange={e => setR('username', e.target.value)} placeholder="letters, numbers, . - _" required />
                  </div>
                  <div className="col-span-2">
                    <label className={label} style={{ color: '#8b949e' }}>OFFICIAL EMAIL</label>
                    <input type="email" className={field} style={fieldStyle} value={reg.email} onChange={e => setR('email', e.target.value)} required />
                  </div>

                  <div className="col-span-2">
                    <label className={label} style={{ color: '#8b949e' }}>ROLE YOU ARE REQUESTING</label>
                    <select className={field} style={selectStyle} value={reg.role} onChange={e => setR('role', e.target.value)}>
                      <option value="admin" disabled style={optionStyle}>Admin (assigned by an administrator)</option>
                      {ROLE_ORDER.filter(roleName => roleName !== 'admin').map(roleName => (
                        <option key={roleName} value={roleName} style={optionStyle}>
                          {formatRoleLabel(roleName, ROLE_LABELS[roleName])}
                        </option>
                      ))}
                    </select>
                  </div>

                  {regRole === 'district_head' && (
                    <div className="col-span-2">
                      <label className={label} style={{ color: '#8b949e' }}>YOUR DISTRICT</label>
                      <select className={field} style={selectStyle} value={reg.districtId} onChange={e => setR('districtId', e.target.value)}>
                        <option value="" style={optionStyle}>Select district…</option>
                        {options?.districts.map(d => <option key={d.id} value={d.id} style={optionStyle}>{d.number}. {d.name}</option>)}
                      </select>
                    </div>
                  )}
                  {regRole === 'dept_head' && (
                    <div className="col-span-2">
                      <label className={label} style={{ color: '#8b949e' }}>YOUR DEPARTMENT</label>
                      <select className={field} style={selectStyle} value={reg.departmentId} onChange={e => setR('departmentId', e.target.value)}>
                        <option value="" style={optionStyle}>Select department…</option>
                        {options?.departments
                          .filter(d => d.name !== 'LAB' && !LAB_DEPARTMENTS.includes(d.name))
                          .map(d => <option key={d.id} value={d.id} style={optionStyle}>{d.name}</option>)}
                        <optgroup label="LAB">
                          {options?.departments
                            .filter(d => LAB_DEPARTMENTS.includes(d.name))
                            .map(d => <option key={d.id} value={d.id} style={optionStyle}>{d.name}</option>)}
                        </optgroup>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className={label} style={{ color: '#8b949e' }}>PASSWORD</label>
                    <input className={field} style={fieldStyle} type={showPassword ? 'text' : 'password'} value={reg.password}
                      autoComplete="new-password" onChange={e => setR('password', e.target.value)} placeholder="At least 8 characters" required />
                  </div>
                  <div>
                    <label className={label} style={{ color: '#8b949e' }}>CONFIRM PASSWORD</label>
                    <input className={field} style={fieldStyle} type={showPassword ? 'text' : 'password'} value={reg.confirm}
                      autoComplete="new-password" onChange={e => setR('confirm', e.target.value)} required />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs" style={{ color: '#8b949e' }}>
                  <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> Show passwords
                </label>

                <div className="p-3 rounded-lg text-xs" style={{ background: '#1e2530', color: '#8b949e' }}>
                  Your account stays locked until an administrator checks your details and approves it. The administrator may change the role you asked for.
                </div>

                <button type="submit" disabled={loading || !options}
                  className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-60" style={{ background: '#2ea043', color: '#fff' }}>
                  {loading ? 'Sending…' : 'Request Account'}
                </button>
                <button type="button" onClick={() => go('signin')} className="w-full text-sm" style={{ color: '#8b949e' }}>
                  ← Back to sign in
                </button>
              </form>
            )}
          </div>
        )}

        {mode === 'reset' && (
          <form onSubmit={resetPassword} className="rounded-xl border p-6 space-y-4" style={{ background: '#161b22', borderColor: '#30363d' }}>
            {error && <Banner kind="error">{error}</Banner>}

            <div>
              <label className={label} style={{ color: '#8b949e' }}>NEW PASSWORD</label>
              <input className={field} style={fieldStyle} type={showPassword ? 'text' : 'password'} value={newPassword}
                autoComplete="new-password" autoFocus onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" required />
            </div>
            <div>
              <label className={label} style={{ color: '#8b949e' }}>CONFIRM NEW PASSWORD</label>
              <input className={field} style={fieldStyle} type={showPassword ? 'text' : 'password'} value={confirmPassword}
                autoComplete="new-password" onChange={e => setConfirmPassword(e.target.value)} placeholder="Type it again" required />
            </div>
            <label className="flex items-center gap-2 text-xs" style={{ color: '#8b949e' }}>
              <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> Show passwords
            </label>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-60" style={{ background: '#2ea043', color: '#fff' }}>
              {loading ? 'Saving…' : 'Set New Password'}
            </button>

            <button type="button" onClick={() => { window.history.replaceState({}, '', window.location.pathname); go('signin'); }}
              className="w-full text-sm" style={{ color: '#8b949e' }}>
              ← Back to sign in
            </button>
          </form>
        )}

        {SHOW_DEMO && mode === 'signin' && (
          <div className="mt-6 rounded-xl border p-4" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: '#8b949e', letterSpacing: '0.08em' }}>DEMO ACCOUNTS</div>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map(account => (
                <button key={account.username} type="button" onClick={() => void signIn(account.username, account.password)}
                  className="flex items-center justify-between text-xs px-3 py-2 rounded border text-left"
                  style={{ borderColor: '#30363d', color: '#c9d1d9' }}>
                  <span>{account.label}</span>
                  <span className="font-mono" style={{ color: '#8b949e' }}>{account.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
