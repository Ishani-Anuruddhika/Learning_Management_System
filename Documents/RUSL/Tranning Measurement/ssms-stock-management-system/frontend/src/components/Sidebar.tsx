import type { Page, AuthUser } from '../types';

interface SidebarProps {
  page: Page;
  setPage: (p: Page) => void;
  pendingCount: number;
  unreadCount: number;
  auth: AuthUser;
  onLogout: () => void;
  onChangePassword: () => void;
}

interface NavDef {
  id: Page;
  icon: string;
  label: (a: AuthUser) => string;
  /** Shown when the user holds ANY of these permissions. Empty = always shown. */
  any: string[];
}

const has = (a: AuthUser, p: string) => a.permissions.includes(p);

const NAV: NavDef[] = [
  { id: 'dashboard', icon: '▦', label: () => 'Dashboard', any: ['approve_accounts', 'issue_stock', 'manage_users'] },
  {
    id: 'approvals', icon: '◫',
    label: a => has(a, 'create_request') ? 'My Requests'
      : has(a, 'issue_stock') ? 'Issue Stock'
      : has(a, 'approve_coordinator') || has(a, 'approve_accounts') ? 'Approval Queue'
      : 'All Requests',
    any: ['create_request', 'view_own_requests', 'view_all_requests', 'approve_coordinator'],
  },
  { id: 'stock', icon: '◫', label: () => 'Stock Items', any: ['view_all_batches', 'manage_items', 'receive_stock'] },
  { id: 'departments', icon: '⬡', label: () => 'Departments', any: ['manage_departments'] },
  { id: 'districts', icon: '◈', label: () => 'Districts (24)', any: ['manage_districts'] },
  { id: 'transactions', icon: '⇌', label: () => 'Transactions', any: ['view_transactions'] },
  { id: 'reports', icon: '⊞', label: () => 'Reports', any: ['generate_stock_report', 'generate_annual_report'] },
  { id: 'users', icon: '☺', label: () => 'Users', any: ['manage_users'] },
  { id: 'settings', icon: '⚙', label: () => 'Settings', any: ['manage_settings'] },
  { id: 'notifications', icon: '✉', label: () => 'Notifications', any: [] },
];

const ROLE_COLOR: Record<string, string> = {
  admin: '#db61a2',
  district_head: '#1f8faa',
  dept_head: '#1d6fef',
  district_coordinator: '#a855f7',
  head_accounts: '#f0a428',
  store_officer: '#2ea043',
};

/** Pages this user may open (used by the sidebar and as a guard in App). */
export const allowedPages = (a: AuthUser): Page[] =>
  NAV.filter(n => n.any.length === 0 || n.any.some(p => has(a, p))).map(n => n.id);

export default function Sidebar({ page, setPage, pendingCount, unreadCount, auth, onLogout, onChangePassword }: SidebarProps) {
  const allowed = allowedPages(auth);
  const nav = NAV.filter(n => allowed.includes(n.id));
  const roleColor = ROLE_COLOR[auth.role] || '#1d6fef';

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 flex flex-col z-10" style={{ background: '#161b22', borderRight: '1px solid #30363d' }}>
      <div className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${roleColor}, transparent)` }} />
        <div className="px-5 py-5 border-b" style={{ borderColor: '#30363d' }}>
          <div className="text-xs font-mono mb-1" style={{ color: roleColor, letterSpacing: '0.12em' }}>DMUSS</div>
          <div className="font-serif font-bold text-sm leading-tight" style={{ color: '#c9d1d9' }}>Stock Control System</div>
          <div className="text-xs mt-1" style={{ color: '#8b949e' }}>v1.0</div>
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {nav.map(item => {
          const active = page === item.id;
          const badge = item.id === 'approvals' ? pendingCount : item.id === 'notifications' ? unreadCount : 0;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left text-sm transition-all"
              style={{
                background: active ? `${roleColor}12` : 'transparent',
                color: active ? '#c9d1d9' : '#8b949e',
                borderLeft: active ? `2px solid ${roleColor}` : '2px solid transparent',
              }}
            >
              <span className="text-base w-5 text-center" style={{ color: active ? roleColor : '#8b949e' }}>{item.icon}</span>
              <span className="font-medium">{item.label(auth)}</span>
              {badge > 0 && (
                <span className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: '#f0a428', color: '#0d1117' }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t" style={{ borderColor: '#30363d' }}>
        <div className="text-xs mb-0.5" style={{ color: '#8b949e' }}>Signed in as</div>
        <div className="text-sm font-semibold" style={{ color: '#c9d1d9' }}>{auth.name}</div>
        <div className="text-xs mt-0.5 mb-3 leading-tight" style={{ color: roleColor }}>{auth.title || auth.roleLabel}</div>
        <button
          onClick={onChangePassword}
          className="w-full text-xs py-1.5 rounded border text-center mb-2 transition-all"
          style={{ borderColor: '#30363d', color: '#8b949e', background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1e2530')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Change Password
        </button>
        <button
          onClick={onLogout}
          className="w-full text-xs py-1.5 rounded border text-center transition-all"
          style={{ borderColor: '#da363340', color: '#da3633', background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#da363315')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
