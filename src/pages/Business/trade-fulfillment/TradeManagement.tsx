import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, List, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { ProfileOutlined, ReloadOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  orderStatusOptions,
  payModeOptions as catalogPayModeOptions,
  refundStatusOptions,
  ticketStatusOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, formatDateTime, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';

interface TradeOrderRecord {
  id: string;
  orderNo: string;
  orderType: string;
  storeName: string;
  pointCode: string;
  serviceName: string;
  payMode: string;
  amount: number;
  userName: string;
  status: string;
  createdAt: string;
  note?: string;
}

interface RefundRecord {
  id: string;
  refundNo: string;
  orderNo: string;
  refundType: string;
  amount: number;
  reason: string;
  applicant: string;
  status: string;
  createdAt: string;
  auditNote?: string;
}

interface AfterSaleRecord {
  id: string;
  ticketNo: string;
  orderNo: string;
  ticketType: string;
  content: string;
  owner: string;
  compensation: string;
  status: string;
  createdAt: string;
  result?: string;
}

type ActionModalType = 'order' | 'refund' | 'afterSale' | null;

const orderTypeOptions = [
  { value: 'SCAN', label: '扫码订单' },
  { value: 'POINT_SELECT', label: '选点位订单' },
  { value: 'PACKAGE', label: '套餐订单' },
  { value: 'MIXED', label: '混合计费订单' },
];

const payModeOptions = catalogPayModeOptions;
const orderStatusMap = buildValueEnum(orderStatusOptions);
const refundStatusMap = buildValueEnum(refundStatusOptions);
const afterSaleStatusMap = buildValueEnum(ticketStatusOptions);

const initialOrders: TradeOrderRecord[] = [
  { id: 'o1', orderNo: 'SO202604180001', orderType: 'SCAN', storeName: '虹桥旗舰洗车站', pointCode: 'BAY-01', serviceName: '快速冲洗套餐', payMode: 'WX', amount: 29, userName: '张晨', status: 'PENDING_PAYMENT', createdAt: '2026-04-18 09:12:00' },
  { id: 'o2', orderNo: 'SO202604180019', orderType: 'POINT_SELECT', storeName: '虹桥旗舰洗车站', pointCode: 'BAY-03', serviceName: '夜间按时长服务', payMode: 'BALANCE', amount: 18, userName: '李波', status: 'IN_PROGRESS', createdAt: '2026-04-18 09:27:00' },
  { id: 'o3', orderNo: 'SO202604170113', orderType: 'MIXED', storeName: '徐汇夜洗门店', pointCode: 'BAY-07', serviceName: '泡沫精洗套餐', payMode: 'MIXED', amount: 46, userName: '陈越', status: 'AFTER_SALE', createdAt: '2026-04-17 22:08:00' },
  { id: 'o4', orderNo: 'SO202604170101', orderType: 'PACKAGE', storeName: '嘉定联营门店', pointCode: 'BAY-02', serviceName: '快速冲洗套餐', payMode: 'WX', amount: 29, userName: '王涵', status: 'COMPLETED', createdAt: '2026-04-17 19:42:00' },
];

const initialRefunds: RefundRecord[] = [
  { id: 'r1', refundNo: 'RF202604180011', orderNo: 'SO202604170113', refundType: 'EXCEPTION', amount: 12, reason: '设备中断自动退款', applicant: '系统触发', status: 'PROCESSING', createdAt: '2026-04-18 09:32:00' },
  { id: 'r2', refundNo: 'RF202604170032', orderNo: 'SO202604170098', refundType: 'AUDIT', amount: 29, reason: '用户申诉未完成服务', applicant: '客服-刘莎', status: 'PENDING', createdAt: '2026-04-17 20:11:00' },
];

const initialAfterSales: AfterSaleRecord[] = [
  { id: 'a1', ticketNo: 'AS202604180003', orderNo: 'SO202604170113', ticketType: 'FAULT', content: '风干设备启动失败，订单中断', owner: '客服-刘莎', compensation: '补 5 元洗车券', status: 'PROCESSING', createdAt: '2026-04-18 09:30:00' },
  { id: 'a2', ticketNo: 'AS202604170020', orderNo: 'SO202604170054', ticketType: 'COMPLAINT', content: '夜间价格说明不清晰', owner: '运营-何铭', compensation: '补 8 元余额', status: 'PENDING', createdAt: '2026-04-17 21:08:00' },
];

const TradeManagement: React.FC = () => {
  const [orders, setOrders] = useState(initialOrders);
  const [refunds, setRefunds] = useState(initialRefunds);
  const [afterSales, setAfterSales] = useState(initialAfterSales);
  const [detail, setDetail] = useState<TradeOrderRecord | RefundRecord | AfterSaleRecord | null>(null);
  const [actionModalType, setActionModalType] = useState<ActionModalType>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [actionForm] = Form.useForm<{ status: string; note: string }>();
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');
  const [helperDesc, setHelperDesc] = useState('');
  const [orderFilters, setOrderFilters] = useState({ keyword: '', orderType: undefined as string | undefined, payMode: undefined as string | undefined, status: undefined as string | undefined });
  const [refundFilters, setRefundFilters] = useState({ keyword: '', status: undefined as string | undefined });
  const [afterSaleFilters, setAfterSaleFilters] = useState({ keyword: '', status: undefined as string | undefined });

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (item) =>
          containsKeyword(orderFilters.keyword, [item.orderNo, item.storeName, item.serviceName, item.userName, item.note]) &&
          (!orderFilters.orderType || item.orderType === orderFilters.orderType) &&
          (!orderFilters.payMode || item.payMode === orderFilters.payMode) &&
          (!orderFilters.status || item.status === orderFilters.status)
      ),
    [orderFilters, orders]
  );

  const filteredRefunds = useMemo(
    () =>
      refunds.filter(
        (item) =>
          containsKeyword(refundFilters.keyword, [item.refundNo, item.orderNo, item.reason, item.applicant, item.auditNote]) &&
          (!refundFilters.status || item.status === refundFilters.status)
      ),
    [refundFilters, refunds]
  );

  const filteredAfterSales = useMemo(
    () =>
      afterSales.filter(
        (item) =>
          containsKeyword(afterSaleFilters.keyword, [item.ticketNo, item.orderNo, item.content, item.owner, item.result]) &&
          (!afterSaleFilters.status || item.status === afterSaleFilters.status)
      ),
    [afterSaleFilters, afterSales]
  );

  const openActionModal = (type: ActionModalType, id: string, currentStatus: string, currentNote?: string) => {
    setActionModalType(type);
    setActionTargetId(id);
    actionForm.setFieldsValue({ status: currentStatus, note: currentNote || '' });
  };

  const closeActionModal = () => {
    setActionModalType(null);
    setActionTargetId(null);
    actionForm.resetFields();
  };

  const openHelper = (title: string, description: string) => {
    setHelperTitle(title);
    setHelperDesc(description);
    setHelperVisible(true);
  };

  const handleActionSubmit = async () => {
    const values = await actionForm.validateFields();
    if (!actionTargetId || !actionModalType) {
      return;
    }

    if (actionModalType === 'order') {
      setOrders((prev) => prev.map((item) => item.id === actionTargetId ? { ...item, status: values.status, note: values.note } : item));
      message.success('订单处置结果已更新');
    }

    if (actionModalType === 'refund') {
      setRefunds((prev) => prev.map((item) => item.id === actionTargetId ? { ...item, status: values.status, auditNote: values.note } : item));
      message.success('退款审核结果已更新');
    }

    if (actionModalType === 'afterSale') {
      setAfterSales((prev) => prev.map((item) => item.id === actionTargetId ? { ...item, status: values.status, result: values.note, compensation: values.note || item.compensation } : item));
      message.success('售后工单已更新');
    }

    closeActionModal();
  };

  const orderColumns: ProColumns<TradeOrderRecord>[] = [
    { title: '订单号', dataIndex: 'orderNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '订单号 / 门店 / 服务 / 用户' } },
    { title: '订单类型', dataIndex: 'orderType', width: 130, valueType: 'select', valueEnum: buildValueEnum(orderTypeOptions), render: (_, record) => renderStatusTag(record.orderType, buildValueEnum(orderTypeOptions) as any) },
    { title: '门店', dataIndex: 'storeName', width: 160, search: false },
    { title: '点位', dataIndex: 'pointCode', width: 100, search: false },
    { title: '服务商品', dataIndex: 'serviceName', width: 180, search: false },
    { title: '支付方式', dataIndex: 'payMode', width: 120, valueType: 'select', valueEnum: buildValueEnum(payModeOptions), render: (_, record) => renderStatusTag(record.payMode, buildValueEnum(payModeOptions) as any) },
    { title: '订单金额', dataIndex: 'amount', width: 120, search: false, render: (_, record) => formatAmount(record.amount) },
    { title: '用户', dataIndex: 'userName', width: 100, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: orderStatusMap, render: (_, record) => renderStatusTag(record.status, orderStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 240,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>处置台</Button>
          <Button
            size="small"
            onClick={() => {
              setOrders((prev) => [{ ...record, id: `clone-${Date.now()}`, orderNo: `MANUAL-${Date.now()}`, note: '人工补单创建' }, ...prev]);
              message.success('已创建人工补单');
            }}
          >
            人工补单
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => openActionModal('order', record.id, record.status, record.note)}
          >
            关单 / 调整
          </Button>
        </Space>
      ),
    },
  ];

  const refundColumns: ProColumns<RefundRecord>[] = [
    { title: '退款单号', dataIndex: 'refundNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '退款单号 / 订单号 / 原因 / 申请人' } },
    { title: '关联订单', dataIndex: 'orderNo', width: 180, search: false },
    { title: '退款类型', dataIndex: 'refundType', width: 120, search: false },
    { title: '退款金额', dataIndex: 'amount', width: 120, search: false, render: (_, record) => formatAmount(record.amount) },
    { title: '退款原因', dataIndex: 'reason', width: 220, search: false },
    { title: '申请来源', dataIndex: 'applicant', width: 140, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: refundStatusMap, render: (_, record) => renderStatusTag(record.status, refundStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>查看</Button>
          <Button size="small" onClick={() => openActionModal('refund', record.id, record.status, record.auditNote)}>审核</Button>
        </Space>
      ),
    },
  ];

  const afterSaleColumns: ProColumns<AfterSaleRecord>[] = [
    { title: '售后单号', dataIndex: 'ticketNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '售后单号 / 订单号 / 内容 / 处理人' } },
    { title: '关联订单', dataIndex: 'orderNo', width: 180, search: false },
    { title: '售后类型', dataIndex: 'ticketType', width: 120, search: false },
    { title: '问题描述', dataIndex: 'content', width: 260, search: false },
    { title: '处理人', dataIndex: 'owner', width: 140, search: false },
    { title: '补偿方案', dataIndex: 'compensation', width: 160, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: afterSaleStatusMap, render: (_, record) => renderStatusTag(record.status, afterSaleStatusMap) },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, search: false, render: (_, record) => formatDateTime(record.createdAt) },
    {
      title: '操作',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>查看</Button>
          <Button size="small" onClick={() => openActionModal('afterSale', record.id, record.status, record.result || record.compensation)}>补偿 / 结论</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageBanner
        title="交易中心"
        subtitle="把服务订单、退款中心和售后工单做成可处理、可审核、可回写结果的本地业务页。"
        icon={<ProfileOutlined />}
      />
      <WorkflowGuide
        title="订单处置闭环"
        summary="交易页要能从订单识别一路走到退款、售后、核销和结算，而不是只停在三张表。"
        steps={[
          { title: '订单识别', description: '扫码、选点位、套餐和混合计费统一归口', status: 'finish', tag: '服务订单' },
          { title: '支付与启动', description: '确认支付方式和设备启动结果', status: 'process', tag: '支付状态' },
          { title: '退款与售后', description: '处理异常退款、故障申诉和补偿', status: 'process', tag: '退款 / 售后工单' },
          { title: '回看履约结果', description: '最后回到核销履约和结算复盘', status: 'wait', tag: '下一步：核销 / 结算' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="服务订单" value={orders.length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="进行中订单" value={orders.filter((item) => item.status === 'IN_PROGRESS').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="退款处理中" value={refunds.filter((item) => item.status === 'PROCESSING').length} suffix="单" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="售后待处理" value={afterSales.filter((item) => item.status !== 'CLOSED').length} suffix="单" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'orders',
            label: '服务订单',
            children: (
              <ProTable<TradeOrderRecord>
                cardBordered
                rowKey="id"
                columns={orderColumns}
                dataSource={filteredOrders}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1820 }}
                toolBarRender={() => [<Button key="export" onClick={() => openHelper('导出订单', '订单导出任务已创建，后续可继续补导出记录与下载中心。')}>导出订单</Button>, <Button key="exception" type="primary" onClick={() => openHelper('异常订单处理', '这里作为异常订单处理的聚合入口，后续可以扩展为批量处理页。')}>异常订单处理</Button>]}
                onSubmit={(values) => setOrderFilters({ keyword: String(values.keyword || ''), orderType: values.orderType as string | undefined, payMode: values.payMode as string | undefined, status: values.status as string | undefined })}
                onReset={() => setOrderFilters({ keyword: '', orderType: undefined, payMode: undefined, status: undefined })}
              />
            ),
          },
          {
            key: 'refunds',
            label: '退款中心',
            children: (
              <ProTable<RefundRecord>
                cardBordered
                rowKey="id"
                columns={refundColumns}
                dataSource={filteredRefunds}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1600 }}
                toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openHelper('批量审核', '批量退款审核入口已触发，后续可以补充勾选行与批量审批流。')}>批量审核</Button>]}
                onSubmit={(values) => setRefundFilters({ keyword: String(values.keyword || ''), status: values.status as string | undefined })}
                onReset={() => setRefundFilters({ keyword: '', status: undefined })}
              />
            ),
          },
          {
            key: 'after-sales',
            label: '售后工单',
            children: (
              <ProTable<AfterSaleRecord>
                cardBordered
                rowKey="id"
                columns={afterSaleColumns}
                dataSource={filteredAfterSales}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1680 }}
                toolBarRender={() => [<Button key="assign" onClick={() => openHelper('批量分派', '售后工单批量分派入口已触发，后续可以补选中工单后的负责人分派。')}>批量分派</Button>, <Button key="new" type="primary" onClick={() => openHelper('创建售后工单', '当前保留聚合入口，后续可以补独立新建售后工单表单。')}>创建售后工单</Button>]}
                onSubmit={(values) => setAfterSaleFilters({ keyword: String(values.keyword || ''), status: values.status as string | undefined })}
                onReset={() => setAfterSaleFilters({ keyword: '', status: undefined })}
              />
            ),
          },
        ]}
      />

      <Modal
        title={actionModalType === 'order' ? '订单处置' : actionModalType === 'refund' ? '退款审核' : actionModalType === 'afterSale' ? '售后处理' : '处理动作'}
        open={!!actionModalType}
        onOk={handleActionSubmit}
        onCancel={closeActionModal}
        width={820}
      >
        <Form form={actionForm} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
              <Select
                options={actionModalType === 'order' ? orderStatusOptions : actionModalType === 'refund' ? refundStatusOptions : ticketStatusOptions}
              />
            </Form.Item>
            <div />
            <Form.Item className="modal-span-2" name="note" label="处理说明" rules={[{ required: true, message: '请输入处理说明' }]}>
              <Input.TextArea rows={4} placeholder="记录审核意见、补偿方案、异常结论等" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title={detail && 'orderNo' in detail ? `订单处置台 · ${String(detail.orderNo)}` : '详情查看'}
        open={!!detail}
        width={760}
        onCancel={() => setDetail(null)}
        footer={(
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
            <Button type="primary" onClick={() => openHelper('记录处理动作', '当前处理动作已记录为演示结果，后续可以补完整的处置日志流水。')}>记录处理动作</Button>
          </Space>
        )}
        destroyOnClose
      >
        {detail ? (
          <>
            <Card title="记录概览" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small" labelStyle={{ width: 110 }}>
                {Object.entries(detail).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {typeof value === 'number' && (key === 'amount' || key === 'actualAmount') ? formatAmount(value) : String(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="推荐动作">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button block onClick={() => openHelper('查看履约日志', '履约日志入口已触发，后续可以联动核销履约页做明细跳转。')}>查看履约日志</Button>
                    <Button block onClick={() => openHelper('发起退款审核', '退款审核入口已触发，建议后续联动退款中心的审批流。')}>发起退款审核</Button>
                    <Button block onClick={() => openHelper('创建售后工单', '售后工单创建入口已触发，建议后续补快速建单表单。')}>创建售后工单</Button>
                    <Button block onClick={() => openHelper('补偿余额 / 券', '补偿发放入口已触发，建议后续联动用户资产中心。')}>补偿余额 / 券</Button>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="关联提醒">
                  <List
                    dataSource={[
                      '退款会影响后续结算单和活动成本分摊',
                      '售后补偿要同步到用户资产中心',
                      '异常设备建议回到设备中心做维护标记',
                    ]}
                    renderItem={(item: string) => <List.Item>{item}</List.Item>}
                  />
                </Card>
              </Col>
            </Row>
          </>
        ) : null}
      </Modal>

      <Modal title={helperTitle} open={helperVisible} footer={null} onCancel={() => setHelperVisible(false)} width={680}>
        <Descriptions column={1} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="说明">{helperDesc}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default TradeManagement;
