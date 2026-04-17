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

export interface BackendUser {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface PermissionIdsPayload {
  permissionIds: number[];
}

export interface LoginResponse {
  user: BackendUser;
  token: string;
  tokenName?: string;
}

export interface UserInfo extends BackendUser {
  nickname?: string;
  roles?: string[];
  permissions?: string[];
  createTime?: string;
  updateTime?: string;
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
  avatar?: string;
  role?: string;
  status: number;
  createTime?: string;
  updateTime?: string;
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
  permissionCount?: number;
  permissionIds?: number[];
  createTime?: string;
  updateTime?: string;
}

export interface PermissionTreeNode {
  id: number;
  parentId?: number;
  permissionName?: string;
  name?: string;
  permissionCode?: string;
  permissionType?: number | string;
  path?: string;
  component?: string;
  icon?: string;
  sort?: number;
  status?: number;
  visible?: number;
  updateTime?: string;
  children?: PermissionTreeNode[];
}

export interface DictTypeRecord {
  id: number;
  dictName: string;
  dictCode: string;
  status: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface DictDataRecord {
  id: number;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort?: number;
  status: number;
  remark?: string;
  updateTime?: string;
}

interface BackendRole {
  id: number;
  name: string;
  code: string;
  description?: string;
  sort?: number;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
  permissionCount?: number;
}

interface BackendPermission {
  id: number;
  parentId?: number;
  name: string;
  code: string;
  type?: string;
  path?: string;
  icon?: string;
  sort?: number;
  updatedAt?: string;
}

interface BackendMenu {
  id: number;
  parentId?: number;
  name: string;
  path?: string;
  component?: string;
  icon?: string;
  sort?: number;
  visible?: number;
  status?: number;
  permission?: string;
  type?: string;
  updatedAt?: string;
  children?: BackendMenu[];
}

interface BackendDictionary {
  id: number;
  name: string;
  code: string;
  description?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendDictionaryItem {
  id: number;
  dictId: number;
  label: string;
  value: string;
  sort?: number;
  status?: number;
  remark?: string;
  updatedAt?: string;
}

const normalizeUserRecord = (user: BackendUser): UserRecord => ({
  ...user,
  status: user.status ?? 0,
  createTime: user.createdAt,
  updateTime: user.updatedAt,
  roles: user.role
    ? [
        {
          id: 0,
          roleCode: user.role,
          roleName: user.role,
        },
      ]
    : [],
});

const normalizeRoleRecord = (role: BackendRole): RoleRecord => ({
  id: role.id,
  roleName: role.name,
  roleCode: role.code,
  description: role.description,
  sort: role.sort ?? 0,
  status: role.status ?? 1,
  permissionCount: role.permissionCount ?? 0,
  createTime: role.createdAt,
  updateTime: role.updatedAt,
  permissionIds: [],
});

const normalizePermissionNode = (permission: BackendPermission): PermissionTreeNode => ({
  id: permission.id,
  parentId: permission.parentId ?? 0,
  permissionName: permission.name,
  name: permission.name,
  permissionCode: permission.code,
  path: permission.path,
  icon: permission.icon,
  sort: permission.sort ?? 0,
  updateTime: permission.updatedAt,
  children: [],
});

const buildPermissionTree = (permissions: BackendPermission[]) => {
  const nodeMap = new Map<number, PermissionTreeNode>();
  const roots: PermissionTreeNode[] = [];

  permissions
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id)
    .forEach((permission) => {
      nodeMap.set(permission.id, normalizePermissionNode(permission));
    });

  permissions.forEach((permission) => {
    const node = nodeMap.get(permission.id);

    if (!node) {
      return;
    }

    const parentId = permission.parentId ?? 0;
    if (!parentId || !nodeMap.has(parentId)) {
      roots.push(node);
      return;
    }

    nodeMap.get(parentId)?.children?.push(node);
  });

