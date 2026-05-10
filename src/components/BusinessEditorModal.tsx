import React from 'react';
import { Modal } from 'antd';
import type { ModalProps } from 'antd';

interface BusinessEditorModalProps extends Omit<ModalProps, 'title'> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode[];
}

export const BusinessEditorSection: React.FC<{
  icon?: React.ReactNode;
  title: React.ReactNode;
  desc?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, desc, children }) => (
  <section className="merchant-editor-section">
    <div className="merchant-editor-section__head">
      {icon ? <div className="merchant-editor-section__icon">{icon}</div> : null}
      <div>
        <div className="merchant-editor-section__title">{title}</div>
        {desc ? <div className="merchant-editor-section__desc">{desc}</div> : null}
      </div>
    </div>
    {children}
  </section>
);

const BusinessEditorModal: React.FC<BusinessEditorModalProps> = ({
  eyebrow: _eyebrow,
  title,
  subtitle: _subtitle,
  meta: _meta,
  wrapClassName,
  children,
  ...modalProps
}) => {
  void _eyebrow;
  void _subtitle;
  void _meta;

  const mergedWrapClassName = ['merchant-editor-modal', 'business-modal--continuous', wrapClassName].filter(Boolean).join(' ');

  return (
    <Modal
      {...modalProps}
      wrapClassName={mergedWrapClassName}
      title={(
        <div className="merchant-editor-modal-header">
          <div>
            <div className="merchant-editor-modal-header__title">{title}</div>
          </div>
        </div>
      )}
    >
      {children}
    </Modal>
  );
};

export default BusinessEditorModal;
