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
import { buildValueEnum, formatDateTime, KeywordSearchBar, renderStatusTag, safeJsonParse } from '@/pages/Business/shared';
import api, {
  type AgreementContentRecord,
  type BannerConfigRecord,
  type MiniProgramPageConfigRecord,
  type SelectOptionRecord,
} from '@/services/backendService';
import { DateTimeField, fromDateTimePickerValue } from '@/utils/formControls';

type DetailRecord = MiniProgramPageConfigRecord | BannerConfigRecord | AgreementContentRecord;

const pageCodeOptions = [
  { value: 'HOME', label: '首页' },
  { value: 'STORE_LIST', label: '门店列表' },
  { value: 'PROFILE', label: '我的页' },
  { value: 'ACTIVITY_GIFT', label: '优惠活动' },
  { value: 'RECHARGE_SUCCESS', label: '充值成功页' },
  { value: 'STORE_DETAIL', label: '门店详情' },
  { value: 'CONTACT_SERVICE', label: '联系客服' },
  { value: 'HELP_CENTER', label: '帮助中心' },
  { value: 'FEEDBACK', label: '意见反馈' },
];

const slotCodeOptions = [
  { value: 'HOME_TOP_CAROUSEL', label: '首页顶部轮播', pageCode: 'HOME', size: '750×320', consumer: 'pages/home/index.vue', tip: '首页首屏主轮播，建议用于全平台活动和品牌主视觉。' },
  { value: 'STORE_LIST_TOP_BANNER', label: '门店列表顶部图', pageCode: 'STORE_LIST', size: '702×180', consumer: 'pages/store-list/index.vue', tip: '门店列表顶部运营图，适合附近门店促销。' },
  { value: 'PROFILE_RECHARGE_BANNER', label: '我的页充值图', pageCode: 'PROFILE', size: '702×220', consumer: 'pages/profile/index.vue', tip: '我的页余额/充值入口图，适合充值引导。' },
  { value: 'ACTIVITY_GIFT_HERO_BANNER', label: '活动页头图', pageCode: 'ACTIVITY_GIFT', size: '702×260', consumer: 'pages/activity-gift/index.vue', tip: '活动广场头图，适合福利集合页。' },
  { value: 'RECHARGE_SUCCESS_BANNER', label: '充值成功图', pageCode: 'RECHARGE_SUCCESS', size: '702×220', consumer: 'pages/recharge-success/index.vue', tip: '充值成功页推荐图，适合二次转化。' },
];

const moduleCodeOptions = [
  { value: 'BANNER', label: 'Banner' },
  { value: 'QUICK_ENTRY', label: '金刚区' },
  { value: 'SERVICE', label: '服务模块' },
  { value: 'NOTICE', label: '公告模块' },
  { value: 'SHARE', label: '分享配置' },
  { value: 'CUSTOMER_SERVICE', label: '客服入口' },
  { value: 'CONTACT_SERVICE', label: '联系客服页内容' },
  { value: 'HELP_CENTER', label: '帮助中心内容' },
  { value: 'FEEDBACK_TYPES', label: '反馈问题类型' },
  { value: 'ACTIVITY_COPY', label: '活动页文案' },
  { value: 'VISUAL_ASSET', label: '视觉素材兜底' },
];

