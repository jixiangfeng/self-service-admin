import type { ReactNode } from 'react';
import { Card } from 'antd';

interface PageBannerProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}

const PageBanner: React.FC<PageBannerProps> = ({ title, subtitle, icon }) => (
  <Card className="page-banner" variant="borderless">
    <div className="page-banner__content">
      {icon ? <div className="page-banner__icon">{icon}</div> : null}
      <div className="page-banner__text">
        <div className="page-banner__title">{title}</div>
        {subtitle ? <div className="page-banner__subtitle">{subtitle}</div> : null}
      </div>
    </div>
  </Card>
);

export default PageBanner;
