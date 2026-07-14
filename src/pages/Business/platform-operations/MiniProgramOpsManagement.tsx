import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Image, Input, InputNumber, Row, Select, Space, Statistic, Tabs, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, FileTextOutlined, MobileOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statusOptions } from '@/constants/businessCatalog';
import PageBanner from '@/components/PageBanner';
import SchemaDetail, { type DetailField } from '@/components/SchemaDetail';
import BusinessEditorModal, { BusinessEditorSection } from '@/components/BusinessEditorModal';
import OssImageUpload from '@/components/OssImageUpload';
import BusinessDetailModal from '@/components/BusinessDetailModal';
import { showBusinessConfirm } from '@/components/BusinessConfirm';
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag } from '@/pages/Business/shared';
import api, {
  type AgreementContentRecord,
  type BannerConfigRecord,
  type SelectOptionRecord,
} from '@/services/backendService';
import { DateTimeField, fromDateTimePickerValue } from '@/utils/formControls';

type DetailRecord = BannerConfigRecord | AgreementContentRecord;

const slotCodeOptions = [
  { value: 'HOME_TOP_CAROUSEL', label: '首页顶部轮播', pageCode: 'HOME', size: '750×320', consumer: 'pages/home/index.vue', tip: '首页首屏主轮播，建议用于全平台活动和品牌主视觉。' },
  { value: 'HOME_ACTION_BANNER', label: '首页快捷入口下方图', pageCode: 'HOME', size: '702×140', consumer: 'pages/home/index.vue', tip: '首页团购核销、活动、充值等快捷入口下方，附近门店上方，适合放领券入口、购卡入口和短期活动。' },
  { value: 'STORE_LIST_TOP_BANNER', label: '门店列表顶部图', pageCode: 'STORE_LIST', size: '702×180', consumer: 'pages/store-list/index.vue', tip: '门店列表顶部运营图，适合附近门店促销。' },
  { value: 'PROFILE_RECHARGE_BANNER', label: '我的页充值图', pageCode: 'PROFILE', size: '702×220', consumer: 'pages/profile/index.vue', tip: '我的页余额/充值入口图，适合充值引导。' },
  { value: 'ACTIVITY_GIFT_HERO_BANNER', label: '活动页头图', pageCode: 'ACTIVITY_GIFT', size: '702×260', consumer: 'pages/activity-gift/index.vue', tip: '活动广场头图，适合福利集合页。' },
  { value: 'RECHARGE_SUCCESS_BANNER', label: '充值成功图', pageCode: 'RECHARGE_SUCCESS', size: '702×220', consumer: 'pages/recharge-success/index.vue', tip: '充值成功页推荐图，适合二次转化。' },
];

const jumpTypeOptions = [
  { value: 'NONE', label: '不跳转' },
  { value: 'PAGE', label: '小程序页面' },
  { value: 'RECHARGE', label: '充值中心' },
  { value: 'PRODUCT', label: '服务卡' },
  { value: 'STORE', label: '门店详情' },
  { value: 'GROUPON', label: '团购核销' },
  { value: 'WEBVIEW', label: '网页链接' },
  { value: 'URL', label: '外部链接' },
  { value: 'PHONE', label: '拨打电话' },
];

const agreementTypeOptions = [
  { value: 'USER_PRIVACY', label: '用户隐私协议' },
  { value: 'SERVICE', label: '服务协议' },
  { value: 'RECHARGE', label: '充值协议' },
  { value: 'REFUND', label: '退款规则' },
];

const statusMap = buildValueEnum(statusOptions);
const slotMap = buildValueEnum(slotCodeOptions);
const jumpTypeMap = buildValueEnum(jumpTypeOptions);
const agreementTypeMap = buildValueEnum(agreementTypeOptions);

const slotMetaMap = slotCodeOptions.reduce<Record<string, typeof slotCodeOptions[number]>>((acc, item) => {
  acc[item.value] = item;
  return acc;
}, {});