  return roots;
};

const normalizeMenuRecord = (menu: BackendMenu): PermissionTreeNode => ({
  id: menu.id,
  parentId: menu.parentId ?? 0,
  permissionName: menu.name,
  permissionCode: menu.permission,
  permissionType: menu.type,
  path: menu.path,
  component: menu.component,
  icon: menu.icon,
  sort: menu.sort ?? 0,
  status: menu.status ?? 1,
  visible: menu.visible ?? 1,
  updateTime: menu.updatedAt,
  name: menu.name,
  children: (menu.children || []).map(normalizeMenuRecord),
});

const normalizeDictionaryRecord = (dictionary: BackendDictionary): DictTypeRecord => ({
  id: dictionary.id,
  dictName: dictionary.name,
  dictCode: dictionary.code,
  status: dictionary.status ?? 1,
  remark: dictionary.description,
  createTime: dictionary.createdAt,
  updateTime: dictionary.updatedAt,
});

const normalizeDictionaryItemRecord = (item: BackendDictionaryItem, dictCode: string): DictDataRecord => ({
  id: item.id,
  dictCode,
  dictLabel: item.label,
  dictValue: item.value,
  dictSort: item.sort ?? 0,
  status: item.status ?? 1,
  remark: item.remark,
  updateTime: item.updatedAt,
});

const normalizePageParams = (params: Record<string, unknown> = {}) => {
  const { pageNum, pageSize, current, size, ...rest } = params;

  return {
    ...rest,
    current: current ?? pageNum ?? 1,
    size: size ?? pageSize ?? 10,
  };
};

const sanitizeUserPayload = (data: Record<string, unknown>) => {
  const allowedKeys = ['username', 'email', 'phone', 'avatar', 'role', 'status'];

  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => allowedKeys.includes(key) && value !== undefined)
  );
};

const sanitizeRolePayload = (data: Record<string, unknown>) => {
  const payload = {
    name: data.roleName,
    code: data.roleCode,
    description: data.description,
    sort: data.sort,
    status: data.status,
  };

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
};

const sanitizePermissionIds = (permissionIds: unknown): number[] => {
  if (!Array.isArray(permissionIds)) {
    return [];
  }

  return permissionIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
};

const normalizeMenuType = (value: unknown) => {
  if (value === 'M' || value === 0 || value === '0') return 'M';
  if (value === 'F' || value === 2 || value === '2') return 'F';
  return 'C';
};

const sanitizeMenuPayload = (data: Record<string, unknown>) => {
  const payload = {
    parentId: data.parentId ?? 0,
    name: data.permissionName,
    permission: data.permissionCode,
    type: normalizeMenuType(data.permissionType),
    path: data.path,
    component: data.component,
    icon: data.icon,
    sort: data.sort ?? 0,
    status: data.status ?? 1,
    visible: data.visible ?? 1,
  };

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
};

const sanitizeDictionaryPayload = (data: Record<string, unknown>) => {
  const payload = {
    name: data.dictName,
    code: data.dictCode,
    description: data.remark,
    status: data.status,
  };

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
};

export const authApi = {
  login: (data: LoginRequest) => request.post<ApiEnvelope<LoginResponse>>('/auth/login', data),
  logout: () => request.post<ApiEnvelope<void>>('/auth/logout'),
  getCurrentUser: async () => {
    const response = await request.get<ApiEnvelope<BackendUser>>('/auth/me');

    return {
      ...response,
      data: {
        ...response.data,
        createTime: response.data.createdAt,
        updateTime: response.data.updatedAt,
      },
    };
  },
};

export const userApi = {
  page: async (params: Record<string, unknown>) => {
    const response = await request.get<ApiEnvelope<PageResult<BackendUser>>>('/users', {
      params: normalizePageParams(params),
    });

    return {
      ...response,
      data: {
        ...response.data,
        records: response.data.records.map(normalizeUserRecord),
      },
    };
  },
  add: (data: Record<string, unknown>) => request.post<ApiEnvelope<void>>('/users', sanitizeUserPayload(data)),
  edit: (data: Record<string, unknown>) => {
    const { id, ...rest } = data;

    if (!id) {
      return Promise.reject(new Error('缺少用户 ID'));
    }

    return request.put<ApiEnvelope<void>>(`/users/${id}`, sanitizeUserPayload(rest));
  },
  remove: (id: number) => request.delete<ApiEnvelope<void>>(`/users/${id}`),
  changeStatus: (id: number, status: number) => request.put<ApiEnvelope<void>>(`/users/${id}/status`, { status }),
  roleList: async () => {
    const response = await request.get<ApiEnvelope<PageResult<RoleRecord>>>('/roles', {
      params: { current: 1, size: 1000 },
    });

    return {
      ...response,
      data: response.data.records.map((role) => ({
        id: role.id,
        roleCode: role.roleCode,
        roleName: role.roleName,
      })),
    };
  },
};

