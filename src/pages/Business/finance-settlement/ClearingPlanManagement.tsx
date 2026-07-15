import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Descriptions, Form, Input, InputNumber, List, Progress, Row, Select, Space, Steps, Switch, Tag, message } from 'antd';
import { CalculatorOutlined, CheckCircleOutlined, EyeOutlined, HistoryOutlined, SaveOutlined, SendOutlined, ShopOutlined, WalletOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import api from '@/services/backendService';
import type { ClearingPlanRecord, ClearingPlanSaveRequest, ClearingPlanSimulationRecord, MerchantGroupRecord, SettlementRuleRecord } from '@/services/backendService';
import PageBanner from '@/components/PageBanner';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { formatAmount, formatDateTime } from '@/pages/Business/shared';

const settlementModeOptions = [
  { value: 'AUTO_LEDGER', label: '自动记账并生成结算单' },
  { value: 'AUTO_PAYOUT', label: '自动记账、结算并发起打款' },
];
const cycleOptions = [
  { value: 'REALTIME', label: '实时' },
  { value: 'DAY', label: '每日' },
  { value: 'WEEK', label: '每周' },
  { value: 'MONTH', label: '每月' },
];
const cashHolderOptions = [
  { value: 'RECHARGE_MERCHANT', label: '充值收款商户保管' },
  { value: 'PLATFORM_PREPAID', label: '平台统一预收' },
];
const clearingBaseOptions = [
  { value: 'PRINCIPAL_ONLY', label: '仅本金参与收入清分' },
  { value: 'PRINCIPAL_PLUS_GIFT', label: '本金和赠送金额共同参与清分' },
];
const giftBearerOptions = [
  { value: 'PLATFORM', label: '平台承担' },
  { value: 'RECHARGE_MERCHANT', label: '充值方承担' },
  { value: 'CONSUME_STORE', label: '服务方承担' },
  { value: 'RATIO_SPLIT', label: '按清分比例共同承担' },
];

const defaultPlan: ClearingPlanSaveRequest = {
  settlementMode: 'AUTO_LEDGER', settlementCycle: 'WEEK', settlementCutoffTime: '00:00',
  settlementDelayDays: 0, minSettlementAmount: 0, cashHolder: 'RECHARGE_MERCHANT', clearingBase: 'PRINCIPAL_ONLY',
  sourceShareRate: 0, serviceShareRate: 100, platformRate: 0, giftCostBearer: 'RECHARGE_MERCHANT',
  cardRevenueRecognition: 'WRITE_OFF_SPLIT', autoSettlement: true, nettingEnabled: true, autoPayout: false,
};

export default function ClearingPlanManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ClearingPlanSaveRequest>();
  const [simulationForm] = Form.useForm();
  const [simulationResult, setSimulationResult] = useState<{ groupId: number; data: ClearingPlanSimulationRecord }>();
  const groupIdParam = Number(searchParams.get('groupId')) || undefined;

  const groupsQuery = useQuery({
    queryKey: ['storedValueGroups', 'clearing-plan'],
    queryFn: async () => (await api.merchantGroup.page({ pageNum: 1, pageSize: 200, groupType: 'STORED_VALUE' })).data,
  });
  const groups = useMemo(() => (groupsQuery.data?.records || []) as MerchantGroupRecord[], [groupsQuery.data]);
  const selectedGroupId = groupIdParam || groups[0]?.id;
  const selectedGroup = groups.find((item) => item.id === selectedGroupId);
  const simulation = simulationResult?.groupId === selectedGroupId ? simulationResult.data : undefined;
  const planQuery = useQuery({
    queryKey: ['clearingPlan', selectedGroupId],
    queryFn: async () => (await api.clearingPlan.get(selectedGroupId as number)).data,
    enabled: Boolean(selectedGroupId),
  });
  const versionsQuery = useQuery({
    queryKey: ['clearingPlanVersions', selectedGroupId],
    queryFn: async () => (await api.clearingPlan.versions(selectedGroupId as number)).data,
    enabled: Boolean(selectedGroupId),
  });
  const plan = planQuery.data as ClearingPlanRecord | undefined;
  const versions = (versionsQuery.data || []) as SettlementRuleRecord[];

  useEffect(() => {
    if (!groupIdParam && groups[0]?.id) setSearchParams({ groupId: String(groups[0].id) }, { replace: true });
  }, [groupIdParam, groups, setSearchParams]);
  useEffect(() => {
    if (plan) form.setFieldsValue(plan);
    else form.setFieldsValue(defaultPlan);
  }, [form, plan, selectedGroupId]);

  const saveMutation = useMutation({
    mutationFn: async () => api.clearingPlan.saveDraft(selectedGroupId as number, await form.validateFields()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clearingPlan', selectedGroupId] });
      message.success('结算方案草稿已保存，尚未影响交易');
    },
  });
  const simulateMutation = useMutation({
    mutationFn: async () => {
      const planValues = await form.validateFields();
      const transaction = await simulationForm.validateFields();
      return api.clearingPlan.simulate(selectedGroupId as number, { plan: planValues, ...transaction });
    },
    onSuccess: (response) => {
      if (selectedGroupId) setSimulationResult({ groupId: selectedGroupId, data: response.data });
    },
  });
  const publishMutation = useMutation({
    mutationFn: async () => {
      await api.clearingPlan.saveDraft(selectedGroupId as number, await form.validateFields());
      return api.clearingPlan.publish(selectedGroupId as number);
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clearingPlan', selectedGroupId] }),
        queryClient.invalidateQueries({ queryKey: ['clearingPlanVersions', selectedGroupId] }),
        queryClient.invalidateQueries({ queryKey: ['settlementRules'] }),
      ]);
      message.success(response.data.message || '结算方案已发布');
    },
  });

  const sourceRate = Number(Form.useWatch('sourceShareRate', form) || 0);
  const serviceRate = Number(Form.useWatch('serviceShareRate', form) || 0);
  const platformRate = Number(Form.useWatch('platformRate', form) || 0);
  const totalRate = useMemo(() => Number((sourceRate + serviceRate + platformRate).toFixed(4)), [sourceRate, serviceRate, platformRate]);
  const readyToPublish = Boolean(selectedGroupId && selectedGroup?.status === 'ENABLED' && (plan?.memberStoreCount || selectedGroup?.storeCount || 0) >= 2 && totalRate === 100 && simulation?.balanced);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="跨店结算方案" subtitle="按业务问题配置资金流，预演无误后再发布；底层规则由系统生成。" icon={<WalletOutlined />} />
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={6}>
          <Card title="储值通用组" size="small">
            <List
              loading={groupsQuery.isLoading}
              dataSource={groups}
              locale={{ emptyText: '请先在门店组管理中新建储值通用组' }}
              renderItem={(item) => (
                <List.Item
                  onClick={() => setSearchParams({ groupId: String(item.id) })}
                  style={{ cursor: 'pointer', background: item.id === selectedGroupId ? '#f0f7ff' : undefined, paddingInline: 12 }}
                >
                  <List.Item.Meta title={item.groupName} description={`${item.storeCount || 0} 家门店 · ${item.status === 'ENABLED' ? '已启用' : '未启用'}`} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={18}>
          {!selectedGroupId ? <Alert type="info" showIcon message="请选择储值通用组" /> : (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card>
                <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Space direction="vertical" size={2}>
                    <strong>{selectedGroup?.groupName}</strong>
                    <span>{plan?.memberStoreCount ?? selectedGroup?.storeCount ?? 0} 家门店 · 当前版本 {plan?.activeSettlementRuleVersion || '未发布'}</span>
                  </Space>
                  <Space>
                    <Tag color={plan?.status === 'PUBLISHED' ? 'green' : 'gold'}>{plan?.status === 'PUBLISHED' ? '已发布' : '草稿'}</Tag>
                    {plan?.publishedAt ? <span>发布于 {formatDateTime(plan.publishedAt)}</span> : null}
                  </Space>
                </Space>
              </Card>

              <Steps size="small" current={simulation?.balanced ? 4 : 0} items={[
                { title: '适用门店', icon: <ShopOutlined /> },
                { title: '资金保管', icon: <WalletOutlined /> },
                { title: '收入分配', icon: <CalculatorOutlined /> },
                { title: '赠送成本' },
                { title: '结算与发布', icon: <SendOutlined /> },
              ]} />

              <Form form={form} layout="vertical" initialValues={defaultPlan}>
                <Card title="1. 余额在哪里可用" size="small">
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="储值通用组">{selectedGroup?.groupName}</Descriptions.Item>
                    <Descriptions.Item label="启用门店">{plan?.memberStoreCount ?? selectedGroup?.storeCount ?? 0} 家</Descriptions.Item>
                    <Descriptions.Item label="清分范围"><Tag color="blue">仅跨商户</Tag></Descriptions.Item>
                  </Descriptions>
                  <Button type="link" onClick={() => location.assign('/merchant/groups')}>维护成员门店</Button>
                </Card>
                <Card title="2. 充值款由谁保管" size="small" style={{ marginTop: 16 }}>
                  <Form.Item name="cashHolder" rules={[{ required: true }]}><Select options={cashHolderOptions} /></Form.Item>
                </Card>
                <Card title="3. 跨店消费后如何分配" size="small" style={{ marginTop: 16 }}>
                  <Row gutter={16}>
                    <Col span={8}><Form.Item name="sourceShareRate" label="充值方留存" rules={[{ required: true }]}><InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="serviceShareRate" label="服务方所得" rules={[{ required: true }]}><InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="platformRate" label="平台服务费" rules={[{ required: true }]}><InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} /></Form.Item></Col>
                  </Row>
                  <Progress percent={Math.min(totalRate, 100)} status={totalRate === 100 ? 'success' : 'exception'} format={() => `合计 ${totalRate}%`} />
                  <Form.Item name="clearingBase" label="收入清分基数" style={{ marginTop: 16 }}><Select options={clearingBaseOptions} /></Form.Item>
                </Card>
                <Card title="4. 赠送金额由谁承担" size="small" style={{ marginTop: 16 }}>
                  <Form.Item name="giftCostBearer"><Select options={giftBearerOptions} /></Form.Item>
                </Card>
                <Card title="5. 何时结算" size="small" style={{ marginTop: 16 }}>
                  <Row gutter={16}>
                    <Col span={8}><Form.Item name="settlementMode" label="处理方式"><Select options={settlementModeOptions} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="settlementCycle" label="结算周期"><Select options={cycleOptions} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="settlementCutoffTime" label="账期截止"><Input placeholder="00:00" /></Form.Item></Col>
                    <Col span={8}><Form.Item name="settlementDelayDays" label="延迟天数"><InputNumber min={0} addonAfter="天" style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="minSettlementAmount" label="最低结算金额"><InputNumber min={0} addonAfter="元" style={{ width: '100%' }} /></Form.Item></Col>
                  </Row>
                  <Space size="large" wrap>
                    <Form.Item name="autoSettlement" valuePropName="checked" label="自动生成结算单"><Switch /></Form.Item>
                    <Form.Item name="nettingEnabled" valuePropName="checked" label="允许净额轧差"><Switch /></Form.Item>
                    <Form.Item name="autoPayout" valuePropName="checked" label="自动打款"><Switch /></Form.Item>
                  </Space>
                  <Form.Item name="remark" label="财务说明"><Input.TextArea rows={3} /></Form.Item>
                </Card>
              </Form>

              <Card title="资金流预演" size="small">
                <Form form={simulationForm} layout="inline" initialValues={{ rechargePrincipal: 100, rechargeGift: 20, consumeAmount: 50 }}>
                  <Form.Item name="rechargePrincipal" label="充值本金" rules={[{ required: true }]}><InputNumber min={0.01} addonAfter="元" /></Form.Item>
                  <Form.Item name="rechargeGift" label="赠送"><InputNumber min={0} addonAfter="元" /></Form.Item>
                  <Form.Item name="consumeAmount" label="消费" rules={[{ required: true }]}><InputNumber min={0.01} addonAfter="元" /></Form.Item>
                  <Button icon={<EyeOutlined />} loading={simulateMutation.isPending} onClick={() => simulateMutation.mutate()}>预演</Button>
                </Form>
                {simulation ? (
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={6}><Card size="small">本金消耗<br /><strong>{formatAmount(simulation.principalConsumed)}</strong></Card></Col>
                    <Col span={6}><Card size="small">充值方留存<br /><strong>{formatAmount(simulation.sourceShareAmount)}</strong></Card></Col>
                    <Col span={6}><Card size="small">服务方所得<br /><strong>{formatAmount(simulation.serviceShareAmount)}</strong></Card></Col>
                    <Col span={6}><Card size="small">平台服务费<br /><strong>{formatAmount(simulation.platformFeeAmount)}</strong></Card></Col>
                    <Col span={24} style={{ marginTop: 12 }}><Alert showIcon type={simulation.balanced ? 'success' : 'error'} message={simulation.balanced ? '资金流入与流出相等，可以发布' : '资金流不平衡，不能发布'} description={simulation.validationMessages.join('；') || undefined} /></Col>
                  </Row>
                ) : null}
              </Card>

              <Card size="small">
                <Space wrap>
                  <Button icon={<SaveOutlined />} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>保存草稿</Button>
                  <Button type="primary" icon={<SendOutlined />} disabled={!readyToPublish} loading={publishMutation.isPending} onClick={() => showBusinessConfirm({ title: '发布跨店结算方案', content: '发布后新交易将使用新版本，历史交易仍使用原快照。', okText: '确认发布', onOk: () => publishMutation.mutate() })}>发布方案</Button>
                  {!readyToPublish ? <span>发布前需启用门店组、至少2家门店、比例合计100%，并完成资金预演。</span> : <Tag icon={<CheckCircleOutlined />} color="success">可以发布</Tag>}
                </Space>
              </Card>

              <Card title={<Space><HistoryOutlined />版本记录</Space>} size="small">
                <List dataSource={versions} locale={{ emptyText: '尚未发布版本' }} renderItem={(item) => <List.Item><List.Item.Meta title={`${item.versionNo} · ${item.ruleName}`} description={`${item.status} · ${formatDateTime(item.publishedAt || item.createdAt)}`} /></List.Item>} />
              </Card>
            </Space>
          )}
        </Col>
      </Row>
    </div>
  );
}
