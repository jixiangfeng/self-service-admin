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
  eyebrow,
  title,
  subtitle,
  meta,
  wrapClassName,
  children,
  ...modalProps
}) => {
  const mergedWrapClassName = ['merchant-editor-modal', 'business-modal--continuous', wrapClassName].filter(Boolean).join(' ');

  return (
    <Modal
      forceRender
      {...modalProps}
      wrapClassName={mergedWrapClassName}
      title={(
        <div className="merchant-editor-modal-header">
          <div>
            {eyebrow ? <div className="merchant-editor-modal-header__eyebrow">{eyebrow}</div> : null}
            <div className="merchant-editor-modal-header__title">{title}</div>
            {subtitle ? <div className="merchant-editor-modal-header__subtitle">{subtitle}</div> : null}
            {meta?.length ? (
              <div className="merchant-editor-modal-header__meta">
                {meta.map((item, index) => <span key={index}>{item}</span>)}
              </div>
            ) : null}
          </div>
        </div>
      )}
    >
      {children}
    </Modal>
  );
};

export default BusinessEditorModal;
