import type React from 'react';

interface OperatorTipItem {
  label: string;
  desc: string;
  tag?: string;
}

interface OperatorTipsProps {
  title?: string;
  items: OperatorTipItem[];
}

const OperatorTips: React.FC<OperatorTipsProps> = () => null;

export default OperatorTips;
