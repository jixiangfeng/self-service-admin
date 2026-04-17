import { request } from '../utils/request';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  timestamp?: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  username: string;
  nickname?: string;
  avatar?: string;
  token: string;
  tokenTimeout?: number;
}

export interface UserInfo {
  id: number;
  username: string;
  nickname?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  status?: number;
  roles?: string[];
  permissions?: string[];
  createTime?: string;
}

export interface RoleOption {
  id: number;
  roleCode: string;
  roleName: string;
}

export interface UserRecord {
  id: number;
  username: string;
  nickname?: string;
  phone?: string;
  email?: string;
  status: number;
  createTime?: string;
  lastLoginTime?: string;
  roles?: RoleOption[];
}

export interface RoleRecord {
  id: number;
  roleName: string;
  roleCode: string;
  description?: string;
  sort?: number;
  status: number;
  permissionIds?: number[];
  createTime?: string;
}

export interface PermissionTreeNode {
  id: number;
  permissionName?: string;
  name?: string;
  permissionCode?: string;
  path?: string;
  children?: PermissionTreeNode[];
}

export interface DictTypeRecord {
  id: number;
  dictName: string;
  dictCode: string;
  status: number;
  remark?: string;
  createTime?: string;
}

export interface DictDataRecord {
  id: number;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort?: number;
  status: number;
  remark?: string;
}

export const authApi = {
  login: (data: LoginRequest) => request.post<ApiEnvelope<LoginResponse>>('/auth/login', data),
  logout: () => request.post<ApiEnvelope<void>>('/auth/logout'),
  getCurrentUser: () => request.get<ApiEnvelope<UserInfo>>('/auth/user/info'),
};

export const userApi = {
  page: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<UserRecord>>>('/user/page', { params }),
  add: (data: Record<string, unknown>) => request.post<ApiEnvelope<void>>('/user/add', data),
  edit: (data: Record<string, unknown>) => request.put<ApiEnvelope<void>>('/user/edit', data),
  remove: (id: number) => request.delete<ApiEnvelope<void>>(`/user/${id}`),
  changeStatus: (id: number, status: number) => request.put<ApiEnvelope<void>>(`/user/${id}/status`, undefined, { params: { status } }),
  roleList: () => request.get<ApiEnvelope<RoleOption[]>>('/user/role/list'),
};

export const roleApi = {
  page: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<RoleRecord>>>('/role/page', { params }),
  add: (data: Record<string, unknown>) => request.post<ApiEnvelope<void>>('/role/add', data),
  edit: (data: Record<string, unknown>) => request.put<ApiEnvelope<void>>('/role/edit', data),
  remove: (id: number) => request.delete<ApiEnvelope<void>>(`/role/${id}`),
  permissionTree: () => request.get<ApiEnvelope<PermissionTreeNode[]>>('/role/permission/tree'),
  permissionIds: (id: number) => request.get<ApiEnvelope<number[]>>(`/role/${id}/permissionIds`),
};

export const permissionApi = {
  tree: () => request.get<ApiEnvelope<PermissionTreeNode[]>>('/permission/tree'),
  add: (data: Record<string, unknown>) => request.post<ApiEnvelope<void>>('/permission/add', data),
  edit: (data: Record<string, unknown>) => request.put<ApiEnvelope<void>>('/permission/edit', data),
  remove: (id: number) => request.delete<ApiEnvelope<void>>(`/permission/${id}`),
};

export const dictApi = {
  typeList: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<DictTypeRecord>>>('/dict/type/list', { params }),
  typeAdd: (data: Record<string, unknown>) => request.post<ApiEnvelope<void>>('/dict/type', data),
  typeEdit: (id: number, data: Record<string, unknown>) => request.put<ApiEnvelope<void>>(`/dict/type/${id}`, data),
  typeRemove: (id: number) => request.delete<ApiEnvelope<void>>(`/dict/type/${id}`),
  dataList: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<DictDataRecord>>>('/dict/data/list', { params }),
};

export default {
  auth: authApi,
  user: userApi,
  role: roleApi,
  permission: permissionApi,
  dict: dictApi,
};
