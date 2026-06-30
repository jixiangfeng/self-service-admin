import React from 'react';
import { Descriptions, Drawer, Empty, List, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  auditStatusOptions,
  merchantContractStatusOptions,
  merchantTypeOptions,
  qualificationTypeOptions,
  settlementCycleOptions,
  statusOptions,
} from '@/constants/businessCatalog';
import type {
  MerchantAccountRecord,
  MerchantChangeLogRecord,
  MerchantContactRecord,
  MerchantContractRecord,
  MerchantFullProfileRecord,
  MerchantQualificationRecord,
  MerchantSettlementAccountRecord,
  StoreRecord,
} from '@/services/backendService';
import { buildValueEnum, formatDateTime, renderStatusTag, formatEnumText } from '@/pages/Business/shared';

interface MerchantFullProfileDrawerProps {
  open: boolean;
  loading?: boolean;
  profile?: MerchantFullProfileRecord;
  onClose: () => void;
}

const merchantTypeMap = buildValueEnum(merchantTypeOptions);
const contractStatusMap = buildValueEnum(merchantContractStatusOptions);
const qualificationTypeMap = buildValueEnum(qualificationTypeOptions);
const settlementCycleMap = buildValueEnum(settlementCycleOptions);
const auditStatusMap = buildValueEnum(auditStatusOptions);
const statusMap = buildValueEnum(statusOptions);
const primaryFlagMap = {
  1: { color: 'success', text: '是' },
  0: { color: 'default', text: '否' },
};

const changeTypeMap: Record<string, string> = {
  MERCHANT_CREATE: '商户创建',
  MERCHANT_UPDATE: '商户主档修改',
  MERCHANT_STATUS: '商户启停',
  MERCHANT_DELETE: '商户删除',
  CONTACT_CREATE: '联系人新增',
  CONTACT_UPDATE: '联系人修改',
  CONTACT_DELETE: '联系人删除',
  QUALIFICATION_CREATE: '资质新增',
  QUALIFICATION_UPDATE: '资质修改',
  QUALIFICATION_DELETE: '资质删除',
  CONTRACT_CREATE: '合同新增',
  CONTRACT_UPDATE: '合同修改',
  CONTRACT_DELETE: '合同删除',
  SETTLEMENT_ACCOUNT_CREATE: '结算账户新增',
  SETTLEMENT_ACCOUNT_UPDATE: '结算账户修改',
  SETTLEMENT_ACCOUNT_DELETE: '结算账户删除',
};

const maskAccountNo = (value?: string) => {
  if (!value) return '-';
  if (value.length <= 4) return value;
  return `${'*'.repeat(Math.min(value.length - 4, 8))}${value.slice(-4)}`;
};

type ChangeDiffRow = {
  key: string;
  field: string;
  before: unknown;
  after: unknown;
};

const fieldLabelMap: Record<string, string> = {
  merchantName: '商户名称',
  shortName: '商户简称',
  merchantCode: '商户编号',
  merchantType: '主体类型',
  contractStatus: '合同状态',
  creditCode: '统一信用代码',
  contactName: '联系人',
  contactPhone: '联系电话',
  cityCoverage: '覆盖城市',
  settlementAccountName: '结算户名',
  settlementAccountNo: '结算账号',
  settlementCycle: '结算周期',
  licenseUrl: '营业资质文件',
  status: '状态',
  remark: '备注',
  contactType: '联系人类型',
  mobile: '手机号',
  email: '邮箱',
  primaryFlag: '主联系人',
  qualificationType: '资质类型',
  qualificationNo: '资质编号',
  fileName: '文件名称',
  fileUrl: '文件地址',
  auditStatus: '审核状态',
  expireAt: '到期日',
  contractNo: '合同编号',
  contractName: '合同名称',
  startAt: '开始日期',
  endAt: '结束日期',
  accountName: '户名',
  accountNo: '账号',
  bankName: '开户行',
  effectiveAt: '生效日期',
};

const parseJsonObject = (value?: string): Record<string, unknown> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value };
  } catch {
    return { value };
  }
};