export const roleApi = {
  page: async (params: Record<string, unknown>) => {
    const response = await request.get<ApiEnvelope<PageResult<BackendRole>>>('/roles', {
      params: normalizePageParams(params),
    });

    return {
      ...response,
      data: {
        ...response.data,
        records: response.data.records.map(normalizeRoleRecord),
      },
    };
  },
  add: async (data: Record<string, unknown>) => {
    const permissionIds = sanitizePermissionIds(data.permissionIds);
    const response = await request.post<ApiEnvelope<BackendRole>>('/roles', sanitizeRolePayload(data));

    if (response.data?.id) {
      await request.put<ApiEnvelope<void>>(`/roles/${response.data.id}/permission-ids`, {
        permissionIds,
      } satisfies PermissionIdsPayload);
    }

    return {
      ...response,
      data: normalizeRoleRecord(response.data),
    };
  },
  edit: (data: Record<string, unknown>) => {
    const { id, permissionIds, ...rest } = data;

    if (!id) {
      return Promise.reject(new Error('缺少角色 ID'));
    }

    return request
      .put<ApiEnvelope<void>>(`/roles/${id}`, sanitizeRolePayload(rest))
      .then(async (response) => {
        await request.put<ApiEnvelope<void>>(`/roles/${id}/permission-ids`, {
          permissionIds: sanitizePermissionIds(permissionIds),
        } satisfies PermissionIdsPayload);

        return response;
      });
  },
  remove: (id: number) => request.delete<ApiEnvelope<void>>(`/roles/${id}`),
  permissionTree: async () => {
    const response = await request.get<ApiEnvelope<BackendPermission[]>>('/permissions');

    return {
      ...response,
      data: buildPermissionTree(response.data),
    };
  },
  permissionIds: (id: number) => request.get<ApiEnvelope<number[]>>(`/roles/${id}/permission-ids`),
};

export const permissionApi = {
  tree: async () => {
    const response = await request.get<ApiEnvelope<BackendPermission[]>>('/permissions');

    return {
      ...response,
      data: buildPermissionTree(response.data),
    };
  },
  add: () => Promise.reject(new Error('当前后端未提供权限新增接口')),
  edit: () => Promise.reject(new Error('当前后端未提供权限编辑接口')),
  remove: () => Promise.reject(new Error('当前后端未提供权限删除接口')),
};

export const menuApi = {
  tree: async () => {
    const response = await request.get<ApiEnvelope<BackendMenu[]>>('/menus');

    return {
      ...response,
      data: response.data.map(normalizeMenuRecord),
    };
  },
  add: (data: Record<string, unknown>) => request.post<ApiEnvelope<void>>('/menus', sanitizeMenuPayload(data)),
  edit: (data: Record<string, unknown>) => {
    const { id, ...rest } = data;

    if (!id) {
      return Promise.reject(new Error('缺少菜单 ID'));
    }

    return request.put<ApiEnvelope<void>>(`/menus/${id}`, sanitizeMenuPayload(rest));
  },
  remove: (id: number) => request.delete<ApiEnvelope<void>>(`/menus/${id}`),
};

export const dictApi = {
  typeList: async (params: Record<string, unknown>) => {
    const response = await request.get<ApiEnvelope<PageResult<BackendDictionary>>>('/dictionaries', {
      params: normalizePageParams(params),
    });

    return {
      ...response,
      data: {
        ...response.data,
        records: response.data.records.map(normalizeDictionaryRecord),
      },
    };
  },
  typeAdd: (data: Record<string, unknown>) => request.post<ApiEnvelope<void>>('/dictionaries', sanitizeDictionaryPayload(data)),
  typeEdit: (id: number, data: Record<string, unknown>) => request.put<ApiEnvelope<void>>(`/dictionaries/${id}`, sanitizeDictionaryPayload(data)),
  typeRemove: (id: number) => request.delete<ApiEnvelope<void>>(`/dictionaries/${id}`),
  dataList: async (params: Record<string, unknown>) => {
    const dictCode = String(params.dictCode || '');
    const response = await request.get<ApiEnvelope<BackendDictionaryItem[]>>(`/dictionary-items/code/${dictCode}`);

    return {
      ...response,
      data: {
        records: response.data.map((item) => normalizeDictionaryItemRecord(item, dictCode)),
        total: response.data.length,
        size: response.data.length,
        current: 1,
        pages: 1,
      },
    };
  },
};

export default {
  auth: authApi,
  user: userApi,
  role: roleApi,
  menu: menuApi,
  permission: permissionApi,
  dict: dictApi,
};
