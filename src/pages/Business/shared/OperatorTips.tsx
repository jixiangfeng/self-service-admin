import React from 'react';
import { Card, Tag } from 'antd';

interface OperatorTipItem {
  label: string;
  desc: string;
  tag?: string;
}

interface OperatorTipsProps {
  title?: string;
  items: OperatorTipItem[];
}

const OperatorTips: React.FC<OperatorTipsProps> = ({ title = '运营常用操作', items }) => (
  <Card className="operator-tips" variant="borderless">
    <div className="operator-tips__title">{title}</div>
    <div className="operator-tips__grid">
      {items.map((item) => (
        <div className="operator-tips__item" key={item.label}>
          <div className="operator-tips__item-head">
            <span>{item.label}</span>
            {item.tag ? <Tag color="processing">{item.tag}</Tag> : null}
          </div>
          <div className="operator-tips__desc">{item.desc}</div>
        </div>
      ))}
    </div>
  </Card>
);

export default OperatorTips;