const jumpTypeOptions = [
  { value: 'NONE', label: '不跳转' },
  { value: 'PAGE', label: '小程序页面' },
  { value: 'RECHARGE', label: '充值中心' },
  { value: 'SERVICE_CARD', label: '次卡/月卡' },
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
const pageMap = buildValueEnum(pageCodeOptions);
const moduleMap = buildValueEnum(moduleCodeOptions);
const slotMap = buildValueEnum(slotCodeOptions);
const jumpTypeMap = buildValueEnum(jumpTypeOptions);
const agreementTypeMap = buildValueEnum(agreementTypeOptions);
const displayModeOptions = [
  { value: 'SHOW', label: '展示' },
  { value: 'HIDE', label: '隐藏' },
];

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
const parsePageConfig = (configJson?: string) =>
  safeJsonParse<{ displayMode?: string; jumpValue?: string; content?: Record<string, unknown> }>(configJson, {});
const parseAgreementContent = (value?: string) => {
  const parsed = safeJsonParse<Record<string, string>>(value, {});
  if (parsed.contentSummary || parsed.contentPoint) {
    return [parsed.contentSummary, parsed.contentPoint].filter(Boolean).join('；');
  }
  return value || '-';
};

type ContentFieldType = 'text' | 'textarea' | 'tags' | 'image';
type ContentFieldConfig = { name: string; label: string; type?: ContentFieldType; placeholder?: string };

const contentFieldGroups: Record<string, ContentFieldConfig[]> = {
  CONTACT_SERVICE: [
    { name: 'contentHotline', label: '客服电话', placeholder: '400-999-0000' },
    { name: 'contentServiceTime', label: '服务时间', placeholder: '08:00 - 22:00' },
    { name: 'contentFaq', label: '常见问题', type: 'textarea', placeholder: '每行一个问题' },
    { name: 'contentPhoneTitle', label: '电话卡片标题', placeholder: '电话客服' },
    { name: 'contentPhoneDesc', label: '电话卡片说明', placeholder: '订单、充值、设备异常优先处理' },
    { name: 'contentOnlineTitle', label: '留言卡片标题', placeholder: '在线留言' },
    { name: 'contentOnlineUrl', label: '留言跳转页', placeholder: '/pages/feedback/index' },
  ],
  HELP_CENTER: [
    { name: 'contentCategories', label: '帮助分类', type: 'tags', placeholder: '输入后回车，例如 新手指南' },
    { name: 'contentHotQuestion', label: '热门问题', placeholder: '如何开始自助洗车？' },
    { name: 'contentHotAnswer', label: '问题答案', type: 'textarea', placeholder: '到店后点击首页“扫码洗车”...' },
  ],
  FEEDBACK_TYPES: [
    { name: 'contentFeedbackTypes', label: '反馈类型', type: 'tags' },
    { name: 'contentBalanceTabs', label: '余额流水 Tab', type: 'tags' },
  ],
  ACTIVITY_COPY: [
    { name: 'contentTitle', label: '页面标题', placeholder: '活动广场' },
    { name: 'contentDesc', label: '页面副标题', placeholder: '热门福利都在这里' },
    { name: 'contentInviteText', label: '邀请活动文案' },
    { name: 'contentRechargeText', label: '充值活动文案' },
    { name: 'contentCrossStoreText', label: '门店活动文案' },
    { name: 'contentDefaultText', label: '默认活动文案' },
  ],
  VISUAL_ASSET: [
    { name: 'homeTopBanner', label: '首页顶部兜底图', type: 'image' },
    { name: 'storeListTopBanner', label: '门店列表兜底图', type: 'image' },
    { name: 'profileRechargeBanner', label: '我的页充值图', type: 'image' },
    { name: 'profileUserCardBg', label: '我的页用户卡背景', type: 'image' },
    { name: 'inviteHeroBanner', label: '邀请页头图', type: 'image' },
    { name: 'rechargeSuccessBanner', label: '充值成功图', type: 'image' },
    { name: 'balanceCardBg', label: '余额卡背景', type: 'image' },
    { name: 'defaultStorePhoto', label: '默认门店图', type: 'image' },
    { name: 'wechatPayIcon', label: '微信支付图标', type: 'image' },
    { name: 'merchantRevenueCardBg', label: '商户收益卡背景', type: 'image' },
    { name: 'contactMessageIcon', label: '客服留言图标', type: 'image' },
    { name: 'orderMachineIllustration', label: '订单设备插画', type: 'image' },
    { name: 'orderServingBg', label: '服务中背景图', type: 'image' },
  ],
  DEFAULT: [
    { name: 'contentTitle', label: '标题' },
    { name: 'contentDesc', label: '说明', type: 'textarea' },
    { name: 'contentImageUrl', label: '图片 URL', type: 'image' },
    { name: 'contentActionText', label: '按钮文案' },
  ],
};

const splitLines = (value?: string) => String(value || '').split(/\n+/).map((item) => item.trim()).filter(Boolean);
const stringifyLines = (value: unknown) => Array.isArray(value) ? value.join('\n') : String(value || '');
const normalizeTags = (value: unknown): string[] => Array.isArray(value) ? value.map(String).filter(Boolean) : splitLines(String(value || '').replace(/，/g, '\n').replace(/,/g, '\n'));

const pageModuleTemplates: Record<string, Record<string, unknown>> = {
  CONTACT_SERVICE: {
    hotline: '400-999-0000',
    serviceTime: '08:00 - 22:00',
    faq: ['设备扫码后未启动怎么办？', '充值余额是否支持跨门店使用？'],
    cards: [
      { title: '电话客服', desc: '订单、充值、设备异常优先处理', action: '拨打电话', type: 'phone', icon: '/static/materials/profile/phone_icon.svg' },
      { title: '在线留言', desc: '提交问题后客服将在 10 分钟内响应', action: '填写留言', url: '/pages/feedback/index', icon: '' },
    ],
  },
  HELP_CENTER: { categories: ['新手指南', '订单支付', '充值余额', '设备异常', '商户服务'], hot: [{ q: '如何开始自助洗车？', a: '到店后点击首页“扫码洗车”，扫描设备二维码并确认订单即可启动。' }] },
  FEEDBACK_TYPES: { types: ['设备故障', '订单支付', '充值余额', '功能建议'], balanceTabs: ['全部', '充值', '消费', '退款'] },
  ACTIVITY_COPY: { title: '活动广场', desc: '热门福利都在这里，选择活动直接参与', inviteText: '邀请好友，达标返现', rechargeText: '充值满赠，余额更划算', crossStoreText: '门店活动，更多福利可用', defaultText: '限时福利，点击查看' },
  VISUAL_ASSET: {},
};

const contentToFormValues = (moduleCode?: string, content: Record<string, unknown> = {}) => {
  if (moduleCode === 'CONTACT_SERVICE') {
    const cards = Array.isArray(content.cards) ? content.cards as Record<string, unknown>[] : [];
    return {
      contentHotline: content.hotline,
      contentServiceTime: content.serviceTime,
      contentFaq: stringifyLines(content.faq),
      contentPhoneTitle: cards[0]?.title,
      contentPhoneDesc: cards[0]?.desc,
      contentOnlineTitle: cards[1]?.title,
      contentOnlineUrl: cards[1]?.url,
    };
  }
  if (moduleCode === 'HELP_CENTER') {
    const hot = Array.isArray(content.hot) ? content.hot as Record<string, unknown>[] : [];
    return { contentCategories: normalizeTags(content.categories), contentHotQuestion: hot[0]?.q, contentHotAnswer: hot[0]?.a };
  }
  if (moduleCode === 'FEEDBACK_TYPES') return { contentFeedbackTypes: normalizeTags(content.types), contentBalanceTabs: normalizeTags(content.balanceTabs) };
  if (moduleCode === 'ACTIVITY_COPY') return { contentTitle: content.title, contentDesc: content.desc, contentInviteText: content.inviteText, contentRechargeText: content.rechargeText, contentCrossStoreText: content.crossStoreText, contentDefaultText: content.defaultText };
  if (moduleCode === 'VISUAL_ASSET') return content;
  return { contentTitle: content.title, contentDesc: content.desc, contentImageUrl: content.imageUrl, contentActionText: content.actionText };
};

const buildStructuredContent = (moduleCode: string | undefined, values: Record<string, any>) => {
  if (moduleCode === 'CONTACT_SERVICE') return {
    hotline: values.contentHotline || '',
    serviceTime: values.contentServiceTime || '',
    faq: splitLines(values.contentFaq),
    cards: [
      { title: values.contentPhoneTitle || '电话客服', desc: values.contentPhoneDesc || '', action: '拨打电话', type: 'phone', icon: '/static/materials/profile/phone_icon.svg' },
      { title: values.contentOnlineTitle || '在线留言', desc: '提交问题后客服将尽快响应', action: '填写留言', url: values.contentOnlineUrl || '/pages/feedback/index', icon: '' },
    ],
  };
  if (moduleCode === 'HELP_CENTER') return { categories: normalizeTags(values.contentCategories), hot: [{ q: values.contentHotQuestion || '', a: values.contentHotAnswer || '' }] };
  if (moduleCode === 'FEEDBACK_TYPES') return { types: normalizeTags(values.contentFeedbackTypes), balanceTabs: normalizeTags(values.contentBalanceTabs) };
  if (moduleCode === 'ACTIVITY_COPY') return { title: values.contentTitle || '', desc: values.contentDesc || '', inviteText: values.contentInviteText || '', rechargeText: values.contentRechargeText || '', crossStoreText: values.contentCrossStoreText || '', defaultText: values.contentDefaultText || '' };
  if (moduleCode === 'VISUAL_ASSET') return Object.fromEntries(contentFieldGroups.VISUAL_ASSET.map((field) => [field.name, values[field.name] || '']).filter(([, value]) => value));
  return { title: values.contentTitle || '', desc: values.contentDesc || '', imageUrl: values.contentImageUrl || '', actionText: values.contentActionText || '' };
};

const miniOpsDetailFields: Record<'page' | 'banner' | 'agreement', DetailField<Record<string, unknown>>[]> = {
  page: [
    { name: 'pageCode', label: '页面' },
    { name: 'moduleCode', label: '模块' },
    { name: 'moduleName', label: '模块名称' },
    { name: 'displayMode', label: '展示状态', render: (value) => optionLabel(displayModeOptions, value) || '-' },
    { name: 'jumpValue', label: '跳转目标' },
    { name: 'contentJson', label: '运营内容', render: (_value, record) => JSON.stringify(parsePageConfig(String(record.configJson || '')).content || {}, null, 2) },
    { name: 'sortNo', label: '排序' },
    { name: 'status', label: '状态' },
    { name: 'updatedAt', label: '更新时间', render: (value) => formatDateTime(value) },
  ],
  banner: [
    { name: 'bannerName', label: 'Banner 名称' },
    { name: 'pageCode', label: '页面' },
    { name: 'slotCode', label: '运营位', render: (value) => optionLabel(slotCodeOptions, value) || value || '-' },
    { name: 'title', label: '展示标题' },
    { name: 'subtitle', label: '展示副标题' },
    { name: 'imageUrl', label: '图片URL' },
    { name: 'imageFileAssetId', label: '图片文件ID' },
    { name: 'jumpType', label: '跳转类型', render: (value) => optionLabel(jumpTypeOptions, value) || value || '-' },
    { name: 'jumpValue', label: '跳转值' },
    { name: 'sortNo', label: '排序' },
    { name: 'status', label: '状态' },
    { name: 'extraJson', label: '扩展配置' },
    { name: 'startAt', label: '开始时间', render: (value) => formatDateTime(value) },
    { name: 'endAt', label: '结束时间', render: (value) => formatDateTime(value) },
  ],
  agreement: [
    { name: 'agreementType', label: '协议类型' },
    { name: 'title', label: '标题' },
    { name: 'versionNo', label: '版本号' },
    { name: 'content', label: '内容摘要', render: (value) => parseAgreementContent(value) },
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
  const pageConfigsQuery = useQuery({ queryKey: ['mini-program-page-configs', queryParams], queryFn: () => api.miniProgramOps.pageConfigs.page(queryParams) });
  const bannersQuery = useQuery({ queryKey: ['banner-configs', queryParams], queryFn: () => api.miniProgramOps.banners.page(queryParams) });
  const agreementsQuery = useQuery({ queryKey: ['agreement-contents', queryParams], queryFn: () => api.miniProgramOps.agreements.page(queryParams) });
  const storeOptionsQuery = useQuery({ queryKey: ['mini-ops-store-options'], queryFn: () => api.store.options() });
  const serviceCardOptionsQuery = useQuery({ queryKey: ['mini-ops-service-card-options'], queryFn: () => api.asset.serviceCards.options() });

  const watchedPageCode = Form.useWatch('pageCode', form);
  const watchedSlotCode = Form.useWatch('slotCode', form);
  const watchedJumpType = Form.useWatch('jumpType', form);
  const watchedImageUrl = Form.useWatch('imageUrl', form);
  const watchedTitle = Form.useWatch('title', form);
  const watchedSubtitle = Form.useWatch('subtitle', form);
  const watchedDisplayMode = Form.useWatch('displayMode', form);
  const watchedModuleCode = Form.useWatch('moduleCode', form);
  const watchedStatus = Form.useWatch('status', form);

  const pageConfigs = (pageConfigsQuery.data?.data.records ?? []).map((record) => {
    const parsed = parsePageConfig(record.configJson);
    return {
      ...record,
      displayMode: parsed.displayMode,
      jumpValue: parsed.jumpValue,
    };
  });
  const banners = bannersQuery.data?.data.records ?? [];
  const agreements = agreementsQuery.data?.data.records ?? [];
  const filteredSlotOptions = slotCodeOptions.filter((item) => !watchedPageCode || item.pageCode === watchedPageCode);
  const currentSlotMeta = watchedSlotCode ? slotMetaMap[watchedSlotCode] : undefined;
  const jumpValueOptions = useMemo(() => {
    if (watchedJumpType === 'PAGE') return pagePathOptions;
    if (watchedJumpType === 'STORE') return toSelectOptions(storeOptionsQuery.data || []);
    if (watchedJumpType === 'SERVICE_CARD') return toSelectOptions(serviceCardOptionsQuery.data || []);
    if (watchedJumpType === 'RECHARGE') return [{ value: '/pages/recharge-center/index', label: '充值中心' }];
    if (watchedJumpType === 'GROUPON') return [{ value: '/pages/group-code-verify/index', label: '团购核销页' }];
    return [];
  }, [watchedJumpType, storeOptionsQuery.data, serviceCardOptionsQuery.data]);

  const openModal = (title: string, record?: DetailRecord) => {
    setModalTitle(title);
    setEditingRecord(record || null);
    form.resetFields();
    const defaults = { pageCode: 'HOME', slotCode: 'HOME_TOP_CAROUSEL', moduleCode: 'BANNER', jumpType: 'NONE', agreementType: 'SERVICE', displayMode: 'SHOW', sortNo: 1, status: 1 };
    if (!record) {
      form.setFieldsValue({ ...defaults, ...contentToFormValues(defaults.moduleCode, pageModuleTemplates.BANNER || {}) });
    } else if ('moduleCode' in record) {
      const parsed = parsePageConfig(record.configJson);
      form.setFieldsValue({
        ...defaults,
        ...record,
        name: record.moduleName,
        displayMode: parsed.displayMode || 'SHOW',
        jumpValue: parsed.jumpValue || '',
        ...contentToFormValues(record.moduleCode, parsed.content || {}),
      });
    } else if ('bannerName' in record) {
      form.setFieldsValue({ ...defaults, ...record, name: record.bannerName });
    } else {
      const parsed = safeJsonParse<{ contentSummary?: string; contentPoint?: string }>(record.content, {});
      form.setFieldsValue({ ...defaults, ...record, name: record.title, contentSummary: parsed.contentSummary || record.content || '', contentPoint: parsed.contentPoint || '' });
    }
    setModalVisible(true);
  };

  const handlePageCodeChange = (pageCode: string) => {
    const firstSlot = slotCodeOptions.find((item) => item.pageCode === pageCode);
    form.setFieldsValue({ pageCode, slotCode: firstSlot?.value });
  };

  const handleSlotCodeChange = (slotCode: string) => {
    const slotMeta = slotMetaMap[slotCode];
    if (slotMeta) {
      form.setFieldsValue({ slotCode, pageCode: slotMeta.pageCode });
    }
  };

  const handleModuleCodeChange = (moduleCode: string) => {
    const template = pageModuleTemplates[moduleCode] || {};
    form.setFieldsValue({ moduleCode, ...contentToFormValues(moduleCode, template) });
  };

  const fillContentTemplate = () => {
    const moduleCode = watchedModuleCode || 'BANNER';
    const template = pageModuleTemplates[moduleCode] || {};
    form.setFieldsValue(contentToFormValues(moduleCode, template));
    message.success('已填入当前模块结构化模板');
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (modalTitle === '新建页面模块') {
      const payload = {
        id: editingRecord?.id,
        pageCode: values.pageCode || 'HOME',
        moduleCode: values.moduleCode || 'CUSTOM',
        moduleName: values.name,
        configJson: JSON.stringify({
          displayMode: values.displayMode || 'SHOW',
          jumpValue: values.jumpValue || '',
          content: buildStructuredContent(values.moduleCode || 'CUSTOM', values),
        }),
        sortNo: Number(values.sortNo ?? 0),
        status: values.status,
      };
      editingRecord ? await api.miniProgramOps.pageConfigs.edit(payload) : await api.miniProgramOps.pageConfigs.add(payload);
      await queryClient.invalidateQueries({ queryKey: ['mini-program-page-configs'] });
    } else if (modalTitle === '新建 Banner') {
      const payload = {
        id: editingRecord?.id,
        bannerName: values.name,
        pageCode: values.pageCode || 'HOME',
        slotCode: values.slotCode,
        title: values.title,
        subtitle: values.subtitle,
        imageFileAssetId: values.imageFileAssetId,
        imageUrl: values.imageUrl,
        jumpType: values.jumpType || 'NONE',
        jumpValue: values.jumpValue,
        startAt: fromDateTimePickerValue(values.startAt) || values.startAt,
        endAt: fromDateTimePickerValue(values.endAt) || values.endAt,
        sortNo: Number(values.sortNo ?? 0),
        status: values.status,
        extraJson: values.extraJson,
      };
      editingRecord ? await api.miniProgramOps.banners.edit(payload) : await api.miniProgramOps.banners.add(payload);
      await queryClient.invalidateQueries({ queryKey: ['banner-configs'] });
    } else if (modalTitle === '新建协议版本') {
      const payload = {
        id: editingRecord?.id,
        agreementType: values.agreementType || 'SERVICE',
        title: values.name,
        content: JSON.stringify({
          contentSummary: values.contentSummary || '',
          contentPoint: values.contentPoint || '',
        }),
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

  const removeConfig = (type: 'page' | 'banner' | 'agreement', record: DetailRecord) => {
    const title = type === 'page' ? '删除页面模块' : type === 'banner' ? '删除 Banner' : '删除协议版本';
    const content = type === 'page'
      ? `删除后 self-service-app 对应页面将不再读取该模块展示控制：${(record as MiniProgramPageConfigRecord).moduleName}`
      : type === 'banner'
        ? `删除后对应小程序运营位将回退为空或默认图：${(record as BannerConfigRecord).bannerName}`
        : `删除后小程序无法再读取该协议版本：${(record as AgreementContentRecord).title}`;
    showBusinessConfirm({
      title,
      content,
      okText: '确认删除',
      onOk: async () => {
        if (type === 'page') {
          await api.miniProgramOps.pageConfigs.remove(record.id);
          await queryClient.invalidateQueries({ queryKey: ['mini-program-page-configs'] });
        } else if (type === 'banner') {
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

  const pageColumns = useMemo<ProColumns<MiniProgramPageConfigRecord>[]>(() => [
    { title: '页面', dataIndex: 'pageCode', width: 120, render: (_, record) => renderStatusTag(record.pageCode, pageMap) },
    { title: '模块', dataIndex: 'moduleCode', width: 140, render: (_, record) => renderStatusTag(record.moduleCode, moduleMap) },
    { title: '模块名称', dataIndex: 'moduleName', width: 180 },
    { title: '展示状态', dataIndex: 'displayMode', width: 120, render: (_, record) => optionLabel(displayModeOptions, record.displayMode) || '-' },
    { title: '跳转目标', dataIndex: 'jumpValue', width: 260, ellipsis: true },
    { title: '排序', dataIndex: 'sortNo', width: 90 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (_, record) => formatDateTime(record.updatedAt) },
    { title: '操作', valueType: 'option', width: 180, fixed: 'right', render: (_, record) => <Space size={6}><a key="detail" onClick={() => setDetail(record)}>详情</a><a key="edit" onClick={() => openModal('新建页面模块', record)}><EditOutlined /> 编辑</a><a key="delete" onClick={() => removeConfig('page', record)}><DeleteOutlined /> 删除</a></Space> },
  ], []);

  const bannerColumns = useMemo<ProColumns<BannerConfigRecord>[]>(() => [
    { title: 'Banner 名称', dataIndex: 'bannerName', width: 180, fixed: 'left' },
    { title: '页面', dataIndex: 'pageCode', width: 120, render: (_, record) => renderStatusTag(record.pageCode, pageMap) },
    { title: '运营位', dataIndex: 'slotCode', width: 180, render: (_, record) => renderStatusTag(record.slotCode, slotMap) },
    { title: '展示标题', dataIndex: 'title', width: 160, ellipsis: true },
    { title: '图片URL', dataIndex: 'imageUrl', width: 220, ellipsis: true },
    { title: '图片文件ID', dataIndex: 'imageFileAssetId', width: 160, ellipsis: true },
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
    { title: '内容摘要', dataIndex: 'content', width: 340, ellipsis: true, render: (_, record) => parseAgreementContent(record.content) },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 180, render: (_, record) => formatDateTime(record.effectiveAt) },
    { title: '状态', dataIndex: 'status', width: 100, render: (_, record) => renderStatusTag(record.status, statusMap) },
    { title: '操作', valueType: 'option', width: 180, fixed: 'right', render: (_, record) => <Space size={6}><a key="detail" onClick={() => setDetail(record)}>详情</a><a key="edit" onClick={() => openModal('新建协议版本', record)}><EditOutlined /> 编辑</a><a key="delete" onClick={() => removeConfig('agreement', record)}><DeleteOutlined /> 删除</a></Space> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      <PageBanner title="小程序运营配置" icon={<MobileOutlined />} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="页面模块" value={pageConfigs.length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="上线 Banner" value={banners.filter((item) => item.status === 1).length} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="协议版本" value={agreements.length} suffix="份" /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="启用配置" value={pageConfigs.filter((item) => item.status === 1).length + banners.filter((item) => item.status === 1).length} suffix="项" /></Card></Col>
      </Row>

      <KeywordSearchBar
        value={keyword}
        placeholder="页面 / 模块 / Banner / 协议"
        onSearch={setKeyword}
      />

      <Tabs
        items={[
          { key: 'page', label: '页面模块', children: <ProTable<MiniProgramPageConfigRecord> cardBordered rowKey="id" columns={pageColumns} dataSource={pageConfigs} loading={pageConfigsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1300 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('新建页面模块')}>新建模块</Button>]} /> },
          { key: 'banner', label: 'Banner 配置', children: <ProTable<BannerConfigRecord> cardBordered rowKey="id" columns={bannerColumns} dataSource={banners} loading={bannersQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1900 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('新建 Banner')}>新建 Banner</Button>]} /> },
          { key: 'agreement', label: '协议内容', children: <ProTable<AgreementContentRecord> cardBordered rowKey="id" columns={agreementColumns} dataSource={agreements} loading={agreementsQuery.isLoading} search={false} pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => openModal('新建协议版本')}>新建协议</Button>]} /> },
        ]}
      />

      <BusinessDetailModal title="小程序运营配置详情" open={!!detail} onCancel={() => setDetail(null)} width={820}>
        {detail && (
          <SchemaDetail
            record={detail as unknown as Record<string, unknown>}
            fields={('moduleCode' in detail ? miniOpsDetailFields.page : 'bannerName' in detail ? miniOpsDetailFields.banner : miniOpsDetailFields.agreement) as DetailField<Record<string, unknown>>[]}
            column={2}
            labelWidth={110}
          />
        )}
      </BusinessDetailModal>

      <BusinessEditorModal
        eyebrow="小程序运营配置"
        title={modalTitle}
        subtitle="把页面模块、Banner 和协议版本配置拆成运营字段，提交时合并为后端展示配置。"
        meta={[modalTitle || '小程序配置', '平台运营']}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={1080}
        okText="保存配置"
      >
        <Form form={form} layout="vertical" className="merchant-editor-form">
          <div className="merchant-editor-shell">
            <BusinessEditorSection icon={<MobileOutlined />} title="基础信息" desc="维护名称、页面、排序和状态。">
              <div className="merchant-editor-fields">
                <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="例如：首页洗车活动模块" /></Form.Item>
                <Form.Item name="pageCode" label="页面"><Select options={pageCodeOptions} placeholder="请选择页面" onChange={handlePageCodeChange} /></Form.Item>
                <Form.Item name="sortNo" label="排序"><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="1" /></Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}><Select options={statusOptions} placeholder="请选择状态" /></Form.Item>
                <Alert type={watchedStatus === 1 ? 'success' : 'warning'} showIcon message={watchedStatus === 1 ? '启用后小程序接口会返回该配置' : '停用后用户端不展示/不生效'} style={{ gridColumn: '1 / -1' }} />
              </div>
            </BusinessEditorSection>
            {modalTitle === '新建页面模块' ? (
              <BusinessEditorSection icon={<MobileOutlined />} title="页面模块" desc="配置模块类型、展示状态和跳转目标。">
                <div className="merchant-editor-fields">
                  <Form.Item name="moduleCode" label="模块"><Select options={moduleCodeOptions} placeholder="请选择模块" onChange={handleModuleCodeChange} /></Form.Item>
                  <Form.Item name="displayMode" label="展示状态"><Select options={displayModeOptions} placeholder="请选择展示状态" /></Form.Item>
                  <Alert type={watchedDisplayMode === 'HIDE' ? 'warning' : 'info'} showIcon message={watchedDisplayMode === 'HIDE' ? '当前模块将被隐藏，排序和跳转目标不会影响用户端展示。' : '当前模块会展示，建议补充明确跳转目标便于运营验收。'} style={{ gridColumn: '1 / -1' }} />
                  <Form.Item className="merchant-editor-field-span-all" name="jumpValue" label="跳转目标"><Select showSearch allowClear options={pagePathOptions} placeholder="选择常用页面，或直接输入 /pages/store-list/index" /></Form.Item>
                  <Card className="merchant-editor-field-span-all" size="small" title="运营内容结构化配置" extra={<Button size="small" onClick={fillContentTemplate}>填入模板</Button>}>
                    <div className="merchant-editor-fields">
                      {(contentFieldGroups[watchedModuleCode || 'DEFAULT'] || contentFieldGroups.DEFAULT).map((field) => (
                        <Form.Item key={field.name} className={field.type === 'textarea' || field.type === 'image' ? 'merchant-editor-field-span-all' : undefined} name={field.name} label={field.label}>
                          {field.type === 'textarea' ? <Input.TextArea rows={4} placeholder={field.placeholder} /> : field.type === 'tags' ? <Select mode="tags" tokenSeparators={[',', '，']} placeholder={field.placeholder || '输入后回车'} /> : <Input placeholder={field.placeholder || (field.type === 'image' ? '上传图片后自动填入，也可填写 URL' : '')} />}
                        </Form.Item>
                      ))}
                    </div>
                  </Card>
                </div>
              </BusinessEditorSection>
            ) : null}
            {modalTitle === '新建 Banner' ? (
              <BusinessEditorSection icon={<PictureOutlined />} title="Banner 投放" desc="配置图片文件、跳转类型和跳转值。">
                <div className="merchant-editor-fields">
                  <Form.Item name="slotCode" label="运营位" rules={[{ required: true, message: '请选择运营位' }]}><Select showSearch options={filteredSlotOptions} placeholder="先选页面后展示对应运营位" onChange={handleSlotCodeChange} /></Form.Item>
                  <Form.Item name="title" label="展示标题"><Input placeholder="例如：自助洗车限时活动" /></Form.Item>
                  <Form.Item name="subtitle" label="展示副标题"><Input placeholder="例如：扫码即洗，快速便捷" /></Form.Item>
                  <Form.Item name="imageFileAssetId" label="Banner 图片">
                    <OssImageUpload
                      returnField="assetId"
                      prefix="mini-program/banners"
                      placeholder="上传 Banner 图片"
                      onUploaded={(asset) => form.setFieldsValue({ imageFileAssetId: asset.fileAssetId, imageUrl: asset.fileUrl })}
                    />
                  </Form.Item>
                  <Form.Item name="imageUrl" label="图片URL"><Input placeholder="上传图片后自动填入，也可手动填写远程 URL" /></Form.Item>
                  <Form.Item name="jumpType" label="跳转类型"><Select options={jumpTypeOptions} placeholder="请选择跳转类型" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="jumpValue" label="跳转值"><Select showSearch allowClear options={jumpValueOptions} placeholder={jumpValueOptions.length ? '选择业务目标，也可直接输入' : '按跳转类型填写：URL/PHONE 可直接输入'} /></Form.Item>
                  <Form.Item name="startAt" label="开始时间"><DateTimeField /></Form.Item>
                  <Form.Item name="endAt" label="结束时间"><DateTimeField /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="extraJson" label="扩展配置 JSON"><Input.TextArea rows={3} placeholder='例如：{"trackCode":"home_banner"}' /></Form.Item>
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
              <BusinessEditorSection icon={<FileTextOutlined />} title="协议内容" desc="配置协议类型、内容摘要和正文要点。">
                <div className="merchant-editor-fields">
                  <Form.Item name="agreementType" label="协议类型"><Select options={agreementTypeOptions} placeholder="请选择协议类型" /></Form.Item>
                  <Form.Item name="versionNo" label="版本号" rules={[{ required: true, message: '请输入协议版本号' }]}><Input placeholder="例如：V2026062801" /></Form.Item>
                  <Form.Item name="effectiveAt" label="生效时间"><DateTimeField /></Form.Item>
                  <Form.Item name="contentSummary" label="内容摘要"><Input placeholder="例如：充值余额使用和退款规则" /></Form.Item>
                  <Form.Item className="merchant-editor-field-span-all" name="contentPoint" label="正文要点"><Input placeholder="例如：充值余额不可提现，未消费部分按规则退款" /></Form.Item>
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
