import React from 'react';
import { Descriptions, Drawer, Empty, List, Space, Statistic, Table, Tabs, Tag } from 'antd';
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
const auditStatusMap = buildValueEnum(auditStatusOptions);
const settlementCycleMap = buildValueEnum(settlementCycleOptions);
const statusMap = buildValueEnum(statusOptions);
const primaryFlagMap = {
  1: { color: 'success', text: '是' },
  0: { color: 'default', text: '否' },
};

const maskAccountNo = (value?: string) => {
  if (!value) return '-';
  if (value.length <= 4) return value;
  return `${'*'.repeat(Math.min(value.length - 4, 8))}${value.slice(-4)}`;
};

const renderQualificationExpireAt = (record: MerchantQualificationRecord) => {
  const value = (
    record.expireAt ??
    (record as unknown as Record<string, unknown>).expireDate ??
    (record as unknown as Record<string, unknown>).expireTime ??
    (record as unknown as Record<string, unknown>).expiryDate ??
    (record as unknown as Record<string, unknown>).validEnd ??
    (record as unknown as Record<string, unknown>).validTo ??
    (record as unknown as Record<string, unknown>).endAt ??
    (record as unknown as Record<string, unknown>).expire_at
  );
  return String(value || '-').match(/\d{4}-\d{2}-\d{2}/)?.[0] || String(value || '-');
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
    { title: '备注', dataIndex: 'remark', render: (value) => value || '-' },
  ];

  const qualificationColumns: ColumnsType<MerchantQualificationRecord> = [
    { title: '资质类型', dataIndex: 'qualificationType', render: (_, record) => renderStatusTag(record.qualificationType, qualificationTypeMap) },
    { title: '资质编号', dataIndex: 'qualificationNo' },
    { title: '文件', dataIndex: 'fileName', render: (value) => value || '-' },
    { title: '文件地址', dataIndex: 'fileUrl', ellipsis: true, render: (value) => value || '-' },
    { title: '审核状态', dataIndex: 'auditStatus', render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '状态') },
    { title: '到期日', dataIndex: 'expireAt', render: (_, record) => renderQualificationExpireAt(record) },
    { title: '备注', dataIndex: 'remark', render: (value) => value || '-' },
  ];

  const contractColumns: ColumnsType<MerchantContractRecord> = [
    { title: '合同编号', dataIndex: 'contractNo' },
    { title: '合同名称', dataIndex: 'contractName' },
    { title: '结算周期', dataIndex: 'settlementCycle', render: (_, record) => renderStatusTag(record.settlementCycle, settlementCycleMap) },
    { title: '合同状态', dataIndex: 'contractStatus', render: (_, record) => renderStatusTag(record.contractStatus, contractStatusMap) },
    { title: '审核状态', dataIndex: 'status', render: (_, record) => renderStatusTag(record.status, auditStatusMap) },
    { title: '合同文件', dataIndex: 'fileUrl', ellipsis: true, render: (value) => value || '-' },
    { title: '周期', render: (_, record) => `${record.startAt || '-'} ~ ${record.endAt || '-'}` },
    { title: '备注', dataIndex: 'remark', render: (value) => value || '-' },
  ];

  const settlementColumns: ColumnsType<MerchantSettlementAccountRecord> = [
    { title: '户名', dataIndex: 'accountName' },
    { title: '账号', dataIndex: 'accountNo', render: (value) => maskAccountNo(value) },
    { title: '开户行', dataIndex: 'bankName', render: (value) => value || '-' },
    { title: '审核状态', dataIndex: 'auditStatus', render: (_, record) => renderStatusTag(record.auditStatus, auditStatusMap) },
    { title: '账户状态', dataIndex: 'status', render: (value) => formatEnumText(value, 'status', '账户状态') },
    { title: '生效日期', dataIndex: 'effectiveAt', render: (value) => value || '-' },
    { title: '备注', dataIndex: 'remark', render: (value) => value || '-' },
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
                    <Descriptions.Item label="商户状态">{renderStatusTag(merchant.status, statusMap)}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{formatDateTime(merchant.createdAt || merchant.createTime)}</Descriptions.Item>
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
                  <Descriptions.Item label="创建时间">{formatDateTime(merchant.createdAt || merchant.createTime)}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{formatDateTime(merchant.updatedAt || merchant.updateTime)}</Descriptions.Item>
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
          ]}
        />
      )}
    </Drawer>
  );
};

export default MerchantFullProfileDrawer;
