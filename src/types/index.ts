// ================================
// 完全型安全システム - 統一型定義
// ================================

// Base Types
export interface DatabaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// User & Auth Types
export interface User {
  id: string
  email: string | undefined  // Supabaseのuser.emailはoptional
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}

// Store & Membership Types
export type UserRole = 'owner' | 'manager' | 'staff'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface Store extends DatabaseEntity {
  name: string
  owner_id: string
  description?: string
}

export interface StoreMember extends DatabaseEntity {
  store_id: string
  user_id: string
  role: UserRole
  invited_by: string
  joined_at: string
}

export interface StoreInvitation extends DatabaseEntity {
  store_id: string
  email: string
  role: UserRole
  token: string
  expires_at: string
  status: InvitationStatus
  invited_by: string
  store?: Store // Joined data
}

// Store with user role information
export interface StoreWithRole extends Store {
  user_role: UserRole
  joined_at: string
}

// Sales Data Types
export interface Sale extends DatabaseEntity {
  date: string
  day_of_week: string
  group_count: number
  total_sales: number
  card_sales?: number | null
  paypay_sales?: number | null
  cash_sales?: number | null
  expenses?: number | null
  profit?: number | null
  average_spend?: number | null
  event?: string | null
  notes?: string | null
  updated_by?: string | null
  user_id: string
  store_id?: string | null // For store-based access
}

export interface SaleFormData {
  date: string
  groupCount: string
  totalSales: string
  cardSales: string
  paypaySales: string
  expenses: string
  event: string
  notes: string
  updatedBy: string
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  success: boolean
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, unknown>
}

// RLS Diagnostic Types
export interface RLSDiagnosticResult {
  success: boolean
  explicitCount: number
  rlsCount: number
  isMatching: boolean
  rlsUserIds: string[]
  hasValidUserIds: boolean
  currentUserId: string
  error: string | null
  timestamp: string
  rawData?: {
    explicit: Sale[]
    rls: Sale[]
  }
}

export interface RLSPolicyInfo {
  success: boolean
  policies: PolicyDetails[]
  error: string | null
  user: Pick<User, 'id' | 'email'> | null
}

export interface PolicyDetails {
  schemaname: string
  tablename: string
  policyname: string
  permissive: string
  roles: string[]
  cmd: string
  qual: string | null
  with_check: string | null
}

// Component Props Types
export interface StoreSelectorProps {
  currentStoreId: string | null
  onStoreChange: (storeId: string | null) => void
  disabled?: boolean
}

export interface InviteModalProps {
  storeId: string
  storeName: string
  onClose: () => void
  onSuccess: (inviteLink: string) => void
}

export interface InvitePageState {
  loading: boolean
  error: string | null
  success: boolean
  user: User | null
  invitation: StoreInvitation | null
}

// System State Types
export interface SystemState {
  darkMode: boolean
  activeTab: string
  isConnected: boolean
  isLoading: boolean
  lastSync: Date | null
  showDebugTools: boolean
}

export interface InviteSystemState {
  currentStoreId: string | null
  showInviteModal: boolean
  showStoreFeatures: boolean
}

// Database Table Types (for RPC calls)
export interface DatabaseTables {
  sales: Sale
  stores: Store
  store_members: StoreMember
  store_invitations: StoreInvitation
  profiles: User
}

// Utility Types
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

// Form Validation Types
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export interface FormField<T> {
  value: T
  error?: string
  touched: boolean
}

// Real-time Types
export interface RealtimePayload<T = unknown> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: T
  old?: T
  errors: unknown[]
}

export type RealtimeCallback<T = unknown> = (payload: RealtimePayload<T>) => void

// Store API Types
export interface CreateStoreData {
  name: string
  description?: string
}

export interface CreateInvitationData {
  storeId: string
  email: string
  role: UserRole
}

export interface AcceptInvitationResponse {
  storeId: string
  role: UserRole
}