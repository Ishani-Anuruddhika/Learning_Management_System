import { useCallback, useEffect, useState } from 'react';
import type { AppUser, Department, District, RoleInfo } from '../types';
import { api, errorMessage } from '../api';
import { ErrorBanner, Modal, PageHeader, inputClass, inputStyle } from '../components/ui';

interface Props {
  departments: Department[];
  districts: District[];
  currentUserId: string;
}

interface Form {
  name: string; username: string; email: string; employeeId: string; title: string;
  roleId: string; departmentId: string; districtId: string; password: string; isActive: boolean;
}

const ROLE_ORDER = ['admin', 'dept_head', 'district_head', 'district_coordinator', 'head_accounts', 'store_officer'] as const;
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

const EMPTY: Form = {
  name: '', username: '', email: '', employeeId: '', title: '',
  roleId: '', departmentId: '', districtId: '', password: '', isActive: true,
};

export default function Users({ departments, districts, currentUserId }: Props) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const orderedRoles = [...roles].sort((a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name));
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; id: string } | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([api.get<AppUser[]>('/users'), api.get<RoleInfo[]>('/roles')]);
      setUsers(u);
      setRoles(r);
      setLoadError('');
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const roleName = roles.find(r => r.id === form.roleId)?.name;
  const pendingCount = users.filter(u => u.registrationStatus === 'pending').length;
  const sorted = [...users].sort((a, b) =>
    Number(b.registrationStatus === 'pending') - Number(a.registrationStatus === 'pending') || a.name.localeCompare(b.name));

  function openCreate() {
    setForm({ ...EMPTY, roleId: orderedRoles[0]?.id ?? '' });
    setError('');
    setModal({ mode: 'create' });
  }

  function openEdit(u: AppUser) {
    setForm({
      name: u.name, username: u.username, email: u.email ?? '', employeeId: u.employeeId ?? '', title: u.title ?? '',
      roleId: roles.find(r => r.name === u.role)?.id ?? '', departmentId: u.departmentId ?? '',
      districtId: u.districtId ?? '', password: '', isActive: u.isActive,
    });
    setError('');
    setModal({ mode: 'edit', id: u.id });
  }

  async function save() {
    if (!modal) return;
    setBusy(true);
    setError('');
    const payload = {
      name: form.name, username: form.username, email: form.email || null, employeeId: form.employeeId || null,
      title: form.title || null, roleId: Number(form.roleId),
      departmentId: roleName === 'dept_head' && form.departmentId ? Number(form.departmentId) : null,
      districtId: roleName === 'district_head' && form.districtId ? Number(form.districtId) : null,
    };
    try {
      if (modal.mode === 'create') await api.post('/users', { ...payload, password: form.password });
      else await api.put(`/users/${modal.id}`, { ...payload, isActive: form.isActive });
      await load();
      setModal(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(u: AppUser) {
    const password = prompt(`New password for ${u.name} (min 8 characters)`);
    if (!password) return;
    try {
      await api.post(`/users/${u.id}/reset-password`, { password });
      alert('Password reset. The user has been signed out everywhere.');
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function decide(u: AppUser, action: 'approve' | 'reject') {
    if (action === 'reject' && !confirm(`Reject the account request from ${u.name}?`)) return;
    try {
      await api.post(`/users/${u.id}/${action}`);
      await load();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function toggleActive(u: AppUser) {
    try {
      await api.put(`/users/${u.id}`, {
        name: u.name, username: u.username, email: u.email, employeeId: u.employeeId, title: u.title,
        roleId: Number(roles.find(r => r.name === u.role)?.id),
        departmentId: u.departmentId ? Number(u.departmentId) : null,
        districtId: u.districtId ? Number(u.districtId) : null,
        isActive: !u.isActive,
      });
      await load();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const label = 'block text-xs mb-1';

  return (
    <div>
      <PageHeader
        eyebrow="ADMIN" title="Users"
        subtitle="Create accounts for district heads, department heads and the approval chain"
        action={<button onClick={openCreate} className="px-4 py-2 rounded text-sm font-semibold" style={{ background: '#1d6fef', color: '#fff' }}>+ Add User</button>}
      />
      <ErrorBanner message={loadError} />
      {pendingCount > 0 && (
        <div className="mb-4 px-3 py-2 rounded text-sm border" style={{ background: '#f0a42812', borderColor: '#f0a42840', color: '#f0a428' }}>
          {pendingCount} account request{pendingCount > 1 ? 's' : ''} waiting for your approval. Check the details (use Edit to correct the role or organisation), then Approve or Reject.
        </div>
      )}

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#30363d' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#0d1117' }}>
              {['Name', 'Username', 'Role', 'Assigned To', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#8b949e', borderBottom: '1px solid #30363d' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #30363d' }}>
                <td className="px-4 py-3 font-medium" style={{ color: '#c9d1d9' }}>{u.name}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1d6fef' }}>{u.username}</td>
                <td className="px-4 py-3 text-xs" style={{ color: '#8b949e' }}>{formatRoleLabel(u.role, u.roleLabel)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: '#8b949e' }}>{u.assignedTo ?? '—'}</td>
                <td className="px-4 py-3">
                  {(() => {
                    const st = u.registrationStatus === 'pending' ? { t: 'Pending approval', c: '#f0a428' }
                      : u.registrationStatus === 'rejected' ? { t: 'Rejected', c: '#da3633' }
                      : u.isActive ? { t: 'Active', c: '#2ea043' } : { t: 'Disabled', c: '#da3633' };
                    return <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: `${st.c}20`, color: st.c }}>{st.t}</span>;
                  })()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(u)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Edit</button>
                    {u.registrationStatus !== 'approved' ? (
                      <>
                        <button onClick={() => void decide(u, 'approve')} className="text-xs px-2 py-1 rounded font-semibold" style={{ background: '#2ea043', color: '#fff' }}>Approve</button>
                        {u.registrationStatus === 'pending' && (
                          <button onClick={() => void decide(u, 'reject')} className="text-xs px-2 py-1 rounded border" style={{ borderColor: '#da363330', color: '#da3633' }}>Reject</button>
                        )}
                      </>
                    ) : (
                    <button onClick={() => void resetPassword(u)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Reset password</button>
                    )}
                    {u.registrationStatus === 'approved' && u.id !== currentUserId && (
                      <button onClick={() => void toggleActive(u)} className="text-xs px-2 py-1 rounded border"
                        style={{ borderColor: u.isActive ? '#da363330' : '#2ea04330', color: u.isActive ? '#da3633' : '#2ea043' }}>
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loadError && <div className="text-center py-10 text-sm" style={{ color: '#8b949e' }}>No users</div>}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Add User' : 'Edit User'} onClose={() => setModal(null)}>
          <ErrorBanner message={error} />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={label} style={{ color: '#8b949e' }}>Full name</label>
              <input className={inputClass} style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className={label} style={{ color: '#8b949e' }}>Username</label>
              <input className={inputClass} style={inputStyle} value={form.username} onChange={e => set('username', e.target.value)} />
            </div>
            <div>
              <label className={label} style={{ color: '#8b949e' }}>Employee ID</label>
              <input className={inputClass} style={inputStyle} value={form.employeeId} onChange={e => set('employeeId', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label} style={{ color: '#8b949e' }}>Official email</label>
              <input type="email" className={inputClass} style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label} style={{ color: '#8b949e' }}>Job title (shown in the sidebar)</label>
              <input className={inputClass} style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label} style={{ color: '#8b949e' }}>Role</label>
              <select className={inputClass} style={inputStyle} value={form.roleId} onChange={e => set('roleId', e.target.value)}>
                {orderedRoles.map(r => <option key={r.id} value={r.id}>{formatRoleLabel(r.name, r.label)}</option>)}
              </select>
            </div>
            {roleName === 'dept_head' && (
              <div className="col-span-2">
                <label className={label} style={{ color: '#8b949e' }}>Department</label>
                <select className={inputClass} style={inputStyle} value={form.departmentId} onChange={e => set('departmentId', e.target.value)}>
                  <option value="">Select…</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {roleName === 'district_head' && (
              <div className="col-span-2">
                <label className={label} style={{ color: '#8b949e' }}>District</label>
                <select className={inputClass} style={inputStyle} value={form.districtId} onChange={e => set('districtId', e.target.value)}>
                  <option value="">Select…</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.number}. {d.name}</option>)}
                </select>
              </div>
            )}
            {modal.mode === 'create' && (
              <div className="col-span-2">
                <label className={label} style={{ color: '#8b949e' }}>Initial password (min 8 characters)</label>
                <input type="password" className={inputClass} style={inputStyle} value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Cancel</button>
            <button onClick={() => void save()} disabled={busy || !form.name || !form.username || !form.roleId || (modal.mode === 'create' && form.password.length < 8)}
              className="px-4 py-2 text-sm rounded font-semibold disabled:opacity-60" style={{ background: '#1d6fef', color: '#fff' }}>
              {modal.mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
