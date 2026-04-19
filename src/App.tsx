import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryProvider } from './utils/queryClient';
import './App.css';

const BasicLayout = lazy(() => import('./layouts/BasicLayout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MerchantManagement = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantManagement })));
const MerchantGroupManagement = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantGroupManagement })));
const MerchantWorkbench = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantWorkbench })));
const StoreManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.StoreManagement })));
const ServicePointManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.ServicePointManagement })));
const DeviceManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.DeviceManagement })));
const StoreOperationsManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.StoreOperationsManagement })));
const ServiceManagement = lazy(() => import('./pages/Business/product-service').then((module) => ({ default: module.ServiceManagement })));
const TradeManagement = lazy(() => import('./pages/Business/trade-fulfillment').then((module) => ({ default: module.TradeManagement })));
const FulfillmentManagement = lazy(() => import('./pages/Business/trade-fulfillment').then((module) => ({ default: module.FulfillmentManagement })));
const AssetManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.AssetManagement })));
const ServiceCardManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.ServiceCardManagement })));
const MarketingManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.MarketingManagement })));
const CouponTemplateManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.CouponTemplateManagement })));
const CrossStoreActivityManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.CrossStoreActivityManagement })));
const InviteActivityManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.InviteActivityManagement })));
const RechargeActivityManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.RechargeActivityManagement })));
const SettlementManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.SettlementManagement })));
const ProfitSharingManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.ProfitSharingManagement })));
const AnalysisManagement = lazy(() => import('./pages/Business/data-reports').then((module) => ({ default: module.AnalysisManagement })));
const ServiceDeskManagement = lazy(() => import('./pages/Business/service-messaging').then((module) => ({ default: module.ServiceDeskManagement })));
const MessageCenterManagement = lazy(() => import('./pages/Business/service-messaging').then((module) => ({ default: module.MessageCenterManagement })));
const AdManagement = lazy(() => import('./pages/Business/value-planning').then((module) => ({ default: module.AdManagement })));
const RetailManagement = lazy(() => import('./pages/Business/value-planning').then((module) => ({ default: module.RetailManagement })));
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
                <Route path="merchant" element={<MerchantManagement />} />
                <Route path="merchant/groups" element={<MerchantGroupManagement />} />
                <Route path="merchant-console" element={<MerchantWorkbench />} />
                <Route path="store" element={<StoreManagement />} />
                <Route path="store-operations" element={<StoreOperationsManagement />} />
                <Route path="bay" element={<ServicePointManagement />} />
                <Route path="device" element={<DeviceManagement />} />
                <Route path="service" element={<ServiceManagement />} />
                <Route path="trade" element={<TradeManagement />} />
                <Route path="order" element={<Navigate to="/trade" replace />} />
                <Route path="asset" element={<AssetManagement />} />
                <Route path="asset/service-cards" element={<ServiceCardManagement />} />
                <Route path="marketing" element={<MarketingManagement />} />
                <Route path="marketing/coupon-templates" element={<CouponTemplateManagement />} />
                <Route path="marketing/cross-store" element={<CrossStoreActivityManagement />} />
                <Route path="marketing/invite-activities" element={<InviteActivityManagement />} />
                <Route path="marketing/recharge-activities" element={<RechargeActivityManagement />} />
                <Route path="fulfillment" element={<FulfillmentManagement />} />
                <Route path="settlement" element={<SettlementManagement />} />
                <Route path="settlement/profit-sharing" element={<ProfitSharingManagement />} />
                <Route path="analysis" element={<AnalysisManagement />} />
                <Route path="service-desk" element={<ServiceDeskManagement />} />
                <Route path="service-desk/messages" element={<MessageCenterManagement />} />
                <Route path="ads" element={<AdManagement />} />
                <Route path="retail" element={<RetailManagement />} />

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
