import React from 'react';
import { Button, Card, Space, Steps, Tag } from 'antd';

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

const statusTextMap: Record<NonNullable<WorkflowGuideStep['status']>, string> = {
  finish: '已完成',
  process: '当前重点',
  wait: '下一步',
  error: '需处理',
};

const WorkflowGuide: React.FC<WorkflowGuideProps> = ({ title, summary, steps, actions = [] }) => (
  <Card className="workflow-guide" variant="borderless">
    <div className="workflow-guide__header">
      <div className="workflow-guide__copy">
        <div className="workflow-guide__title">{title}</div>
        <div className="workflow-guide__summary">{summary}</div>
      </div>
      {actions.length ? (
        <Space wrap className="workflow-guide__actions">
          {actions.map((action) => (
            <Button key={action.key} type={action.type} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </Space>
      ) : null}
    </div>

    <Steps
      className="workflow-guide__steps"
      size="small"
      responsive
      items={steps.map((step) => ({
        title: (
          <Space size={6} wrap>
            <span>{step.title}</span>
            {step.tag ? <Tag color={step.status === 'process' ? 'processing' : 'default'}>{step.tag}</Tag> : null}
          </Space>
        ),
        description: (
          <div className="workflow-guide__step-desc">
            <span>{step.description}</span>
            <span className="workflow-guide__status">{statusTextMap[step.status || 'wait']}</span>
          </div>
        ),
        status: step.status,
      }))}
    />
  </Card>
);

export default WorkflowGuide;
