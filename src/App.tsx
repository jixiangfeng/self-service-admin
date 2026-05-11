import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryProvider } from './utils/queryClient';
import './App.css';
import { useBusinessEnums } from './constants/businessCatalog';

const BasicLayout = lazy(() => import('./layouts/BasicLayout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MerchantManagement = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantManagement })));
const MerchantGroupManagement = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantGroupManagement })));
const MerchantWorkbench = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantWorkbench })));
const MerchantProfileManagement = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantProfileManagement })));
const MerchantAccountManagement = lazy(() => import('./pages/Business/merchant-center').then((module) => ({ default: module.MerchantAccountManagement })));
const StoreManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.StoreManagement })));
const StoreProfileManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.StoreProfileManagement })));
const ServicePointManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.ServicePointManagement })));
const ServicePointProfileManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.ServicePointProfileManagement })));
const DeviceManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.DeviceManagement })));
const DeviceProfileManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.DeviceProfileManagement })));
const StoreOperationsManagement = lazy(() => import('./pages/Business/store-operations').then((module) => ({ default: module.StoreOperationsManagement })));
const ServiceManagement = lazy(() => import('./pages/Business/product-service').then((module) => ({ default: module.ServiceManagement })));
const ProductPricingManagement = lazy(() => import('./pages/Business/product-service').then((module) => ({ default: module.ProductPricingManagement })));
const ProductChangeManagement = lazy(() => import('./pages/Business/product-service').then((module) => ({ default: module.ProductChangeManagement })));
const TradeManagement = lazy(() => import('./pages/Business/trade-fulfillment').then((module) => ({ default: module.TradeManagement })));
const FulfillmentManagement = lazy(() => import('./pages/Business/trade-fulfillment').then((module) => ({ default: module.FulfillmentManagement })));
const OrderDetailManagement = lazy(() => import('./pages/Business/trade-fulfillment').then((module) => ({ default: module.OrderDetailManagement })));
const AssetManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.AssetManagement })));
const ServiceCardManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.ServiceCardManagement })));
const AssetFlowManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.AssetFlowManagement })));
const UserProfileManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.UserProfileManagement })));
const CouponCardDetailManagement = lazy(() => import('./pages/Business/user-assets').then((module) => ({ default: module.CouponCardDetailManagement })));
const MarketingManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.MarketingManagement })));
const CouponTemplateManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.CouponTemplateManagement })));
const CrossStoreActivityManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.CrossStoreActivityManagement })));
const InviteActivityManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.InviteActivityManagement })));
const RechargeActivityManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.RechargeActivityManagement })));
const MarketingExecutionManagement = lazy(() => import('./pages/Business/activity-marketing').then((module) => ({ default: module.MarketingExecutionManagement })));
const SettlementManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.SettlementManagement })));
const ProfitSharingManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.ProfitSharingManagement })));
const SettlementDetailManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.SettlementDetailManagement })));
const ProfitShareDetailManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.ProfitShareDetailManagement })));
const InvoiceManagement = lazy(() => import('./pages/Business/finance-settlement').then((module) => ({ default: module.InvoiceManagement })));
const AnalysisManagement = lazy(() => import('./pages/Business/data-reports').then((module) => ({ default: module.AnalysisManagement })));
const ServiceDeskManagement = lazy(() => import('./pages/Business/service-messaging').then((module) => ({ default: module.ServiceDeskManagement })));
const MessageCenterManagement = lazy(() => import('./pages/Business/service-messaging').then((module) => ({ default: module.MessageCenterManagement })));
const EvaluationFeedbackManagement = lazy(() => import('./pages/Business/service-messaging').then((module) => ({ default: module.EvaluationFeedbackManagement })));
const SubscribeAuthManagement = lazy(() => import('./pages/Business/service-messaging').then((module) => ({ default: module.SubscribeAuthManagement })));
const AdManagement = lazy(() => import('./pages/Business/value-planning').then((module) => ({ default: module.AdManagement })));
const RetailManagement = lazy(() => import('./pages/Business/value-planning').then((module) => ({ default: module.RetailManagement })));
const ValueFlowManagement = lazy(() => import('./pages/Business/value-planning').then((module) => ({ default: module.ValueFlowManagement })));
const OperationsSupportManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.OperationsSupportManagement })));
const OperationsConfigManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.OperationsConfigManagement })));
const PlatformBaseManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.PlatformBaseManagement })));
const PaymentOpsManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.PaymentOpsManagement })));
const DeviceOpsManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.DeviceOpsManagement })));
const OperationsExtensionManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.OperationsExtensionManagement })));
const FileRelationManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.FileRelationManagement })));
const ApprovalFlowManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.ApprovalFlowManagement })));
const RiskScheduleAlarmManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.RiskScheduleAlarmManagement })));
const MiniProgramOpsManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.MiniProgramOpsManagement })));
const OpenApiManagement = lazy(() => import('./pages/Business/platform-operations').then((module) => ({ default: module.OpenApiManagement })));
const UserManagement = lazy(() => import('./pages/System/User'));
const RoleManagement = lazy(() => import('./pages/System/Role'));
const MenuManagement = lazy(() => import('./pages/System/Menu'));
const DictionaryManagement = lazy(() => import('./pages/System/Dictionary'));
const AuthAudit = lazy(() => import('./pages/System/AuthAudit'));
const Organization = lazy(() => import('./pages/System/Organization'));

