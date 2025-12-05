/**
 * DosSlider - DOS 스타일 슬라이더 컴포넌트
 */

interface DosSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  unit?: string;
  onReset?: () => void;
  showReset?: boolean;
  disabled?: boolean;
}

export default function DosSlider({
  label,
  value,
  min,
  max,
  onChange,
  unit = "",
  onReset,
  showReset = false,
  disabled = false,
}: DosSliderProps) {
  return (
    <div className={`dos-slider-container ${disabled ? 'dos-slider-disabled' : ''}`}>
      {showReset && onReset && (
        <button
          onClick={onReset}
          className="dos-reset-button"
          style={{ width: '16px', height: '16px' }}
          title="초기값으로 복원"
          disabled={disabled}
        >
          ↻
        </button>
      )}
      <div className="dos-slider-label">{label}</div>
      <div className="dos-slider-track">
        <input
          type="range"
          className="dos-slider-input"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
        />
      </div>
      <div className="dos-slider-value">
        {value}
        {unit}
      </div>
    </div>
  );
}
