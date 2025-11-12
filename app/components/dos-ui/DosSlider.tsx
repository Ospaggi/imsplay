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
  return (
    <div className="dos-slider-container">
      <div className="dos-slider-label">{label}</div>
      <div className="dos-slider-track">
        <input
          type="range"
          className="dos-slider-input"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
        />
      </div>
      <div className="dos-slider-value">
        {value}
        {unit}
      </div>
    </div>
  );
}
