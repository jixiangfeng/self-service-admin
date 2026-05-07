import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Divider, Form, Input, List, Modal, Row, Select, Space, Statistic, Tabs, message } from 'antd';
import { AccountBookOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { partnerRoleOptions, profitRelationStatusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatAmount, renderStatusTag } from '@/pages/Business/shared';
import WorkflowGuide from '@/pages/Business/shared';

interface PartnerRelationRecord {
  id: string;
  storeName: string;
  partnerName: string;
  role: string;
  ratio: string;
  period: string;
  settleAccount: string;
  status: string;
}

interface ProfitDetailRecord {
  id: string;
  orderNo: string;
  storeName: string;
  partnerName: string;
  baseAmount: number;
  actualAmount: number;
  status: string;
}

const roleMap = buildValueEnum(partnerRoleOptions);
const statusMap = buildValueEnum(profitRelationStatusOptions);

const initialRelations: PartnerRelationRecord[] = [
  { id: 'pr1', storeName: '嘉定联营门店', partnerName: '联营合伙人-陈禾', role: 'PARTNER', ratio: '30%', period: '2026-04-01 ~ 2026-12-31', settleAccount: '陈禾 / 招商银行', status: 'EFFECTIVE' },
  { id: 'pr2', storeName: '嘉定联营门店', partnerName: '沪西加盟合伙公司', role: 'MERCHANT', ratio: '70%', period: '2026-04-01 ~ 2026-12-31', settleAccount: '沪西加盟公司 / 建设银行', status: 'EFFECTIVE' },
  { id: 'pr3', storeName: '徐汇夜洗门店', partnerName: '区域运营试算主体', role: 'PARTNER', ratio: '15%', period: '2026-05-01 ~ 2026-10-31', settleAccount: '区域主体 / 农业银行', status: 'PENDING' },
];

const details: ProfitDetailRecord[] = [
  { id: 'pd1', orderNo: 'SO202604170113', storeName: '嘉定联营门店', partnerName: '联营合伙人-陈禾', baseAmount: 46, actualAmount: 13.8, status: 'PENDING' },
  { id: 'pd2', orderNo: 'SO202604170101', storeName: '嘉定联营门店', partnerName: '沪西加盟合伙公司', baseAmount: 29, actualAmount: 20.3, status: 'EFFECTIVE' },
];

const ProfitSharingManagement: React.FC = () => {
  const [form] = Form.useForm<PartnerRelationRecord>();
  const [relations, setRelations] = useState(initialRelations);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PartnerRelationRecord | null>(null);
  const [detail, setDetail] = useState<PartnerRelationRecord | null>(null);
  const [versionVisible, setVersionVisible] = useState(false);
  const [profitDetail, setProfitDetail] = useState<ProfitDetailRecord | null>(null);
  const [helperVisible, setHelperVisible] = useState(false);
  const [helperTitle, setHelperTitle] = useState('');
  const [helperDesc, setHelperDesc] = useState('');

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const filteredRelations = useMemo(() => relations.filter((item) => containsKeyword(keyword, [item.storeName, item.partnerName, item.ratio, item.settleAccount])), [keyword, relations]);
  const filteredDetails = useMemo(() => details.filter((item) => containsKeyword(keyword, [item.orderNo, item.storeName, item.partnerName])), [keyword]);

  const relationColumns: ProColumns<PartnerRelationRecord>[] = [
    { title: '门店', dataIndex: 'storeName', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '门店 / 合伙人 / 比例 / 收款账户' } },
    { title: '合伙人', dataIndex: 'partnerName', width: 180, search: false },
    {
      title: '角色',
      dataIndex: 'role',
      width: 120,
      valueType: 'select',
      valueEnum: roleMap,
      render: (_, record) => renderStatusTag(record.role, roleMap),
    },
    { title: '比例', dataIndex: 'ratio', width: 100, search: false },
    { title: '结算账户', dataIndex: 'settleAccount', width: 180, search: false },
    { title: '生效周期', dataIndex: 'period', width: 220, search: false },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    {
      title: '操作',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>详情</Button>
          <Button
            size="small"
            onClick={() => {
              setEditingRecord(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => {
              setRelations((prev) => prev.map((item) => item.id === record.id ? { ...item, status: item.status === 'EFFECTIVE' ? 'CLOSED' : 'EFFECTIVE' } : item));
              message.success('合伙关系状态已更新');
            }}
          >
            {record.status === 'EFFECTIVE' ? '结束' : '生效'}
          </Button>
        </Space>
      ),
    },
  ];

  const detailColumns: ProColumns<ProfitDetailRecord>[] = [
    { title: '订单号', dataIndex: 'orderNo', width: 180, hideInSearch: true },
    { title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '订单号 / 门店 / 合伙人' } },
    { title: '门店', dataIndex: 'storeName', width: 180, search: false },
    { title: '合伙人', dataIndex: 'partnerName', width: 180, search: false },
    { title: '分润基数', dataIndex: 'baseAmount', width: 120, search: false, render: (_, record) => formatAmount(record.baseAmount) },
    { title: '实际分润', dataIndex: 'actualAmount', width: 120, search: false, render: (_, record) => formatAmount(record.actualAmount) },
    { title: '状态', dataIndex: 'status', width: 120, valueType: 'select', valueEnum: statusMap, render: (_, record) => renderStatusTag(record.status, statusMap) },
    {
      title: '操作',
      width: 160,
      search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setProfitDetail(record)}>调整</Button>
          <Button size="small" onClick={() => { setHelperTitle('回冲处理'); setHelperDesc(`已选中 ${record.orderNo}，后续可以补充正式回冲单和审批流。`); setHelperVisible(true); }}>回冲</Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingRecord) {
      setRelations((prev) => prev.map((item) => item.id === editingRecord.id ? { ...item, ...values } : item));
      message.success('合伙关系已更新');
    } else {
      setRelations((prev) => [{ ...values, id: `relation-${Date.now()}` }, ...prev]);
      message.success('合伙关系已创建');
    }
    closeModal();
  };

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="多合伙人分润" subtitle="补齐合伙关系、收款账户、周期版本和状态维护能力。" icon={<AccountBookOutlined />} />
      <WorkflowGuide
        title="分润确认闭环"
        summary="分润页要先配关系，再看版本，再核明细，最后才能进入结算单确认。"
        steps={[
          { title: '合伙关系', description: '定义门店、合伙人角色和分润比例', status: 'finish', tag: '关系配置' },
          { title: '生效版本', description: '按时间版本确定当前生效周期', status: 'process', tag: '版本管理' },
          { title: '单笔分润', description: '核对订单级分润基数和实际分润金额', status: 'process', tag: '分润明细' },
          { title: '结算确认', description: '回到结算总览生成最终结算单', status: 'wait', tag: '结算总览' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="合伙关系" value={relations.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待确认分润" value={details.filter((item) => item.status === 'PENDING').length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="门店合伙人" value={2} suffix="家门店" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="当前版本" value={relations.length} suffix="版" /></Card></Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'relation',
            label: '合伙关系',
            children: (
              <ProTable<PartnerRelationRecord>
                cardBordered
                rowKey="id"
                columns={relationColumns}
                dataSource={filteredRelations}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1700 }}
                toolBarRender={() => [
                  <Button key="version" onClick={() => setVersionVisible(true)}>版本管理</Button>,
                  <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); form.setFieldsValue({ role: 'PARTNER', status: 'PENDING' }); setModalVisible(true); }}>
                    新建合伙关系
                  </Button>,
                ]}
                onSubmit={(values) => setKeyword(String(values.keyword || ''))}
                onReset={() => setKeyword('')}
              />
            ),
          },
          {
            key: 'detail',
            label: '分润明细',
            children: (
              <ProTable<ProfitDetailRecord>
                cardBordered
                rowKey="id"
                columns={detailColumns}
                dataSource={filteredDetails}
                search={{ labelWidth: 'auto', defaultCollapsed: false }}
                pagination={{ pageSize: 8 }}
                scroll={{ x: 1380 }}
                toolBarRender={() => [
                  <Button key="settle" onClick={() => { setHelperTitle('生成结算单'); setHelperDesc('当前入口保留为快捷跳转说明，正式结算动作请在结算总览完成。'); setHelperVisible(true); }}>生成结算单</Button>,
                  <Button key="export" type="primary" onClick={() => { setHelperTitle('导出分润明细'); setHelperDesc('已创建分润导出任务，后续可继续补导出记录和下载队列。'); setHelperVisible(true); }}>导出分润明细</Button>,
                ]}
                onSubmit={(values) => setKeyword(String(values.keyword || ''))}
                onReset={() => setKeyword('')}
              />
            ),
          },
        ]}
      />

      <Modal title={editingRecord ? `编辑合伙关系 · ${editingRecord.partnerName}` : '新建合伙关系'} open={modalVisible} width={860} onCancel={closeModal} onOk={handleSubmit}>
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Divider className="modal-span-2" orientation="left">关系基础信息</Divider>
            <Form.Item name="storeName" label="门店" rules={[{ required: true, message: '请输入门店' }]}><Input /></Form.Item>
            <Form.Item name="partnerName" label="合伙人" rules={[{ required: true, message: '请输入合伙人' }]}><Input /></Form.Item>
            <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}><Select options={partnerRoleOptions} /></Form.Item>
            <Form.Item name="ratio" label="分润比例" rules={[{ required: true, message: '请输入分润比例' }]}><Input placeholder="例如 30%" /></Form.Item>
            <Form.Item className="modal-span-2" name="settleAccount" label="收款账户" rules={[{ required: true, message: '请输入收款账户' }]}><Input /></Form.Item>
            <Divider className="modal-span-2" orientation="left">生效周期</Divider>
            <Form.Item className="modal-span-2" name="period" label="生效周期" rules={[{ required: true, message: '请输入生效周期' }]}><Input placeholder="例如 2026-04-01 ~ 2026-12-31" /></Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={profitRelationStatusOptions} /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="合伙关系详情" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={780}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="门店">{detail.storeName}</Descriptions.Item>
            <Descriptions.Item label="合伙人">{detail.partnerName}</Descriptions.Item>
            <Descriptions.Item label="角色">{roleMap[detail.role as keyof typeof roleMap]?.text || detail.role}</Descriptions.Item>
            <Descriptions.Item label="分润比例">{detail.ratio}</Descriptions.Item>
            <Descriptions.Item label="收款账户">{detail.settleAccount}</Descriptions.Item>
            <Descriptions.Item label="生效周期">{detail.period}</Descriptions.Item>
            <Descriptions.Item label="状态">{statusMap[detail.status as keyof typeof statusMap]?.text || detail.status}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal title="版本管理" open={versionVisible} footer={null} onCancel={() => setVersionVisible(false)} width={720}>
        <List
          dataSource={relations}
          renderItem={(item: PartnerRelationRecord) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ fontWeight: 600 }}>{item.storeName} / {item.partnerName}</div>
                <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)' }}>{item.period} · {item.ratio} · {item.settleAccount}</div>
              </div>
            </List.Item>
          )}
        />
      </Modal>

      <Modal title="分润调整" open={!!profitDetail} onCancel={() => setProfitDetail(null)} onOk={() => { setProfitDetail(null); message.success('分润调整结果已记录'); }} width={760}>
        {profitDetail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            <Descriptions.Item label="订单号">{profitDetail.orderNo}</Descriptions.Item>
            <Descriptions.Item label="门店">{profitDetail.storeName}</Descriptions.Item>
            <Descriptions.Item label="合伙人">{profitDetail.partnerName}</Descriptions.Item>
            <Descriptions.Item label="分润基数">{formatAmount(profitDetail.baseAmount)}</Descriptions.Item>
            <Descriptions.Item label="应分金额">{formatAmount(profitDetail.actualAmount)}</Descriptions.Item>
          </Descriptions>
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

export default ProfitSharingManagement;
