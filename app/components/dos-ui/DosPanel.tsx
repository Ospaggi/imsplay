/**
 * DosPanel - DOS 스타일 패널 컴포넌트
 */

interface DosPanelProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function DosPanel({ title, children, className = "", style }: DosPanelProps) {
  return (
    <div className={`dos-panel raised ${className}`} style={style}>
      {title && <div className="dos-panel-title">{title}</div>}
      <div className="dos-panel-content">
        {children}
      </div>
    </div>
  );
}
