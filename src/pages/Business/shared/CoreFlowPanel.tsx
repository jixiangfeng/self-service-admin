import type React from 'react';

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

const CoreFlowPanel: React.FC<CoreFlowPanelProps> = () => null;

export default CoreFlowPanel;
