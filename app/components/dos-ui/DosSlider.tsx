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
}

export default function DosSlider({
  label,
  value,
  min,
  max,
  onChange,
  unit = "",
}: DosSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="dos-slider-container">
      <div className="dos-slider-label">{label}</div>
      <div className="dos-slider-bar" style={{ position: 'relative' }}>
        <div className="dos-slider-fill" style={{ width: `${percentage}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            margin: 0,
          }}
        />
      </div>
      <div className="dos-slider-value">
        {value}
        {unit}
      </div>
    </div>
  );
}
