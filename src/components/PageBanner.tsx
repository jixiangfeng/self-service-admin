import React from 'react';

interface PageBannerProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const PageBanner: React.FC<PageBannerProps> = ({ title, subtitle, icon }) => {
  return (
    <div
      className="fade-in"
      style={{
        background:
          'radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 28%), linear-gradient(135deg, #0f766e 0%, #0f4c81 100%)',
        borderRadius: 16,
        padding: '32px 40px',
        marginBottom: 24,
        color: '#fff',
        boxShadow: '0 16px 40px rgba(15, 76, 129, 0.18)',
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && <span style={{ fontSize: 32 }}>{icon}</span>}
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 16, opacity: 0.9 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default PageBanner;