const pagePathOptions = [
  { value: '/pages/home/index', label: '首页' },
  { value: '/pages/store-list/index', label: '门店列表' },
  { value: '/pages/profile/index', label: '我的页' },
  { value: '/pages/activity-gift/index', label: '活动广场' },
  { value: '/pages/recharge-center/index', label: '充值中心' },
  { value: '/pages/invite-guide/index', label: '邀请活动' },
  { value: '/pages/contact-service/index', label: '联系客服' },
  { value: '/pages/help-center/index', label: '帮助中心' },
];

const unwrapOptionData = (value?: SelectOptionRecord[] | { data?: SelectOptionRecord[] }) =>
  Array.isArray(value) ? value : (value?.data || []);
const toSelectOptions = (options?: SelectOptionRecord[] | { data?: SelectOptionRecord[] }) =>
  unwrapOptionData(options).map((item) => ({ value: String(item.value), label: item.label }));
const optionLabel = (options: { value: string; label: string }[], value?: string) => options.find((item) => item.value === value)?.label || value;
const miniOpsDetailFields: Record<'banner' | 'agreement', DetailField<Record<string, unknown>>[]> = {
  banner: [
    { name: 'bannerName', label: 'Banner 名称' },
    { name: 'slotCode', label: '运营位', render: (value) => optionLabel(slotCodeOptions, value) || value || '-' },
    { name: 'title', label: '展示标题' },
    { name: 'subtitle', label: '展示副标题' },
    { name: 'imageUrl', label: '图片URL' },
    { name: 'jumpType', label: '跳转类型', render: (value) => optionLabel(jumpTypeOptions, value) || value || '-' },
    { name: 'jumpValue', label: '跳转值' },
    { name: 'sortNo', label: '排序' },
    { name: 'status', label: '状态' },
    { name: 'startAt', label: '开始时间', render: (value) => formatDateTime(value) },
    { name: 'endAt', label: '结束时间', render: (value) => formatDateTime(value) },
  ],
  agreement: [
    { name: 'agreementType', label: '协议类型' },
    { name: 'title', label: '标题' },
    { name: 'versionNo', label: '版本号' },
    { name: 'content', label: '协议正文' },
    { name: 'effectiveAt', label: '生效时间', render: (value) => formatDateTime(value) },
    { name: 'status', label: '状态' },
  ],
};

const MiniProgramOpsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingRecord, setEditingRecord] = useState<DetailRecord | null>(null);
  const [form] = Form.useForm();

  const queryParams = useMemo(() => ({ keyword, current: 1, size: 50 }), [keyword]);
  const bannersQuery = useQuery({ queryKey: ['banner-configs', queryParams], queryFn: () => api.miniProgramOps.banners.page(queryParams) });
  const agreementsQuery = useQuery({ queryKey: ['agreement-contents', queryParams], queryFn: () => api.miniProgramOps.agreements.page(queryParams) });
  const storeOptionsQuery = useQuery({ queryKey: ['mini-ops-store-options'], queryFn: () => api.store.options() });
  const serviceCardOptionsQuery = useQuery({ queryKey: ['mini-ops-service-card-options'], queryFn: () => api.asset.serviceCards.options() });

  const watchedSlotCode = Form.useWatch('slotCode', form);
  const watchedJumpType = Form.useWatch('jumpType', form);
  const watchedImageUrl = Form.useWatch('imageUrl', form);
  const watchedTitle = Form.useWatch('title', form);
  const watchedSubtitle = Form.useWatch('subtitle', form);
  const watchedStatus = Form.useWatch('status', form);

  const banners = bannersQuery.data?.data.records ?? [];
  const agreements = agreementsQuery.data?.data.records ?? [];
  const currentSlotMeta = watchedSlotCode ? slotMetaMap[watchedSlotCode] : undefined;
  const jumpValueOptions = useMemo(() => {
    if (watchedJumpType === 'PAGE') return pagePathOptions;
    if (watchedJumpType === 'STORE') return toSelectOptions(storeOptionsQuery.data || []);
    if (watchedJumpType === 'PRODUCT') return toSelectOptions(serviceCardOptionsQuery.data || []);
    if (watchedJumpType === 'RECHARGE') return [{ value: '/pages/recharge-center/index', label: '充值中心' }];
    if (watchedJumpType === 'GROUPON') return [{ value: '/pages/group-code-verify/index', label: '团购核销页' }];
    return [];
  }, [watchedJumpType, storeOptionsQuery.data, serviceCardOptionsQuery.data]);

  const openModal = (title: string, record?: DetailRecord) => {
    setModalTitle(title);
    setEditingRecord(record || null);
    form.resetFields();
    const defaults = { slotCode: 'HOME_TOP_CAROUSEL', jumpType: 'NONE', agreementType: 'SERVICE', sortNo: 1, status: 1 };
    if (!record) {
      form.setFieldsValue(defaults);
    } else if ('bannerName' in record) {
      form.setFieldsValue({ ...defaults, ...record, name: record.bannerName });
    } else {
      form.setFieldsValue({ ...defaults, ...record, name: record.title });
    }
    setModalVisible(true);
  };

  const handleSlotCodeChange = (slotCode: string) => {
    const slotMeta = slotMetaMap[slotCode];
    if (slotMeta) {
      form.setFieldsValue({ slotCode, pageCode: slotMeta.pageCode });
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (modalTitle === '新建 Banner') {
      const payload = {
        id: editingRecord?.id,
        bannerName: values.name,
        pageCode: values.pageCode || 'HOME',
        slotCode: values.slotCode,
        title: values.title,
        subtitle: values.subtitle,
        imageUrl: values.imageUrl,
        jumpType: values.jumpType || 'NONE',
        jumpValue: values.jumpValue,
        startAt: fromDateTimePickerValue(values.startAt) || values.startAt,
        endAt: fromDateTimePickerValue(values.endAt) || values.endAt,
        sortNo: Number(values.sortNo ?? 0),
        status: values.status,
      };
      editingRecord ? await api.miniProgramOps.banners.edit(payload) : await api.miniProgramOps.banners.add(payload);
      await queryClient.invalidateQueries({ queryKey: ['banner-configs'] });
    } else if (modalTitle === '新建协议版本') {
      const payload = {
        id: editingRecord?.id,
        agreementType: values.agreementType || 'SERVICE',
        title: values.name,
        content: values.content,
        versionNo: values.versionNo,
        effectiveAt: fromDateTimePickerValue(values.effectiveAt) || values.effectiveAt,
        status: values.status,
      };
      editingRecord ? await api.miniProgramOps.agreements.edit(payload) : await api.miniProgramOps.agreements.add(payload);
      await queryClient.invalidateQueries({ queryKey: ['agreement-contents'] });
    }
    closeModal();
    message.success(editingRecord ? '已更新小程序运营配置' : '已保存到后端');
  };

  const removeConfig = (type: 'banner' | 'agreement', record: DetailRecord) => {
    const title = type === 'banner' ? '删除 Banner' : '删除协议版本';
    const content = type === 'banner'
        ? `删除后对应小程序运营位将回退为空或默认图：${(record as BannerConfigRecord).bannerName}`
        : `删除后小程序无法再读取该协议版本：${(record as AgreementContentRecord).title}`;
    showBusinessConfirm({
      title,
      content,
      okText: '确认删除',
      onOk: async () => {
        if (type === 'banner') {
          await api.miniProgramOps.banners.remove(record.id);
          await queryClient.invalidateQueries({ queryKey: ['banner-configs'] });
        } else {
          await api.miniProgramOps.agreements.remove(record.id);
          await queryClient.invalidateQueries({ queryKey: ['agreement-contents'] });
        }
        message.success('已删除配置');
      },
    });
  };

  const bannerColumns = useMemo<ProColumns<BannerConfigRecord>[]>(() => [
    { title: 'Banner 名称', dataIndex: 'bannerName', width: 180, fixed: 'left' },
    { title: '运营位', dataIndex: 'slotCode', width: 180, render: (_, record) => renderStatusTag(record.slotCode, slotMap) },
    { title: '展示标题', dataIndex: 'title', width: 160, ellipsis: true },
    { title: '图片URL', dataIndex: 'imageUrl', width: 220, ellipsis: true },
    { title: '跳转类型', dataIndex: 'jumpType', width: 120, render: (_, record) => renderStatusTag(record.jumpType, jumpTypeMap) },
    { title: '跳转值', dataIndex: 'jumpValue', width: 220 },
    { title: '开始时间', dataIndex: 'startAt', width: 180, render: (_, record) => formatDateTime(record.startAt) },
    { title: '结束时间', dataIndex: 'endAt', width: 180, render: (_, record) => formatDateTime(record.endAt) },
    { title: '排序', dataIndex: 'sortNo', width: 90 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', valueType: 'option', width: 180, fixed: 'right', render: (_, record) => <Space size={6}><a key="detail" onClick={() => setDetail(record)}>详情</a><a key="edit" onClick={() => openModal('新建 Banner', record)}><EditOutlined /> 编辑</a><a key="delete" onClick={() => removeConfig('banner', record)}><DeleteOutlined /> 删除</a></Space> },
  ], []);

  const agreementColumns = useMemo<ProColumns<AgreementContentRecord>[]>(() => [
    { title: '协议类型', dataIndex: 'agreementType', width: 160, render: (_, record) => renderStatusTag(record.agreementType, agreementTypeMap) },
    { title: '标题', dataIndex: 'title', width: 180 },
    { title: '版本号', dataIndex: 'versionNo', width: 130 },
    { title: '协议内容', dataIndex: 'content', width: 340, ellipsis: true, render: (_, record) => record.content || '-' },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', valueType: 'option', width: 180, fixed: 'right', render: (_, record) => <Space size={6}><a key="detail" onClick={() => setDetail(record)}>详情</a><a key="edit" onClick={() => openModal('新建协议版本', record)}><EditOutlined /> 编辑</a><a key="delete" onClick={() => removeConfig('agreement', record)}><DeleteOutlined /> 删除</a></Space> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="小程序运营配置" icon={<MobileOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={8}><Card><Statistic title="上线 Banner" value={banners.filter((item) => item.status === 1).length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={8}><Card><Statistic title="协议版本" value={agreements.length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={8}><Card><Statistic title="启用配置" value={banners.filter((item) => item.status === 1).length + agreements.filter((item) => item.status === 1).length} suffix="项" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="页面 / Banner / 协议"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'banner', label: 'Banner 配置', children: <ProTable<BannerConfigRecord> cardBordered rowKey="id" columns={bannerColumns} dataSource={banners} loading={bannersQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1900 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('新建 Banner')}>新建 Banner</Button>]} /> },
          { key: 'agreement', label: '协议内容', children: <ProTable<AgreementContentRecord> cardBordered rowKey="id" columns={agreementColumns} dataSource={agreements} loading={agreementsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('新建协议版本')}>新建协议</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="小程序运营配置详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <SchemaDetail
            record={detail as unknown as Record<string, unknown>}
            fields={('bannerName' in detail ? miniOpsDetailFields.banner : miniOpsDetailFields.agreement) as DetailField<Record<string, unknown>>[]}
            column={2}
            labelWidth={110}
          />
        )}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="小程序运营配置"
        title={modalTitle}
        subtitle="维护 Banner 投放和协议版本配置，提交后同步到用户端可读取的运营配置。"
        meta={[modalTitle || '小程序配置', '平台运营']}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={1080}
        okText="保存配置"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<MobileOutlined />} title="基础信息" desc="维护名称、排序和启用状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="例如：首页洗车活动 Banner" /></Form.Item>
                <Form.Item name="sortNo" label="排序"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="1" /></Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
                <Alert type={watchedStatus === 1 ? 'success' : 'warning'} showIcon message={watchedStatus === 1 ? '启用后小程序接口会返回该配置' : '停用后用户端不展示/不生效'} style={{ gridColumn: '1 / -1' }} />
              </div>
            </BusinessEditorSection>
            {modalTitle === '新建 Banner' ? (
              <BusinessEditorSection icon={<PictureOutlined />} title="Banner 投放" desc="配置图片文件、跳转类型和跳转值。">
                <div className="merchant-editor-fields">
                  <Form.Item name="slotCode" label="展示位置" rules={[{ required: true, message: '请选择展示位置' }]}><Select showSearch options={slotCodeOptions} placeholder="请选择小程序中的展示位置" onChange={handleSlotCodeChange} /></Form.Item>
                  <Form.Item name="title" label="展示标题"><Input placeholder="例如：自助洗车限时活动" /></Form.Item>
                  <Form.Item name="subtitle" label="展示副标题"><Input placeholder="例如：扫码即洗，快速便捷" /></Form.Item>
                  <Form.Item name="imageUrl" label="Banner 图片" rules={[{ required: true, message: '请上传 Banner 图片' }]}>
                    <OssImageUpload
                      returnField="url"
                      prefix="mini-program/banners"
                      placeholder="上传 Banner 图片"
                      onUploaded={(asset) => form.setFieldValue('imageUrl', asset.fileUrl)}
                    />
                  </Form.Item>
                  <Form.Item name="jumpType" label="跳转类型"><Select options={jumpTypeOptions} placeholder="请选择跳转类型" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="jumpValue" label="跳转值"><Select showSearch allowClear options={jumpValueOptions} placeholder={jumpValueOptions.length ? '选择业务目标，也可直接输入' : '按跳转类型填写：URL/PHONE 可直接输入'} /></Form.Item>
                  <Form.Item name="startAt" label="开始时间"><DateTimeField /></Form.Item>
                  <Form.Item name="endAt" label="结束时间"><DateTimeField /></Form.Item>
                  <Alert className="merchant-editor-field-span-all" type="info" showIcon message={currentSlotMeta ? `${currentSlotMeta.label} · 建议尺寸 ${currentSlotMeta.size} · ${currentSlotMeta.consumer}` : '选择运营位后会显示推荐尺寸和小程序消费页面'} description={currentSlotMeta?.tip} />
                  <Card className="merchant-editor-field-span-all" size="small" title="用户端预览">
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {watchedImageUrl ? <Image src={watchedImageUrl} height={120} style={{ objectFit: 'cover', borderRadius: 12 }} /> : <div style={{ height: 120, borderRadius: 12, background: '#f3f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a96a8' }}>未上传图片</div>}
                      <Typography.Text strong>{watchedTitle || '展示标题预览'}</Typography.Text>
                      <Typography.Text type="secondary">{watchedSubtitle || '展示副标题预览'}</Typography.Text>
                    </Space>
                  </Card>
                </div>
              </BusinessEditorSection>
            ) : null}
            {modalTitle === '新建协议版本' ? (
              <BusinessEditorSection icon={<FileTextOutlined />} title="协议内容" desc="配置协议类型、版本和用户实际阅读的正文。">
                <div className="merchant-editor-fields">
                  <Form.Item name="agreementType" label="协议类型"><Select options={agreementTypeOptions} placeholder="请选择协议类型" /></Form.Item>
                  <Form.Item name="versionNo" label="版本号" rules={[{ required: true, message: '请输入协议版本号' }]}><Input placeholder="例如：V2026062801" /></Form.Item>
                  <Form.Item name="effectiveAt" label="生效时间"><DateTimeField /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="content" label="协议正文" rules={[{ required: true, message: '请输入协议正文' }]}><Input.TextArea rows={10} placeholder="请输入用户需要阅读的完整协议正文" /></Form.Item>
                </div>
              </BusinessEditorSection>
            ) : null}
          </div>
        </Form>
      </BusinessEditorModal>
    </div>
  );
};

export default MiniProgramOpsManagement;
