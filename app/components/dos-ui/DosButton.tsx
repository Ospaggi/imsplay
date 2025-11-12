/**
 * DosButton - DOS 스타일 버튼 컴포넌트
 */

interface DosButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'play' | 'pause' | 'stop' | 'default';
  className?: string;
  style?: React.CSSProperties;
}

export default function DosButton({
  children,
  onClick,
  disabled = false,
  active = false,
  variant = 'default',
  className = "",
  style,
}: DosButtonProps) {
  const variantClass = variant !== 'default' ? `dos-button-${variant}` : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`dos-button ${active ? 'dos-button-active' : ''} ${variantClass} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}
