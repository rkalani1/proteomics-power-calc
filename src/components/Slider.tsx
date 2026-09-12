import React, { useId, useState } from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  description?: string;
  decimals?: number;
}

// Track colours (brand-500 fill on a line-grey rest) mirror the tokens in index.css.
const TRACK_FILL = '#2f8f91';
const TRACK_REST = '#d4dfdf';

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  description = '',
  decimals = 0,
}) => {
  // Display formatting (adds thousands separators for integer sliders); the
  // editing draft uses the plain numeric form so parseFloat can read it back.
  const format = (v: number) => (decimals > 0 ? v.toFixed(decimals) : v.toLocaleString());
  const editable = (v: number) => (decimals > 0 ? v.toFixed(decimals) : String(v));

  // Stable ids so the visible label names the range control and the description
  // is exposed to assistive tech (the inputs would otherwise be unlabeled).
  const uid = useId();
  const rangeId = `${uid}-range`;
  const descId = description ? `${uid}-desc` : undefined;
  const valueText = `${format(value)}${unit}`;

  // Raw text while the field is focused; otherwise the field shows format(value).
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = isFocused ? draft : format(value);

  const handleFocus = () => {
    setDraft(editable(value));
    setIsFocused(true);
  };

  // Handle text input changes - allow free typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
  };

  // Parse, snap to the slider's step grid, clamp, and commit the typed value
  // (invalid input is ignored, so the field reverts to the current value once
  // focus is lost). Snapping keeps typed values on the same grid as the range
  // control — e.g. no fractional event counts on an integer-step slider.
  const applyValue = () => {
    const newValue = parseFloat(draft);
    if (!isNaN(newValue)) {
      const snapped = min + Math.round((newValue - min) / step) * step;
      // Round away float error from the step multiplication (e.g. 0.30000000000000004).
      const cleaned = Number(snapped.toFixed(Math.max(decimals, 6)));
      onChange(Math.min(max, Math.max(min, cleaned)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyValue();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleBlur = () => {
    applyValue();
    setIsFocused(false);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <label htmlFor={rangeId} className="min-w-0 flex-1 text-sm font-semibold leading-snug text-ink">{label}</label>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label={`${label} (exact value)`}
          aria-describedby={descId}
          className="slider-value-input ml-auto"
        />
      </div>
      <input
        id={rangeId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={valueText}
        aria-describedby={descId}
        className="slider-thumb"
        style={{
          background: `linear-gradient(to right, ${TRACK_FILL} 0%, ${TRACK_FILL} ${percentage}%, ${TRACK_REST} ${percentage}%, ${TRACK_REST} 100%)`
        }}
      />
      <div className="flex justify-between text-xs text-ink-muted">
        <span>{decimals > 0 ? min.toFixed(decimals) : min.toLocaleString()}{unit}</span>
        <span>{decimals > 0 ? max.toFixed(decimals) : max.toLocaleString()}{unit}</span>
      </div>
      {description && <p id={descId} className="text-xs leading-relaxed text-ink-soft">{description}</p>}
    </div>
  );
};
