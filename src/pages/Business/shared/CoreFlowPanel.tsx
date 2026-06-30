import React from 'react';
import { Button, Card, Space, Tag } from 'antd';

interface ClosureItem {
  label: string;
  desc: string;
  tag?: string;
}

interface ClosureAction {
  key: string;
  label: string;
  type?: 'default' | 'primary';
  onClick?: () => void;
}

interface CoreFlowPanelProps {
  title: string;
  subtitle: string;
  config: ClosureItem[];
  landing: ClosureItem[];
  verify: ClosureItem[];
  actions?: ClosureAction[];
}

const renderItems = (items: ClosureItem[]) => (
  <div className="core-flow-panel__list">
    {items.map((item) => (
      <div className="core-flow-panel__item" key={item.label}>
        <div className="core-flow-panel__item-title">
          <span>{item.label}</span>
          {item.tag ? <Tag color="processing">{item.tag}</Tag> : null}
        </div>
        <div className="core-flow-panel__item-desc">{item.desc}</div>
      </div>
    ))}
  </div>
);

const CoreFlowPanel: React.FC<CoreFlowPanelProps> = ({ title, subtitle, config, landing, verify, actions = [] }) => (
  <Card className="core-flow-panel" variant="borderless">
    <div className="core-flow-panel__header">
      <div>
        <div className="core-flow-panel__title">{title}</div>
        <div className="core-flow-panel__subtitle">{subtitle}</div>
      </div>
      {actions.length ? (
        <Space wrap>
          {actions.map((action) => (
            <Button key={action.key} type={action.type} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </Space>
      ) : null}
    </div>

    <div className="core-flow-panel__grid">
      <section className="core-flow-panel__section">
        <div className="core-flow-panel__section-title">配置要点</div>
        {renderItems(config)}
      </section>
      <section className="core-flow-panel__section">
        <div className="core-flow-panel__section-title">数据落点</div>
        {renderItems(landing)}
      </section>
      <section className="core-flow-panel__section">
        <div className="core-flow-panel__section-title">运营核对</div>
        {renderItems(verify)}
      </section>
    </div>
  </Card>
);

export default CoreFlowPanel;
