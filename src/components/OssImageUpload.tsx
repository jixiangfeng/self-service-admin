import React from 'react';
import { Button, Image, Space, Tag, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api, { type FileAssetRecord } from '@/services/backendService';

export interface OssImageUploadProps {
  value?: string;
  onChange?: (value?: string) => void;
  onUploaded?: (asset: FileAssetRecord) => void;
  multiple?: boolean;
  prefix?: string;
  placeholder?: string;
  returnField?: 'url' | 'assetId';
  fileKind?: 'image' | 'file';
  accept?: string;
  maxSizeMb?: number;
}

const splitValues = (value?: string) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const joinValues = (values: string[]) => values.filter(Boolean).join(',');
const isImageUrl = (value: string) => /^https?:\/\//.test(value) && /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(value);

const OssImageUpload: React.FC<OssImageUploadProps> = ({
  value,
  onChange,
  onUploaded,
  multiple = false,
  prefix = 'images',
  placeholder = '上传图片',
  returnField = 'url',
  fileKind = 'image',
  accept,
  maxSizeMb,
}) => {
  const values = splitValues(value);
  const resolvedAccept = accept || (fileKind === 'image' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp');
  const resolvedMaxSize = maxSizeMb || (fileKind === 'image' ? 10 : 50);

  const uploadProps: UploadProps = {
    showUploadList: false,
    accept: resolvedAccept,
    multiple,
    beforeUpload: async (file) => {
      const isImage = file.type.startsWith('image/');
      if (fileKind === 'image' && !isImage) {
        message.error('仅支持上传图片文件');
        return Upload.LIST_IGNORE;
      }
      const withinSize = file.size / 1024 / 1024 <= resolvedMaxSize;
      if (!withinSize) {
        message.error(`文件大小不能超过 ${resolvedMaxSize}MB`);
        return Upload.LIST_IGNORE;
      }
      try {
        const result = fileKind === 'image'
          ? await api.file.assets.uploadImage(file, prefix)
          : await api.file.assets.uploadFile(file, prefix);
        const uploadedValue = returnField === 'assetId' ? result.data.fileAssetId : result.data.fileUrl;
        if (!uploadedValue) {
          message.error('上传成功但未返回文件信息');
          return Upload.LIST_IGNORE;
        }
        onChange?.(multiple ? joinValues([...values, uploadedValue]) : uploadedValue);
        onUploaded?.(result.data);
        message.success('上传成功');
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
      {values.length ? (
        <Space wrap>
          {values.map((item) => (
            isImageUrl(item) ? (
              <Image key={item} src={item} width={88} height={88} style={{ objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <Tag key={item}>{item}</Tag>
            )
          ))}
        </Space>
      ) : null}
    </Space>
  );
};

export default OssImageUpload;
