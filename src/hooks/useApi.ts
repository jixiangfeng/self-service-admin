import { message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import api from '@/services/backendService';

export const useCurrentUser = (options?: UseQueryOptions) =>
  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => (await api.auth.getCurrentUser()).data,
    ...options,
  } as any);

export const useUsers = (params?: any, options?: UseQueryOptions) =>
  useQuery({
    queryKey: ['users', params],
    queryFn: async () => (await api.user.page(params || {})).data,
    ...options,
  } as any);

export const useRoles = (params?: any, options?: UseQueryOptions) =>
  useQuery({
    queryKey: ['roles', params],
    queryFn: async () => (await api.role.page(params || {})).data,
    ...options,
  } as any);

export const useRoleOptions = (options?: UseQueryOptions) =>
  useQuery({
    queryKey: ['roleOptions'],
    queryFn: async () => (await api.user.roleList()).data,
    ...options,
  } as any);

export const usePermissionTree = (options?: UseQueryOptions) =>
  useQuery({
    queryKey: ['permissionTree'],
    queryFn: async () => (await api.role.permissionTree()).data,
    ...options,
  } as any);

export const useMenuTree = (options?: UseQueryOptions) =>
  useQuery({
    queryKey: ['menuTree'],
    queryFn: async () => (await api.menu.tree()).data,
    ...options,
  } as any);

export const useRolePermissionIds = (id?: number, options?: UseQueryOptions) =>
  useQuery({
    queryKey: ['rolePermissionIds', id],
    queryFn: async () => (await api.role.permissionIds(id as number)).data,
    enabled: !!id,
    ...options,
  } as any);

export const useDictionaries = (params?: any, options?: UseQueryOptions) =>
  useQuery({
    queryKey: ['dictTypes', params],
    queryFn: async () => (await api.dict.typeList(params || {})).data,
    ...options,
  } as any);

export const useDictionaryItems = (dictCode: string, options?: UseQueryOptions) =>
  useQuery({
    queryKey: ['dictItems', dictCode],
    queryFn: async () => (await api.dict.dataList({ dictCode, pageNum: 1, pageSize: 200 })).data,
    enabled: !!dictCode,
    ...options,
  } as any);

export const useCreateUser = (options?: UseMutationOptions<any, any, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => api.user.add(data),
    onSuccess: () => {
      message.success('用户创建成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('用户创建失败'),
    ...options,
  } as any);
};

export const useUpdateUser = (options?: UseMutationOptions<any, any, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => api.user.edit(payload.data ?? payload),
    onSuccess: () => {
      message.success('用户更新成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('用户更新失败'),
    ...options,
  } as any);
};

export const useUpdateUserStatus = (options?: UseMutationOptions<any, any, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => api.user.changeStatus(id, status),
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('状态更新失败'),
    ...options,
  } as any);
};

export const useCreateRole = (options?: UseMutationOptions<any, any, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => api.role.add(data),
    onSuccess: () => {
      message.success('角色创建成功');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => message.error('角色创建失败'),
    ...options,
  } as any);
};

export const useUpdateRole = (options?: UseMutationOptions<any, any, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => api.role.edit(data),
    onSuccess: () => {
      message.success('角色更新成功');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => message.error('角色更新失败'),
    ...options,
  } as any);
};

export const useDeleteRole = (options?: UseMutationOptions<any, any, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.role.remove(id),
    onSuccess: () => {
      message.success('角色删除成功');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => message.error('角色删除失败'),
    ...options,
  } as any);
};

export const useCreateMenu = (options?: UseMutationOptions<any, any, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => api.menu.add(data),
    onSuccess: () => {
      message.success('菜单创建成功');
      queryClient.invalidateQueries({ queryKey: ['menuTree'] });
      queryClient.invalidateQueries({ queryKey: ['permissionTree'] });
    },
    onError: () => message.error('菜单创建失败'),
    ...options,
  } as any);
};

export const useUpdateMenu = (options?: UseMutationOptions<any, any, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => api.menu.edit(data),
    onSuccess: () => {
      message.success('菜单更新成功');
      queryClient.invalidateQueries({ queryKey: ['menuTree'] });
      queryClient.invalidateQueries({ queryKey: ['permissionTree'] });
    },
    onError: () => message.error('菜单更新失败'),
    ...options,
  } as any);
};

export const useDeleteMenu = (options?: UseMutationOptions<any, any, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.menu.remove(id),
    onSuccess: () => {
      message.success('菜单删除成功');
      queryClient.invalidateQueries({ queryKey: ['menuTree'] });
      queryClient.invalidateQueries({ queryKey: ['permissionTree'] });
    },
    onError: () => message.error('菜单删除失败'),
    ...options,
  } as any);
};

export const useCreateDictionary = (options?: UseMutationOptions<any, any, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => api.dict.typeAdd(data),
    onSuccess: () => {
      message.success('字典创建成功');
      queryClient.invalidateQueries({ queryKey: ['dictTypes'] });
    },
    onError: () => message.error('字典创建失败'),
    ...options,
  } as any);
};

export const useUpdateDictionary = (options?: UseMutationOptions<any, any, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => api.dict.typeEdit(id, data),
    onSuccess: () => {
      message.success('字典更新成功');
      queryClient.invalidateQueries({ queryKey: ['dictTypes'] });
    },
    onError: () => message.error('字典更新失败'),
    ...options,
  } as any);
};

export const useDeleteDictionary = (options?: UseMutationOptions<any, any, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.dict.typeRemove(id),
    onSuccess: () => {
      message.success('字典删除成功');
      queryClient.invalidateQueries({ queryKey: ['dictTypes'] });
    },
    onError: () => message.error('字典删除失败'),
    ...options,
  } as any);
};
