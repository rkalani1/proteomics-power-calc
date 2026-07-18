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
  const format = (v: number) => (decimals > 0 ? v.toFixed(decimals) : String(v));

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
    setDraft(format(value));
    setIsFocused(true);
  };

  // Handle text input changes - allow free typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
  };

  // Parse, clamp, and commit the typed value (invalid input is ignored, so the
  // field reverts to the current value once focus is lost).
  const applyValue = () => {
    const newValue = parseFloat(draft);
    if (!isNaN(newValue)) {
      onChange(Math.min(max, Math.max(min, newValue)));
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
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label htmlFor={rangeId} className="text-sm font-medium text-gray-700">{label}</label>
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
          className="w-28 px-2 py-1.5 text-right text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
        className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-thumb"
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`
        }}
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{decimals > 0 ? min.toFixed(decimals) : min.toLocaleString()}{unit}</span>
        <span>{decimals > 0 ? max.toFixed(decimals) : max.toLocaleString()}{unit}</span>
      </div>
      {description && <p id={descId} className="text-xs text-gray-500">{description}</p>}
    </div>
  );
};
