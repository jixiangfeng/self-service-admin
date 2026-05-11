import React from 'react';
import { Button, Image, Space, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/services/backendService';

export interface OssImageUploadProps {
  value?: string;
  onChange?: (value?: string) => void;
  multiple?: boolean;
  prefix?: string;
  placeholder?: string;
  returnField?: 'url' | 'assetId';
}

const splitUrls = (value?: string) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const joinUrls = (urls: string[]) => urls.filter(Boolean).join(',');

const OssImageUpload: React.FC<OssImageUploadProps> = ({
  value,
  onChange,
  multiple = false,
  prefix = 'images',
  placeholder = '上传图片',
  returnField = 'url',
}) => {
  const urls = splitUrls(value);

  const uploadProps: UploadProps = {
    showUploadList: false,
    accept: 'image/*',
    multiple,
    beforeUpload: async (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('仅支持上传图片文件');
        return Upload.LIST_IGNORE;
      }
      const isLt10M = file.size / 1024 / 1024 <= 10;
      if (!isLt10M) {
        message.error('图片大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      try {
        const result = await api.file.assets.uploadImage(file, prefix);
        const uploadedValue = returnField === 'assetId' ? result.data.fileAssetId : result.data.fileUrl;
        if (!uploadedValue) {
          message.error('上传成功但未返回文件信息');
          return Upload.LIST_IGNORE;
        }
        onChange?.(multiple ? joinUrls([...urls, uploadedValue]) : uploadedValue);
        message.success('图片上传成功');
      } catch {
        // request 拦截器已提示错误
      }
      return Upload.LIST_IGNORE;
    },
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Upload {...uploadProps}>
        <Button icon={<PlusOutlined />}>{placeholder}</Button>
      </Upload>
      {urls.length ? (
        <Space wrap>
          {urls.map((url) => (
            url.startsWith('http') ? (
              <Image key={url} src={url} width={88} height={88} style={{ objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <span key={url}>{url}</span>
            )
          ))}
        </Space>
      ) : null}
    </Space>
  );
};

export default OssImageUpload;
