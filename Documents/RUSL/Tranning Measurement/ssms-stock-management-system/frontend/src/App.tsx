import { useCallback, useEffect, useState } from 'react';
import type {
  AuthUser, DashboardData, Department, District, NotificationsResponse,
  Page, StockItem, StockRequest, Transaction,
} from './types';
import { api, errorMessage, getToken, setToken, setUnauthorizedHandler } from './api';
import Sidebar, { allowedPages } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import StockItems from './pages/StockItems';
import Departments from './pages/Departments';
import Districts from './pages/Districts';
import Approvals from './pages/Approvals';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import ChangePassword from './components/ChangePassword';

interface AppData {
  items: StockItem[];
  categories: string[];
  requests: StockRequest[];
  departments: Department[];
  districts: District[];
  transactions: Transaction[];
  dashboard: DashboardData | null;
  notifications: NotificationsResponse;
}

const EMPTY: AppData = {
  items: [], categories: [], requests: [], departments: [], districts: [],
  transactions: [], dashboard: null, notifications: { unread: 0, items: [] },
};

const REQUEST_PERMISSIONS = ['view_own_requests', 'view_all_requests', 'approve_coordinator', 'approve_accounts', 'issue_stock'];

function landingPage(user: AuthUser): Page {
  const pages = allowedPages(user);
  const wantsDashboard = ['store_officer', 'head_accounts', 'admin'].includes(user.role);
  return wantsDashboard && pages.includes('dashboard') ? 'dashboard' : pages.includes('approvals') ? 'approvals' : pages[0];
}

export default function App() {
  const [auth, setAuth] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState<boolean>(() => getToken() !== null);
  const [page, setPage] = useState<Page>('approvals');
  const [data, setData] = useState<AppData>(EMPTY);
  const [loadError, setLoadError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const loadAll = useCallback(async (user: AuthUser) => {
    const can = (p: string) => user.permissions.includes(p);
    try {
      const [items, categories, departments, districts, requests, transactions, dashboard, notifications] = await Promise.all([
        can('view_stock') ? api.get<StockItem[]>('/items') : Promise.resolve([] as StockItem[]),
        api.get<string[]>('/categories'),
        api.get<Department[]>('/departments'),
        api.get<District[]>('/districts'),
        REQUEST_PERMISSIONS.some(can) ? api.get<StockRequest[]>('/requests') : Promise.resolve([] as StockRequest[]),
        can('view_transactions') ? api.get<Transaction[]>('/transactions') : Promise.resolve([] as Transaction[]),
        api.get<DashboardData>('/dashboard'),
        api.get<NotificationsResponse>('/notifications'),
      ]);
      setData({ items, categories, departments, districts, requests, transactions, dashboard, notifications });
      setLoadError('');
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, []);

  const startSession = useCallback(async (user: AuthUser) => {
    setAuth(user);
    setPage(landingPage(user));
    await loadAll(user);
  }, [loadAll]);

  const endSession = useCallback(() => {
    setToken(null);
    setAuth(null);
    setData(EMPTY);
  }, []);

  // Restore the session after a page refresh.
  useEffect(() => {
    setUnauthorizedHandler(endSession);
    if (getToken() === null) return;
    api.get<AuthUser>('/me')
      .then(startSession)
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
    return () => setUnauthorizedHandler(null);
  }, [startSession, endSession]);

  const reload = useCallback(async () => {
    if (auth) await loadAll(auth);
  }, [auth, loadAll]);

  async function logout() {
    try { await api.post('/logout'); } catch { /* token may already be invalid */ }
    endSession();
  }

  if (booting) {
    return <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: '#0d1117', color: '#8b949e' }}>Loading…</div>;
  }

  if (!auth) return <Login onLogin={user => void startSession(user)} />;

  const allowed = allowedPages(auth);
  const current: Page = allowed.includes(page) ? page : landingPage(auth);

  const actionable = data.requests.filter(r => r.canAct).length;
  const ownPending = auth.permissions.includes('create_request') ? data.requests.filter(r => r.status === 'pending').length : 0;

  return (
    <div className="min-h-screen" style={{ background: '#0d1117' }}>
      <Sidebar
        page={current} setPage={setPage} auth={auth} onLogout={() => void logout()} onChangePassword={() => setChangingPassword(true)}
        pendingCount={actionable || ownPending} unreadCount={data.notifications.unread}
      />
      <main className="ml-56 min-h-screen p-8">
        {loadError && (
          <div className="mb-4 px-3 py-2 rounded text-sm border" style={{ background: '#da363312', borderColor: '#da363340', color: '#da3633' }}>
            Could not load data: {loadError}
          </div>
        )}
        {current === 'dashboard' && <Dashboard data={data.dashboard} />}
        {current === 'stock' && <StockItems items={data.items} categories={data.categories} auth={auth} onChanged={reload} />}
        {current === 'departments' && <Departments departments={data.departments} onChanged={reload} />}
        {current === 'districts' && <Districts districts={data.districts} />}
        {current === 'approvals' && (
          <Approvals
            requests={data.requests} items={data.items} departments={data.departments} districts={data.districts}
            auth={auth} onChanged={reload}
          />
        )}
        {current === 'transactions' && <Transactions transactions={data.transactions} />}
        {current === 'reports' && <Reports items={data.items} requests={data.requests} auth={auth} />}
        {current === 'users' && <Users departments={data.departments} districts={data.districts} currentUserId={auth.id} />}
        {current === 'settings' && <Settings />}
        {current === 'notifications' && <Notifications notifications={data.notifications} onChanged={reload} />}
      </main>
      {changingPassword && <ChangePassword onClose={() => setChangingPassword(false)} />}
    </div>
  );
}
