import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryProvider } from './utils/queryClient';
import './App.css';
import { useBusinessEnums } from './constants/businessCatalog';
import { authApi } from './services/backendService';

const BasicLayout = lazy(() => import('./layouts/BasicLayout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MerchantManagement = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantManagement })));
const MerchantGroupManagement = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantGroupManagement })));
const MerchantWorkbench = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantWorkbench })));
const MerchantAccountManagement = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantAccountManagement })));
const StoreManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.StoreManagement })));
const ServicePointManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.ServicePointManagement })));
const DeviceManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.DeviceManagement })));
const StorePricingManagement = lazy(() => import('./pages/Business/product-service').then((module) => ({ default: module.StorePricingManagement })));
const TradeManagement = lazy(() => import('./pages/Business/trade-fulfillment').then((module) => ({ default: module.TradeManagement })));
const FulfillmentManagement = lazy(() => import('./pages/Business/trade-fulfillment').then((module) => ({ default: module.FulfillmentManagement })));
const ServiceCardManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.ServiceCardManagement })));
const AssetFlowManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.AssetFlowManagement })));
const UserProfileManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.UserProfileManagement })));
const InviteActivityManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.InviteActivityManagement })));
const RechargeActivityManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.RechargeActivityManagement })));
const SettlementManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.SettlementManagement })));
const SettlementRuleManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.SettlementRuleManagement })));
const ProfitSharingManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.ProfitSharingManagement })));
const AnalysisManagement = lazy(() => import('./pages/Business/data-reports').then((module) => ({ default: module.AnalysisManagement })));
const EvaluationFeedbackManagement = lazy(() => import('./pages/Business/service-messaging').then((module) => ({ default: module.EvaluationFeedbackManagement })));
const MiniProgramOpsManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.MiniProgramOpsManagement })));
const UserManagement = lazy(() => import('./pages/System/User'));
const RoleManagement = lazy(() => import('./pages/System/Role'));
const MenuManagement = lazy(() => import('./pages/System/Menu'));
const DictionaryManagement = lazy(() => import('./pages/System/Dictionary'));

const PageLoading = () => (
  <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spin size="large" />
  </div>
);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('satoken') || localStorage.getItem('token');
  const [checking, setChecking] = useState(Boolean(token));
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setAuthenticated(false);
      return;
    }

    let mounted = true;
    setChecking(true);
    authApi.getCurrentUser()
      .then(() => {
        if (mounted) setAuthenticated(true);
      })
      .catch(() => {
        if (mounted) setAuthenticated(false);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (checking) return <PageLoading />;
  return authenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppContent = () => {
  useBusinessEnums();

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter basename={import.meta.env.VITE_ROUTER_BASENAME || undefined}>
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
              <Route path="merchant" element={<MerchantManagement />} />
              <Route path="merchant/profiles" element={<Navigate to="/merchant" replace />} />
              <Route path="merchant/accounts" element={<MerchantAccountManagement />} />
              <Route path="merchant/groups" element={<MerchantGroupManagement />} />
              <Route path="merchant-console" element={<MerchantWorkbench />} />
              <Route path="store" element={<StoreManagement />} />
              <Route path="store/profiles" element={<Navigate to="/store" replace />} />
              <Route path="store/pricing" element={<StorePricingManagement />} />
              <Route path="store-operations" element={<Navigate to="/store" replace />} />
              <Route path="bay" element={<ServicePointManagement />} />
              <Route path="bay/profiles" element={<Navigate to="/bay" replace />} />
              <Route path="device" element={<DeviceManagement />} />
              <Route path="device/profiles" element={<Navigate to="/device" replace />} />
              <Route path="service" element={<Navigate to="/asset/service-cards" replace />} />
              <Route path="service/pricing" element={<Navigate to="/store/pricing" replace />} />
              <Route path="trade" element={<TradeManagement />} />
              <Route path="order" element={<Navigate to="/trade" replace />} />
              <Route path="asset" element={<Navigate to="/asset/profiles" replace />} />
              <Route path="asset/profiles" element={<UserProfileManagement />} />
              <Route path="asset/service-cards" element={<ServiceCardManagement />} />
              <Route path="asset/flows" element={<AssetFlowManagement />} />
              <Route path="marketing" element={<Navigate to="/marketing/recharge-activities" replace />} />
              <Route path="marketing/invite" element={<Navigate to="/marketing/invite-activities" replace />} />
              <Route path="marketing/invite-activities" element={<InviteActivityManagement />} />
              <Route path="marketing/recharge-activities" element={<RechargeActivityManagement />} />
              <Route path="fulfillment" element={<FulfillmentManagement />} />
              <Route path="settlement" element={<SettlementManagement />} />
              <Route path="settlement/rules" element={<SettlementRuleManagement />} />
              <Route path="settlement/profit-sharing" element={<ProfitSharingManagement />} />
              <Route path="analysis" element={<AnalysisManagement />} />
              <Route path="service-desk/evaluations" element={<EvaluationFeedbackManagement />} />
              <Route path="mini-program-ops" element={<MiniProgramOpsManagement />} />

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
  );
};

function App() {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  );
}

export default App;
