import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Statistic, Tabs, message } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  auditStatusOptions,
  publishStatusOptions,
  scopeTypeOptions,
} from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import { buildValueEnum, containsKeyword, formatDateTime, renderStatusTag } from '@/pages/Business/shared';

interface BizFileRefRecord {
  id: string;
  bizType: string;
  bizNo: string;
  bizName: string;
  fileName: string;
  fileAssetId: string;
  refType: string;
  status: string;
  linkedAt: string;
}

interface FileUsageRecord {
  id: string;
  fileAssetId: string;
  fileName: string;
  usageModule: string;
  usageCount: number;
  lastBizNo: string;
  lastUsedAt: string;
}

interface FileAuditRecord {
  id: string;
  auditNo: string;
  fileName: string;
  bizNo: string;
  auditStatus: string;
  auditUser: string;
  auditedAt: string;
}

interface FileRetentionRecord {
  id: string;
  fileName: string;
  bizType: string;
  retentionRule: string;
  expireAt: string;
  status: string;
}

const publishStatusMap = buildValueEnum(publishStatusOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const scopeMap = buildValueEnum(scopeTypeOptions);

const refs: BizFileRefRecord[] = [
  { id: 'ref1', bizType: 'MERCHANT', bizNo: 'MCH-DIRECT-001', bizName: '鲸洗直营', fileName: '营业执照-鲸洗直营.pdf', fileAssetId: 'FA202604180001', refType: '资质文件', status: 'PUBLISHED', linkedAt: '2026-04-18 09:20:00' },
  { id: 'ref2', bizType: 'STORE', bizNo: 'STORE-HQ-001', bizName: '虹桥旗舰洗车站', fileName: '门店封面-虹桥.jpg', fileAssetId: 'FA202604180002', refType: '门店图片', status: 'PENDING', linkedAt: '2026-04-18 10:02:00' },
];

const usages: FileUsageRecord[] = [
  { id: 'u1', fileAssetId: 'FA202604180001', fileName: '营业执照-鲸洗直营.pdf', usageModule: '商户档案', usageCount: 2, lastBizNo: 'MCH-DIRECT-001', lastUsedAt: '2026-04-18 09:20:00' },
  { id: 'u2', fileAssetId: 'FA202604180002', fileName: '门店封面-虹桥.jpg', usageModule: '门店档案', usageCount: 1, lastBizNo: 'STORE-HQ-001', lastUsedAt: '2026-04-18 10:02:00' },
];

const audits: FileAuditRecord[] = [
  { id: 'a1', auditNo: 'FAUD202604180001', fileName: '营业执照-鲸洗直营.pdf', bizNo: 'MCH-DIRECT-001', auditStatus: 'APPROVED', auditUser: '招商-林悦', auditedAt: '2026-04-18 09:30:00' },
  { id: 'a2', auditNo: 'FAUD202604180002', fileName: '门店封面-虹桥.jpg', bizNo: 'STORE-HQ-001', auditStatus: 'PENDING', auditUser: '区域运营-何铭', auditedAt: '-' },
];

const retentions: FileRetentionRecord[] = [
  { id: 'r1', fileName: '营业执照-鲸洗直营.pdf', bizType: 'MERCHANT', retentionRule: '商户有效期 + 5 年', expireAt: '2031-04-18', status: 'PLATFORM' },
  { id: 'r2', fileName: '导出-结算明细.csv', bizType: 'EXPORT', retentionRule: '导出后 30 天', expireAt: '2026-05-18', status: 'STORE' },
];

const FileRelationManagement: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<BizFileRefRecord | FileUsageRecord | FileAuditRecord | FileRetentionRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm<{ bizNo: string; status: string; remark: string }>();

  const filter = <T extends object>(items: T[]) =>
    items.filter((item) => containsKeyword(keyword, Object.values(item).map((value) => String(value ?? ''))));

  const openModal = (title: string) => {
    setModalTitle(title);
    form.resetFields();
    setModalVisible(true);
  };

  const refColumns = useMemo<ProColumns<BizFileRefRecord>[]>(() => [
    { title: '业务类型', dataIndex: 'bizType', width: 120 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '业务名称', dataIndex: 'bizName', width: 180 },
    { title: '文件名', dataIndex: 'fileName', width: 220 },
    { title: '文件ID', dataIndex: 'fileAssetId', width: 160 },
    { title: '关联类型', dataIndex: 'refType', width: 120 },
    { title: '状态', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, publishStatusMap) },
    { title: '关联时间', dataIndex: 'linkedAt', width: 180, render: (_, record) => formatDateTime(record.linkedAt) },
    { title: '操作', width: 100, render: (_, record) => <Button size="small" onClick={() => setDetail(record)}>详情</Button> },
  ], []);

  const usageColumns = useMemo<ProColumns<FileUsageRecord>[]>(() => [
    { title: '文件ID', dataIndex: 'fileAssetId', width: 160 },
    { title: '文件名', dataIndex: 'fileName', width: 240 },
    { title: '使用模块', dataIndex: 'usageModule', width: 140 },
    { title: '引用次数', dataIndex: 'usageCount', width: 100 },
    { title: '最近业务单号', dataIndex: 'lastBizNo', width: 180 },
    { title: '最近使用时间', dataIndex: 'lastUsedAt', width: 180, render: (_, record) => formatDateTime(record.lastUsedAt) },
  ], []);

  const auditColumns = useMemo<ProColumns<FileAuditRecord>[]>(() => [
    { title: '审核单号', dataIndex: 'auditNo', width: 180 },
    { title: '文件名', dataIndex: 'fileName', width: 240 },
    { title: '业务单号', dataIndex: 'bizNo', width: 180 },
    { title: '审核状态', dataIndex: 'auditStatus', width: 120, render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '审核人', dataIndex: 'auditUser', width: 130 },
    { title: '审核时间', dataIndex: 'auditedAt', width: 180, render: (_, record) => formatDateTime(record.auditedAt) },
  ], []);

  const retentionColumns = useMemo<ProColumns<FileRetentionRecord>[]>(() => [
    { title: '文件名', dataIndex: 'fileName', width: 240 },
    { title: '业务类型', dataIndex: 'bizType', width: 120 },
    { title: '留存规则', dataIndex: 'retentionRule', width: 220 },
    { title: '到期时间', dataIndex: 'expireAt', width: 130 },
    { title: '范围', dataIndex: 'status', width: 120, render: (_, record) => renderStatusTag(record.status, scopeMap) },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="文件关联中心" subtitle="维护文件资产与商户、门店、合同、发票、导入导出等业务对象的关联关系。" icon={<LinkOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="文件关联" value={refs.length} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="待审文件" value={audits.filter((item) => item.auditStatus === 'PENDING').length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="复用文件" value={usages.filter((item) => item.usageCount > 1).length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="留存规则" value={retentions.length} suffix="条" /></Card></Col>
      </Row>

      <ProTable
        style={{ marginBottom: 16 }}
        columns={[{ title: '关键词', dataIndex: 'keyword', hideInTable: true, fieldProps: { placeholder: '输入文件名、文件ID、业务单号、关联类型' } }]}
        dataSource={[]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        options={false}
        pagination={false}
        onSubmit={(values) => setKeyword(String(values.keyword || ''))}
        onReset={() => setKeyword('')}
      />

      <Tabs
        items={[
          { key: 'ref', label: '业务关联', children: <ProTable<BizFileRefRecord> cardBordered rowKey="id" columns={refColumns} dataSource={filter(refs) as BizFileRefRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1500 }} toolBarRender={() => [<Button key="new" type="primary" onClick={() => openModal('新增文件关联')}>新增关联</Button>]} /> },
          { key: 'usage', label: '引用统计', children: <ProTable<FileUsageRecord> cardBordered rowKey="id" columns={usageColumns} dataSource={filter(usages) as FileUsageRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} /> },
          { key: 'audit', label: '文件审核', children: <ProTable<FileAuditRecord> cardBordered rowKey="id" columns={auditColumns} dataSource={filter(audits) as FileAuditRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1120 }} toolBarRender={() => [<Button key="audit" type="primary" onClick={() => openModal('审核文件')}>审核文件</Button>]} /> },
          { key: 'retention', label: '留存规则', children: <ProTable<FileRetentionRecord> cardBordered rowKey="id" columns={retentionColumns} dataSource={filter(retentions) as FileRetentionRecord[]} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 920 }} toolBarRender={() => [<Button key="rule" type="primary" onClick={() => openModal('配置留存规则')}>配置规则</Button>]} /> },
        ]}
      />

      <Modal title="详情查看" open={!!detail} footer={null} onCancel={() => setDetail(null)} width={760}>
        {detail ? (
          <Descriptions column={2} labelStyle={{ width: 110 }}>
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value ?? '-')}</Descriptions.Item>
            ))}
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={async () => {
          await form.validateFields();
          setModalVisible(false);
          message.success('文件关联操作已记录');
        }}
        width={760}
      >
        <Form form={form} layout="vertical">
          <div className="modal-grid">
            <Form.Item name="bizNo" label="业务单号 / 文件ID" rules={[{ required: true, message: '请输入业务单号或文件ID' }]}><Input /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={auditStatusOptions} /></Form.Item>
            <Form.Item className="modal-span-2" name="remark" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FileRelationManagement;
