import React from 'react';
import type { ModalProps } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';

interface BusinessDetailModalProps extends Omit<ModalProps, 'title'> {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode[];
  sectionTitle?: React.ReactNode;
  sectionDesc?: React.ReactNode;
  children: React.ReactNode;
}

const resolveMetaTitle = (title: React.ReactNode) => (typeof title === 'string' ? title : '详情记录');

const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  title,
  eyebrow = '详情查看',
  subtitle = '核对当前记录的关键字段、状态和关联信息，用于运营处理和审计追溯。',
  meta,
  sectionTitle = '业务记录',
  sectionDesc = '按业务含义展示字段，方便核对门店、设备、订单、资产或配置记录。',
  width = 820,
  footer = null,
  wrapClassName,
  children,
  ...modalProps
}) => (
  <BusinessEditorModal
    {...modalProps}
    eyebrow={eyebrow}
    title={title}
    subtitle={subtitle}
    meta={meta || [resolveMetaTitle(title), '只读']}
    width={width}
    footer={footer}
    wrapClassName={['business-detail-modal', wrapClassName].filter(Boolean).join(' ')}
  >
    <BusinessEditorSection icon={<EyeOutlined />} title={sectionTitle} desc={sectionDesc}>
      <div className="business-detail-content">
        {children}
      </div>
    </BusinessEditorSection>
  </BusinessEditorModal>
);

export default BusinessDetailModal;
