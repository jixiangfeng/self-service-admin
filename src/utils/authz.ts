export interface StoredUserAuth {
  id?: number;
  userId?: number;
  username?: string;
  nickname?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
}

export function getStoredUserAuth(): StoredUserAuth | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUserAuth;
  } catch {
    return null;
  }
}

export function hasPermission(permissionCode: string): boolean {
  const user = getStoredUserAuth();
  if (!user) return false;
  const roles = user.roles || (user.role ? [user.role] : []);
  if (roles.includes('SUPER_ADMIN') || roles.includes('PLATFORM_ADMIN')) {
    return true;
  }
  return Boolean(user.permissions?.includes(permissionCode));
}

export function hasAnyPermission(permissionCodes: string[]): boolean {
  if (!permissionCodes.length) return true;
  return permissionCodes.some(hasPermission);
}