const PageLoading = () => (
  <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spin size="large" />
  </div>
);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('satoken') || localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const BusinessEnumBootstrap = () => {
  useBusinessEnums();
  return null;
};

function App() {
  return (
    <QueryProvider>
      <ConfigProvider locale={zhCN}>
        <BusinessEnumBootstrap />
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
                <Route path="merchant/profiles" element={<MerchantProfileManagement />} />
                <Route path="merchant/accounts" element={<MerchantAccountManagement />} />
                <Route path="merchant/groups" element={<MerchantGroupManagement />} />
                <Route path="merchant-console" element={<MerchantWorkbench />} />
                <Route path="store" element={<StoreManagement />} />
                <Route path="store/profiles" element={<StoreProfileManagement />} />
                <Route path="store-operations" element={<StoreOperationsManagement />} />
                <Route path="bay" element={<ServicePointManagement />} />
                <Route path="bay/profiles" element={<ServicePointProfileManagement />} />
                <Route path="device" element={<DeviceManagement />} />
                <Route path="device/profiles" element={<DeviceProfileManagement />} />
                <Route path="service" element={<ServiceManagement />} />
                <Route path="service/pricing" element={<ProductPricingManagement />} />
                <Route path="service/changes" element={<ProductChangeManagement />} />
                <Route path="trade" element={<TradeManagement />} />
                <Route path="trade/details" element={<OrderDetailManagement />} />
                <Route path="order" element={<Navigate to="/trade" replace />} />
                <Route path="asset" element={<AssetManagement />} />
                <Route path="asset/profiles" element={<UserProfileManagement />} />
                <Route path="asset/service-cards" element={<ServiceCardManagement />} />
                <Route path="asset/coupon-cards" element={<CouponCardDetailManagement />} />
                <Route path="asset/flows" element={<AssetFlowManagement />} />
                <Route path="marketing" element={<MarketingManagement />} />
                <Route path="marketing/coupon-templates" element={<CouponTemplateManagement />} />
                <Route path="marketing/cross-store" element={<CrossStoreActivityManagement />} />
                <Route path="marketing/invite-activities" element={<InviteActivityManagement />} />
                <Route path="marketing/recharge-activities" element={<RechargeActivityManagement />} />
                <Route path="marketing/execution" element={<MarketingExecutionManagement />} />
                <Route path="fulfillment" element={<FulfillmentManagement />} />
                <Route path="settlement" element={<SettlementManagement />} />
                <Route path="settlement/profit-sharing" element={<ProfitSharingManagement />} />
                <Route path="settlement/details" element={<SettlementDetailManagement />} />
                <Route path="settlement/profit-details" element={<ProfitShareDetailManagement />} />
                <Route path="settlement/invoices" element={<InvoiceManagement />} />
                <Route path="analysis" element={<AnalysisManagement />} />
                <Route path="service-desk" element={<ServiceDeskManagement />} />
                <Route path="service-desk/messages" element={<MessageCenterManagement />} />
                <Route path="service-desk/evaluations" element={<EvaluationFeedbackManagement />} />
                <Route path="service-desk/subscribes" element={<SubscribeAuthManagement />} />
                <Route path="ads" element={<AdManagement />} />
                <Route path="retail" element={<RetailManagement />} />
                <Route path="value-flows" element={<ValueFlowManagement />} />
                <Route path="operations-support" element={<OperationsSupportManagement />} />
                <Route path="operations-config" element={<OperationsConfigManagement />} />
                <Route path="platform-base" element={<PlatformBaseManagement />} />
                <Route path="payment-ops" element={<PaymentOpsManagement />} />
                <Route path="device-ops" element={<DeviceOpsManagement />} />
                <Route path="operations-extension" element={<OperationsExtensionManagement />} />
                <Route path="file-relations" element={<FileRelationManagement />} />
                <Route path="approval-flows" element={<ApprovalFlowManagement />} />
                <Route path="risk-schedule-alarms" element={<RiskScheduleAlarmManagement />} />
                <Route path="mini-program-ops" element={<MiniProgramOpsManagement />} />
                <Route path="open-api" element={<OpenApiManagement />} />

                <Route path="system">
                  <Route path="user" element={<UserManagement />} />
                  <Route path="role" element={<RoleManagement />} />
                  <Route path="menu" element={<MenuManagement />} />
                  <Route path="dictionary" element={<DictionaryManagement />} />
                  <Route path="auth-audit" element={<AuthAudit />} />
                  <Route path="organization" element={<Organization />} />
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
