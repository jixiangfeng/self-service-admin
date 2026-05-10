import React from 'react';
import { Modal } from 'antd';
import { ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface BusinessConfirmOptions {
  title: React.ReactNode;
  content: React.ReactNode;
  onOk: () => void | Promise<void>;
  okText?: string;
  cancelText?: string;
  eyebrow?: React.ReactNode;
  danger?: boolean;
}

export const showBusinessConfirm = (options: BusinessConfirmOptions) => {
  const {
    title,
    content,
    onOk,
    cancelText = '取消',
    danger = true,
  } = options;
  const okText = options.okText || (danger ? '确认删除' : '确认');
  const eyebrow = options.eyebrow || (danger ? '危险操作' : '操作确认');
  const Icon = danger ? ExclamationCircleOutlined : InfoCircleOutlined;

  return Modal.confirm({
    className: `business-confirm-modal ${danger ? 'business-confirm-modal--danger' : 'business-confirm-modal--notice'}`,
    icon: null,
    centered: true,
    width: 500,
    title: (
      <div className="business-confirm-header">
        <div className="business-confirm-header__icon"><Icon /></div>
        <div>
          <div className="business-confirm-header__eyebrow">{eyebrow}</div>
          <div className="business-confirm-header__title">{title}</div>
        </div>
      </div>
    ),
    content: <div className="business-confirm-content">{content}</div>,
    okText,
    cancelText,
    okButtonProps: danger ? { danger: true } : undefined,
    onOk,
  });
};
