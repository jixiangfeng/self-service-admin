import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryProvider } from './utils/queryClient';
import './App.css';

const BasicLayout = lazy(() => import('./layouts/BasicLayout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UserManagement = lazy(() => import('./pages/System/User'));
const RoleManagement = lazy(() => import('./pages/System/Role'));
const MenuManagement = lazy(() => import('./pages/System/Menu'));
const DictionaryManagement = lazy(() => import('./pages/System/Dictionary'));
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'));

const PageLoading = () => (
  <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spin size="large" />
  </div>
);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('satoken') || localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <QueryProvider>
      <ConfigProvider locale={zhCN}>
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={(
                  <PrivateRoute>
                    <BasicLayout />
                  </PrivateRoute>
                )}
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                <Route path="merchant" element={<PlaceholderPage title="商户管理" description="商户主体、账号和结算配置将在这一模块设计与接入。" />} />
                <Route path="store" element={<PlaceholderPage title="门店管理" description="门店资料、营业配置、价格策略和服务能力将在这里落地。" />} />
                <Route path="bay" element={<PlaceholderPage title="工位管理" description="工位状态、编号、设备映射和维护能力后续在这里设计。" />} />
                <Route path="device" element={<PlaceholderPage title="设备管理" description="设备接入、在线状态、远程控制与厂商适配后续接入。" />} />
                <Route path="service" element={<PlaceholderPage title="服务商品" description="洗车套餐、按时计费规则和服务售卖模型待设计。" />} />
                <Route path="order" element={<PlaceholderPage title="订单中心" description="订单查询、支付明细、异常中断和退款能力后续补齐。" />} />

                <Route path="system">
                  <Route path="user" element={<UserManagement />} />
                  <Route path="role" element={<RoleManagement />} />
                  <Route path="menu" element={<MenuManagement />} />
                  <Route path="dictionary" element={<DictionaryManagement />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ConfigProvider>
    </QueryProvider>
  );
}

export default App;
