import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown } from 'antd';
import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem } from '@ant-design/pro-components';
import {
  ApartmentOutlined,
  BookOutlined,
  CarOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  MenuOutlined,
  SafetyOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
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

  const menuData: MenuDataItem[] = [
    { path: '/dashboard', name: '工作台', icon: <DashboardOutlined /> },
    { path: '/merchant', name: '商户管理', icon: <ApartmentOutlined /> },
    { path: '/store', name: '门店管理', icon: <ShopOutlined /> },
    { path: '/bay', name: '工位管理', icon: <CarOutlined /> },
    { path: '/device', name: '设备管理', icon: <DeploymentUnitOutlined /> },
    { path: '/service', name: '服务商品', icon: <ShoppingOutlined /> },
    { path: '/order', name: '订单中心', icon: <BookOutlined /> },
    {
      path: '/system',
      name: '系统管理',
      icon: <SafetyOutlined />,
      children: [
        { path: '/system/user', name: '用户管理', icon: <UserOutlined /> },
        { path: '/system/role', name: '角色管理', icon: <TeamOutlined /> },
        { path: '/system/menu', name: '菜单管理', icon: <MenuOutlined /> },
        { path: '/system/dictionary', name: '字典管理', icon: <BookOutlined /> },
      ],
    },
  ];

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
      title="自助洗车管理后台"
      layout="mix"
      splitMenus={false}
      navTheme="light"
      contentWidth="Fluid"
      fixedHeader
      fixSiderbar
      route={{ path: '/', routes: menuData }}
      location={{ pathname }}
      menuItemRender={(item, dom) => (
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
      )}
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
