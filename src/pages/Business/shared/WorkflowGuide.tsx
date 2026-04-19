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

const WorkflowGuide: React.FC<WorkflowGuideProps> = ({ title, summary, steps, actions = [] }) => (
  <Card
    style={{ marginBottom: 16 }}
    title={title}
    extra={(
      <Space>
        {actions.map((action) => (
          <Button key={action.key} type={action.type} onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
      </Space>
    )}
  >
    <div style={{ marginBottom: 16, color: 'rgba(0, 0, 0, 0.65)' }}>{summary}</div>
    <Steps
      responsive
      items={steps.map((step) => ({
        title: step.title,
        status: step.status,
        description: (
          <div>
            <div>{step.description}</div>
            {step.tag ? <Tag style={{ marginTop: 8 }} color="blue">{step.tag}</Tag> : null}
          </div>
        ),
      }))}
    />
  </Card>
);

export default WorkflowGuide;
