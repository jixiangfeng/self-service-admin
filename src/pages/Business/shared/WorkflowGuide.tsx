import type React from 'react';

export interface WorkflowGuideStep {
  title: string;
  description: string;
  status?: 'wait' | 'process' | 'finish' | 'error';
  tag?: string;
}

interface WorkflowGuideProps {
  title: string;
  summary: string;
  steps: WorkflowGuideStep[];
  actions?: Array<{
    key: string;
    label: string;
    type?: 'default' | 'primary';
    onClick?: () => void;
  }>;
}

const WorkflowGuide: React.FC<WorkflowGuideProps> = () => null;

export default WorkflowGuide;
