export type ApprovalStatus =
  | 'pending'             // submitted, awaiting first approval
  | 'coord_approved'      // district coordinator approved (district flow only)
  | 'accounts_approved'   // head of accounts approved
  | 'issued'              // store officer issued stock
  | 'rejected';

export type UserRole =
  | 'admin'
  | 'district_head'
  | 'dept_head'
  | 'district_coordinator'
  | 'head_accounts'
  | 'store_officer';

/** The signed-in user, as returned by the API. The UI is gated on `permissions`, not on role names. */
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  title: string | null;
  role: UserRole;
  roleLabel: string;
  districtId?: string | null;
  deptId?: string | null;
  permissions: string[];
}

export interface ApprovalStep {
  role: string;
  label: string;
  approvedBy: string;
  date: string;
  notes?: string | null;
  action: 'approved' | 'rejected';
}

export interface StockBatch {
  id: string;
  batchNo: string;
  receivedDate: string;
  quantity: number;
  issuedQty: number;
  unitCost: number;
  expiryDate?: string | null;
}

export interface StockItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  batches: StockBatch[];
}

export interface Department {
  id: string;
  name: string;
  head: string;
  email: string;
  phone: string;
}

export interface District {
  id: string;
  number: number;
  name: string;
  head: string;
  email: string;
  phone: string;
}

export interface RequestItem {
  stockItemId: string;
  requestedQty: number;
  issuedQty: number;
}

export interface StockRequest {
  id: string;
  requestNo: string;
  requestDate: string;
  requesterType: 'internal' | 'external';
  departmentId?: string | null;
  districtId?: string | null;
  requesterName: string;
  items: RequestItem[];
  status: ApprovalStatus;
  approvalHistory: ApprovalStep[];
  notes?: string | null;
  /** True when the signed-in user may approve / reject / issue this request right now. */
  canAct: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'receipt' | 'issue';
  itemId: string;
  itemName: string;
  batchNo: string;
  quantity: number;
  requestNo?: string | null;
  reference: string;
}

export interface DashboardData {
  totalItems: number;
  totalValue: number;
  pending: number;
  issued: number;
  totalRequests: number;
  lowStock: number;
  lowStockItems: { id: string; code: string; name: string; unit: string; stock: number; minStock: number }[];
  recentTransactions: Transaction[];
}

export interface AppNotification {
  id: string;
  message: string;
  isRead: boolean;
  requestId: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  unread: number;
  items: AppNotification[];
}

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  title: string | null;
  role: UserRole;
  roleLabel: string;
  departmentId: string | null;
  districtId: string | null;
  assignedTo: string | null;
  isActive: boolean;
  registrationStatus: 'approved' | 'pending' | 'rejected';
}

export interface RoleInfo {
  id: string;
  name: UserRole;
  label: string;
}

export type Page =
  | 'dashboard' | 'stock' | 'departments' | 'districts' | 'approvals'
  | 'transactions' | 'reports' | 'users' | 'notifications' | 'settings';

export interface RegisterOptions {
  roles: { id: string; name: UserRole; label: string }[];
  departments: { id: string; name: string }[];
  districts: { id: string; number: number; name: string }[];
}
