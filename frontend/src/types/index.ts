// ============================================
// 基础类型 - 从 Vue 项目迁移
// ============================================

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

// Auth 类型
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  token?: string
  username?: string
  is_admin?: boolean
  message?: string
}

// 用户类型
export interface User {
  id: number
  username: string
  is_admin: boolean
  created_at: string
}

// Docx 类型
export interface ProcessResponse {
  success: boolean
  mode?: string
  data?: string
  filename?: string
  message?: string
  balance?: number
  total_balance?: number
  missing_fields?: string[]
}

export interface MissingFieldsResponse {
  success: boolean
  missing_fields: string[]
  message?: string
}

export interface TokenBalance {
  balance: number
  total_balance: number
}

// ============================================
// Admin 类型 - 新增/扩展
// ============================================

export interface AdminStats {
  total_users: number
  total_tokens: number
  total_logs: number
}

export interface LogEntry {
  id: number
  username: string
  action: string
  details?: string
  ip_address?: string
  status?: string
  submitted_data?: Record<string, unknown>
  created_at: string
}

export interface FeedbackEntry {
  id: number
  username: string
  rating: number
  content?: string
  title?: string
  description?: string
  feedback_type?: string
  status?: string
  contact_email?: string
  screenshot_path?: string
  admin_reply?: string
  created_at: string
}

// 临时账号
export interface TempAccount {
  username: string
  password: string
  created_at: string
  expires_at?: string
  days_remaining?: number
  is_expired?: boolean
}

// 文件记录
export interface FileRecord {
  id: number
  username: string
  file_type: string
  original_filename: string
  file_size: number
  public_url: string
  created_at: string
}

// 简单用户 (Token 管理用)
export interface SimpleUser extends User {
  token?: string
  balance?: number
}

// ============================================
// 查询参数类型
// ============================================

export interface LogsQuery {
  username?: string
  operation?: string
  limit?: number
}

export interface FilesQuery {
  file_type?: string
  username?: string
  limit?: number
}

export interface FeedbacksQuery {
  feedback_type?: string
  status?: string
  limit?: number
}

export interface TempAccountsQuery {
  include_expired?: boolean
}

// ============================================
// Server Action 返回类型
// ============================================

export interface TokenInfo {
  token: string
  link: string
  balance: number
  expires_at: string
}

export interface GenerateTokensResult {
  tokens: TokenInfo[]
}

export interface CreateTempAccountResult {
  account: TempAccount
}

export interface BatchDeleteResult {
  deleted_count: number
}
