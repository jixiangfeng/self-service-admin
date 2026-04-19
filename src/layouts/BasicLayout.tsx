import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown } from 'antd';
import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem } from '@ant-design/pro-components';
import {
  AccountBookOutlined,
  AppstoreOutlined,
  ApartmentOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CarOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  DollarOutlined,
  GiftOutlined,
  IdcardOutlined,
  MenuOutlined,
  NotificationOutlined,
  PartitionOutlined,
  PercentageOutlined,
  ProfileOutlined,
  SafetyOutlined,
  ShareAltOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { authApi } from '@/services/backendService';

const BasicLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pathname, setPathname] = useState(location.pathname);
  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const menuData: MenuDataItem[] = useMemo(() => [
    { key: '/dashboard', path: '/dashboard', name: '工作台', icon: <DashboardOutlined /> },
    {
      key: 'group-merchant',
      name: '商户中心',
      icon: <ApartmentOutlined />,
      children: [
        { key: '/merchant', path: '/merchant', name: '商户管理', icon: <ApartmentOutlined /> },
        { key: '/merchant-console', path: '/merchant-console', name: '商户后台', icon: <ApartmentOutlined /> },
        { key: '/merchant/groups', path: '/merchant/groups', name: '门店组管理', icon: <PartitionOutlined /> },
      ],
    },
    {
      key: 'group-store',
      name: '门店运营',
      icon: <ShopOutlined />,
      children: [
        { key: '/store', path: '/store', name: '门店管理', icon: <ShopOutlined /> },
        { key: '/bay', path: '/bay', name: '点位管理', icon: <CarOutlined /> },
        { key: '/device', path: '/device', name: '设备管理', icon: <DeploymentUnitOutlined /> },
        { key: '/store-operations', path: '/store-operations', name: '门店运营台', icon: <ShopOutlined /> },
      ],
    },
    {
      key: 'group-catalog',
      name: '商品服务',
      icon: <AppstoreOutlined />,
      children: [
        { key: '/service', path: '/service', name: '商品与服务', icon: <AppstoreOutlined /> },
      ],
    },
    {
      key: 'group-trade',
      name: '交易履约',
      icon: <ProfileOutlined />,
      children: [
        { key: '/trade', path: '/trade', name: '交易中心', icon: <ProfileOutlined /> },
        { key: '/fulfillment', path: '/fulfillment', name: '核销履约', icon: <AuditOutlined /> },
      ],
    },
    {
      key: 'group-assets',
      name: '用户资产',
      icon: <WalletOutlined />,
      children: [
        { key: '/asset', path: '/asset', name: '资产总览', icon: <WalletOutlined /> },
        { key: '/asset/service-cards', path: '/asset/service-cards', name: '服务卡与次卡', icon: <IdcardOutlined /> },
      ],
    },
    {
      key: 'group-marketing',
      name: '活动营销',
      icon: <GiftOutlined />,
      children: [
        { key: '/marketing', path: '/marketing', name: '活动总览', icon: <GiftOutlined /> },
        { key: '/marketing/coupon-templates', path: '/marketing/coupon-templates', name: '券模板管理', icon: <GiftOutlined /> },
        { key: '/marketing/recharge-activities', path: '/marketing/recharge-activities', name: '充值活动', icon: <DollarOutlined /> },
        { key: '/marketing/invite-activities', path: '/marketing/invite-activities', name: '邀请活动', icon: <ShareAltOutlined /> },
        { key: '/marketing/cross-store', path: '/marketing/cross-store', name: '跨店活动', icon: <PartitionOutlined /> },
      ],
    },
    {
      key: 'group-finance',
      name: '财务结算',
      icon: <AccountBookOutlined />,
      children: [
        { key: '/settlement', path: '/settlement', name: '结算总览', icon: <AccountBookOutlined /> },
        { key: '/settlement/profit-sharing', path: '/settlement/profit-sharing', name: '多合伙人分润', icon: <PercentageOutlined /> },
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
      name: '客服消息',
      icon: <CustomerServiceOutlined />,
      children: [
        { key: '/service-desk', path: '/service-desk', name: '客服工单', icon: <CustomerServiceOutlined /> },
        { key: '/service-desk/messages', path: '/service-desk/messages', name: '消息中心', icon: <BellOutlined /> },
      ],
    },
    {
      key: 'group-incubation',
      name: '增值规划',
      icon: <NotificationOutlined />,
      children: [
        { key: '/ads', path: '/ads', name: '广告中心', icon: <NotificationOutlined /> },
        { key: '/retail', path: '/retail', name: '商城零售', icon: <ShoppingCartOutlined /> },
      ],
    },
    {
      key: 'group-system',
      name: '系统管理',
      icon: <SafetyOutlined />,
      children: [
        { key: '/system/user', path: '/system/user', name: '用户管理', icon: <UserOutlined /> },
        { key: '/system/role', path: '/system/role', name: '角色管理', icon: <TeamOutlined /> },
        { key: '/system/menu', path: '/system/menu', name: '菜单管理', icon: <MenuOutlined /> },
        { key: '/system/dictionary', path: '/system/dictionary', name: '字典管理', icon: <BookOutlined /> },
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
      route={{ path: '/', routes: menuData }}
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
      <Outlet />
    </ProLayout>
  );
};

export default BasicLayout;