const formatDiffValue = (value: unknown, field?: string) => {
  if (value === undefined || value === null || value === '') return '-';
  if (field === 'accountNo' || field === 'settlementAccountNo') return maskAccountNo(String(value));
  if (field === 'status' && (value === 1 || value === 0)) return value === 1 ? '启用' : '停用';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const buildDiffRows = (record: MerchantChangeLogRecord): ChangeDiffRow[] => {
  const before = parseJsonObject(record.beforeValue);
  const after = parseJsonObject(record.afterValue);
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return keys.map((key) => ({
    key,
    field: fieldLabelMap[key] || key,
    before: before[key],
    after: after[key],
  }));
};

const ChangeDiffTable: React.FC<{ record: MerchantChangeLogRecord }> = ({ record }) => {
  const rows = buildDiffRows(record);
  if (!rows.length) return <Typography.Text type="secondary">暂无字段差异</Typography.Text>;
  return (
    <Table<ChangeDiffRow>
      rowKey="key"
      size="small"
      pagination={false}
      columns={[
        { title: '字段', dataIndex: 'field', width: 180 },
        { title: '变更前', dataIndex: 'before', render: (value, row) => formatDiffValue(value, row.key) },
        { title: '变更后', dataIndex: 'after', render: (value, row) => formatDiffValue(value, row.key) },
      ]}
      dataSource={rows}
    />
  );
};

const MerchantFullProfileDrawer: React.FC<MerchantFullProfileDrawerProps> = ({ open, loading, profile, onClose }) => {
  const merchant = profile?.merchant;
  const risks = [
    !(profile?.contacts || []).some((item) => item.primaryFlag === 1) ? '未配置主联系人' : null,
    !(profile?.contracts || []).some((item) => item.contractStatus === 'ACTIVE') ? '暂无有效合同' : null,
    !(profile?.settlementAccounts || []).some((item) => item.status === 'ACTIVE') ? '暂无启用结算账户' : null,
    (profile?.pendingQualificationCount || 0) > 0 ? `有 ${profile?.pendingQualificationCount} 份待审资质` : null,
    (profile?.storeCount || 0) === 0 ? '尚未开设门店' : null,
  ].filter(Boolean) as string[];

  const contactColumns: ColumnsType<MerchantContactRecord> = [
    { title: '联系人类型', dataIndex: 'contactType', render: (value) => formatEnumText(value, 'contactType', '联系人类型') },
    { title: '联系人', dataIndex: 'contactName' },
    { title: '手机号', dataIndex: 'mobile' },
    { title: '邮箱', dataIndex: 'email', render: (value) => value || '-' },
    { title: '主联系人', dataIndex: 'primaryFlag', render: (_, record) => renderStatusTag(record.primaryFlag, primaryFlagMap) },
    { title: '状态', dataIndex: 'status', render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
  ];

  const qualificationColumns: ColumnsType<MerchantQualificationRecord> = [
    { title: '资质类型', dataIndex: 'qualificationType', render: (_, record) => renderStatusTag(record.qualificationType, qualificationTypeMap) },
    { title: '资质编号', dataIndex: 'qualificationNo' },
    { title: '文件', dataIndex: 'fileName', render: (value) => value || '-' },
    { title: '审核状态', dataIndex: 'auditStatus', render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '到期日', dataIndex: 'expireAt', render: (value) => value || '-' },
  ];

  const contractColumns: ColumnsType<MerchantContractRecord> = [
    { title: '合同编号', dataIndex: 'contractNo' },
    { title: '合同名称', dataIndex: 'contractName' },
    { title: '结算周期', dataIndex: 'settlementCycle', render: (_, record) => renderStatusTag(record.settlementCycle, settlementCycleMap) },
    { title: '合同状态', dataIndex: 'contractStatus', render: (_, record) => renderStatusTag(record.contractStatus, contractStatusMap) },
    { title: '审核状态', dataIndex: 'status', render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '周期', render: (_, record) => `${record.startAt || '-'} ~ ${record.endAt || '-'}` },
  ];

  const settlementColumns: ColumnsType<MerchantSettlementAccountRecord> = [
    { title: '户名', dataIndex: 'accountName' },
    { title: '账号', dataIndex: 'accountNo', render: (value) => maskAccountNo(value) },
    { title: '开户行', dataIndex: 'bankName', render: (value) => value || '-' },
    { title: '审核状态', dataIndex: 'auditStatus', render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '账户状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '账户状态') },
    { title: '生效日期', dataIndex: 'effectiveAt', render: (value) => value || '-' },
  ];

  const accountColumns: ColumnsType<MerchantAccountRecord> = [
    { title: '账号', dataIndex: 'userName' },
    { title: '手机号', dataIndex: 'mobile', render: (value) => value || '-' },
    { title: '账号类型', dataIndex: 'accountType', render: (value) => formatEnumText(value, 'accountType', '账号类型') },
    { title: '门店', dataIndex: 'storeName', render: (value) => value || '商户级' },
    { title: '数据范围', dataIndex: 'dataScopeType', render: (value) => formatEnumText(value, 'scopeType', '数据范围') },
    { title: '状态', dataIndex: 'status', render: (_, record) => renderStatusTag(record.status, statusMap) },
  ];

  const storeColumns: ColumnsType<StoreRecord> = [
    { title: '门店名称', dataIndex: 'storeName' },
    { title: '门店编号', dataIndex: 'storeCode' },
    { title: '城市', render: (_, record) => [record.province, record.city, record.district].filter(Boolean).join(' / ') || '-' },
    { title: '负责人', dataIndex: 'managerName', render: (value) => value || '-' },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'storeStatus', '门店状态') },
  ];

  const changeColumns: ColumnsType<MerchantChangeLogRecord> = [
    { title: '变更时间', dataIndex: 'changedAt', width: 170, render: (value) => formatDateTime(value) },
    { title: '类型', dataIndex: 'changeType', width: 150, render: (value) => changeTypeMap[value] || value },
    { title: '操作人', dataIndex: 'operator', width: 100, render: (value) => value || '-' },
    { title: '变更字段', width: 120, render: (_, record) => `${buildDiffRows(record).length} 项` },
    { title: '摘要', render: (_, record) => buildDiffRows(record).slice(0, 3).map((row) => `${row.field}: ${formatDiffValue(row.before, row.key)} → ${formatDiffValue(row.after, row.key)}`).join('；') || '-' },
  ];

  return (
    <Drawer
      title={merchant ? `商户完整档案 · ${merchant.merchantName}` : '商户完整档案'}
      open={open}
      onClose={onClose}
      width={1120}
      destroyOnClose
    >
      {!profile || !merchant ? (
        <Empty description={loading ? '正在加载商户档案...' : '暂无商户档案'} />
      ) : (
        <Tabs
          items={[
            {
              key: 'overview',
              label: '总览',
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Space wrap size="large">
                    <Statistic title="门店数" value={profile.storeCount || 0} />
                    <Statistic title="启用门店" value={profile.activeStoreCount || 0} />
                    <Statistic title="设备数" value={profile.deviceCount || 0} />
                    <Statistic title="有效合同" value={profile.activeContractCount || 0} />
                    <Statistic title="待审资质" value={profile.pendingQualificationCount || 0} />
                    <Statistic title="待审账户" value={profile.pendingSettlementAccountCount || 0} />
                  </Space>
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="商户编号">{merchant.merchantCode}</Descriptions.Item>
                    <Descriptions.Item label="主体类型">{renderStatusTag(merchant.merchantType, merchantTypeMap)}</Descriptions.Item>
                    <Descriptions.Item label="合同状态">{renderStatusTag(merchant.contractStatus, contractStatusMap)}</Descriptions.Item>
                    <Descriptions.Item label="商户状态">{renderStatusTag(merchant.status, statusMap)}</Descriptions.Item>
                    <Descriptions.Item label="联系人">{merchant.contactName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="联系电话">{merchant.contactPhone || '-'}</Descriptions.Item>
                  </Descriptions>
                  <List
                    header="档案风险提示"
                    bordered
                    dataSource={risks.length ? risks : ['当前商户主档、联系人、合同、结算账户和门店档案暂无明显缺口']}
                    renderItem={(item) => <List.Item><Tag color={risks.length ? 'warning' : 'success'}>{item}</Tag></List.Item>}
                  />
                </Space>
              ),
            },
            {
              key: 'base',
              label: '主体资料',
              children: (
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="商户名称">{merchant.merchantName}</Descriptions.Item>
                  <Descriptions.Item label="简称">{merchant.shortName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="统一信用代码">{merchant.creditCode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="覆盖城市">{merchant.cityCoverage || '-'}</Descriptions.Item>
                  <Descriptions.Item label="结算周期">{merchant.settlementCycle || '-'}</Descriptions.Item>
                  <Descriptions.Item label="结算户名">{merchant.settlementAccountName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="结算账号">{maskAccountNo(merchant.settlementAccountNo)}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">{formatDateTime(merchant.createdAt || merchant.createTime)}</Descriptions.Item>
                  <Descriptions.Item label="备注" span={2}>{merchant.remark || '-'}</Descriptions.Item>
                </Descriptions>
              ),
            },
            { key: 'contacts', label: '联系人', children: <Table rowKey="id" columns={contactColumns} dataSource={profile.contacts || []} pagination={false} size="small" /> },
            {
              key: 'files',
              label: '资质合同',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Table rowKey="id" columns={qualificationColumns} dataSource={profile.qualifications || []} pagination={false} size="small" />
                  <Table rowKey="id" columns={contractColumns} dataSource={profile.contracts || []} pagination={false} size="small" />
                </Space>
              ),
            },
            { key: 'settlement', label: '结算账户', children: <Table rowKey="id" columns={settlementColumns} dataSource={profile.settlementAccounts || []} pagination={false} size="small" /> },
            { key: 'accounts', label: '账号权限', children: <Table rowKey="id" columns={accountColumns} dataSource={profile.accounts || []} pagination={false} size="small" /> },
            { key: 'stores', label: '门店范围', children: <Table rowKey="id" columns={storeColumns} dataSource={profile.stores || []} pagination={false} size="small" /> },
            {
              key: 'changes',
              label: '变更轨迹',
              children: (
                <Table
                  rowKey="id"
                  columns={changeColumns}
                  dataSource={profile.changeLogs || []}
                  pagination={{ pageSize: 8 }}
                  size="small"
                  expandable={{
                    expandedRowRender: (record) => <ChangeDiffTable record={record} />,
                    rowExpandable: (record) => buildDiffRows(record).length > 0,
                  }}
                />
              ),
            },
          ]}
        />
      )}
    </Drawer>
  );
};

export default MerchantFullProfileDrawer;
