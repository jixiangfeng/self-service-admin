import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Dropdown } from 'antd';
import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem } from '@ant-design/pro-components';
import {
  AccountBookOutlined,
  AppstoreOutlined,
  ApartmentOutlined,
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  CalculatorOutlined,
  CarOutlined,
  CommentOutlined,
  ContactsOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  DollarOutlined,
  GiftOutlined,
  IdcardOutlined,
  MenuOutlined,
  MobileOutlined,
  PartitionOutlined,
  PercentageOutlined,
  ProfileOutlined,
  SafetyOutlined,
  ShareAltOutlined,
  ShopOutlined,
  TagsOutlined,
  TeamOutlined,
  TransactionOutlined,
  UserOutlined,
  UserSwitchOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { authApi } from '@/services/backendService';
import { getStoredUserAuth, hasAnyPermission } from '@/utils/authz';

const BasicLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pathname, setPathname] = useState(location.pathname);
  const currentUser = useMemo(() => getStoredUserAuth(), []);

  type PermissionMenuDataItem = MenuDataItem & { permissions?: string[] };
  type BreadcrumbRoute = {
    title: React.ReactNode;
    path?: string;
  };

  const filterMenuByPermission = useCallback((items: MenuDataItem[]): MenuDataItem[] =>
    items
      .map((item) => {
        const permissions = (item as PermissionMenuDataItem).permissions;
        const children = item.children ? filterMenuByPermission(item.children) : undefined;
        const allowed = !permissions || hasAnyPermission(permissions) || Boolean(children?.length);
        if (!allowed) return null;
        return { ...item, children };
      })
      .filter(Boolean) as MenuDataItem[], []);

  const menuData: MenuDataItem[] = useMemo(() => [
    { key: '/dashboard', path: '/dashboard', name: '工作台', icon: <DashboardOutlined /> },
    {
      key: 'group-merchant',
      name: '商户中心',
      icon: <ApartmentOutlined />,
      children: [
        { key: '/merchant', path: '/merchant', name: '商户管理', icon: <ApartmentOutlined /> },
        { key: '/merchant/accounts', path: '/merchant/accounts', name: '商户账号', icon: <UserSwitchOutlined /> },
      ],
    },
    {
      key: 'group-store',
      name: '门店运营',
      icon: <ShopOutlined />,
      children: [
        { key: '/store', path: '/store', name: '门店管理', icon: <ShopOutlined /> },
        { key: '/store/pricing', path: '/store/pricing', name: '门店计费规则', icon: <TagsOutlined /> },
        { key: '/merchant/groups', path: '/merchant/groups', name: '门店组管理', icon: <PartitionOutlined /> },
        { key: '/bay', path: '/bay', name: '点位管理', icon: <CarOutlined /> },
        { key: '/device', path: '/device', name: '设备管理', icon: <DeploymentUnitOutlined /> },
      ],
    },
    {
      key: 'group-catalog',
      name: '权益管理',
      icon: <AppstoreOutlined />,
      children: [
        { key: '/asset/service-cards', path: '/asset/service-cards', name: '服务卡管理', icon: <IdcardOutlined /> },
      ],
    },
    {
      key: 'group-trade',
      name: '交易履约',
      icon: <ProfileOutlined />,
      children: [
        { key: '/trade', path: '/trade', name: '订单中心', icon: <ProfileOutlined /> },
        { key: '/fulfillment', path: '/fulfillment', name: '核销记录', icon: <AuditOutlined /> },
      ],
    },
    {
      key: 'group-assets',
      name: '用户资产',
      icon: <WalletOutlined />,
      children: [
        { key: '/asset/profiles', path: '/asset/profiles', name: '用户档案', icon: <ContactsOutlined /> },
        { key: '/asset/flows', path: '/asset/flows', name: '资产流水', icon: <TransactionOutlined /> },
      ],
    },
    {
      key: 'group-marketing',
      name: '活动营销',
      icon: <GiftOutlined />,
      children: [
        { key: '/marketing/recharge-activities', path: '/marketing/recharge-activities', name: '充值活动', icon: <DollarOutlined /> },
        { key: '/marketing/invite-activities', path: '/marketing/invite-activities', name: '邀请活动', icon: <ShareAltOutlined /> },
      ],
    },
    {
      key: 'group-finance',
      name: '财务结算',
      icon: <AccountBookOutlined />,
      children: [
        { key: '/settlement', path: '/settlement', name: '结算中心', icon: <AccountBookOutlined /> },
        { key: '/settlement/clearing-plans', path: '/settlement/clearing-plans', name: '跨店结算方案', icon: <CalculatorOutlined /> },
        { key: '/settlement/profit-sharing', path: '/settlement/profit-sharing', name: '合伙人分润', icon: <PercentageOutlined /> },
      ],
    },
    {
      key: 'group-analysis',
      name: '数据报表',
      icon: <BarChartOutlined />,
      children: [
        { key: '/analysis', path: '/analysis', name: '经营分析', icon: <BarChartOutlined /> },
      ],
    },
    {
      key: 'group-service',
      name: '用户反馈',
      icon: <CommentOutlined />,
      children: [
        { key: '/service-desk/evaluations', path: '/service-desk/evaluations', name: '用户反馈', icon: <CommentOutlined /> },
      ],
    },
    {
      key: 'group-operations-support',
      name: '运营支撑',
      icon: <SafetyOutlined />,
      children: [
        { key: '/mini-program-ops', path: '/mini-program-ops', name: '小程序运营配置', icon: <MobileOutlined /> },
      ],
    },
    {
      key: 'group-system',
      name: '系统管理',
      icon: <SafetyOutlined />,
      children: [
        { key: '/system/user', path: '/system/user', name: '用户管理', icon: <UserOutlined />, permissions: ['system:user:list'] } as MenuDataItem,
        { key: '/system/role', path: '/system/role', name: '角色管理', icon: <TeamOutlined />, permissions: ['system:role:list'] } as MenuDataItem,
        { key: '/system/menu', path: '/system/menu', name: '权限/菜单管理', icon: <MenuOutlined />, permissions: ['system:menu:list'] } as MenuDataItem,
        { key: '/system/dictionary', path: '/system/dictionary', name: '字典管理', icon: <BookOutlined />, permissions: ['system:dictionary:list'] } as MenuDataItem,
      ],
    },
  ], []);

  const pathKeyChains = useMemo(() => {
    const mapping: Record<string, string[]> = {};

    const walk = (items: MenuDataItem[], parentKeys: string[] = []) => {
      items.forEach((item) => {
        const currentKey = item.key ? String(item.key) : item.path ? String(item.path) : '';
        const nextParentKeys = currentKey ? [...parentKeys, currentKey] : parentKeys;

        if (item.path) {
          mapping[item.path] = parentKeys;
        }

        if (item.children?.length) {
          walk(item.children, nextParentKeys);
        }
      });
    };

    walk(menuData, []);
    return mapping;
  }, [menuData]);

  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    return pathKeyChains[location.pathname] || [];
  });

  useEffect(() => {
    setPathname(location.pathname);
    const nextKeys = pathKeyChains[location.pathname];
    if (!nextKeys?.length) {
      return;
    }
    setOpenKeys((prev) => {
      const same = prev.length === nextKeys.length && prev.every((value, index) => value === nextKeys[index]);
      return same ? prev : nextKeys;
    });
  }, [location.pathname, pathKeyChains]);

  const filteredMenuData = useMemo(() => filterMenuByPermission(menuData), [filterMenuByPermission, menuData]);

  const breadcrumbRoutes = useMemo(() => {
    const mapping: Record<string, BreadcrumbRoute[]> = {};

    const walk = (items: MenuDataItem[], parents: BreadcrumbRoute[] = []) => {
      items.forEach((item) => {
        const title = item.name;
        const currentRoute = title ? { title, path: item.path } : undefined;
        const nextParents = currentRoute ? [...parents, currentRoute] : parents;

        if (item.path && title) {
          mapping[item.path] = nextParents;
        }

        if (item.children?.length) {
          walk(item.children, nextParents);
        }
      });
    };

    walk(filteredMenuData);
    return mapping;
  }, [filteredMenuData]);

  const currentBreadcrumbItems = breadcrumbRoutes[location.pathname] || [];

  const userMenuItems = [
    { key: 'logout', label: '退出登录' },
  ];

  const handleMenuClick = async ({ key }: { key: string }) => {
    if (key === 'logout') {
      try {
        await authApi.logout();
      } catch {
        // Local cleanup is still required if the session has already expired.
      } finally {
        localStorage.removeItem('satoken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
  };

  return (
    <ProLayout
      title="自助设备经营平台"
      layout="side"
      splitMenus={false}
      navTheme="light"
      contentWidth="Fluid"
      fixedHeader
      fixSiderbar
      siderWidth={248}
      route={{ path: '/', routes: filteredMenuData }}
      location={{ pathname }}
      menuProps={{
        openKeys,
        selectedKeys: [pathname],
        onOpenChange: (keys) => setOpenKeys(keys as string[]),
      }}
      menuItemRender={(item, dom) => {
        if (item.children?.length) {
          return dom;
        }

        return (
          <div
            onClick={() => {
              if (item.path) {
                setPathname(item.path);
                navigate(item.path);
              }
            }}
          >
            {dom}
          </div>
        );
      }}
      avatarProps={{
        size: 'small',
        title: currentUser?.nickname || currentUser?.username || '管理员',
        render: (_props, dom) => (
          <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }}>
            {dom}
          </Dropdown>
        ),
      }}
    >
      <div className="admin-layout-content">
        {currentBreadcrumbItems.length > 0 && (
          <Breadcrumb
            className="admin-layout-breadcrumb"
            items={currentBreadcrumbItems.map((item, index) => {
              const isLast = index === currentBreadcrumbItems.length - 1;
              return {
                title: !isLast && item.path ? (
                  <span onClick={() => navigate(item.path || '/')}>{item.title}</span>
                ) : item.title,
              };
            })}
          />
        )}
        <Outlet />
      </div>
    </ProLayout>
  );
};

export default BasicLayout;
