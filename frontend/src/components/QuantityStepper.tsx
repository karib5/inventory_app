import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  quickSteps,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  quickSteps?: number[];
}) {
  function clamp(next: number) {
    return Math.max(min, next);
  }

  return (
    <div>
      <div className="qty-stepper">
        <button type="button" className="icon-btn" onClick={() => onChange(clamp(value - 1))} aria-label="Decrease">
          <Minus size={16} />
        </button>
        <input
          type="number"
          value={value}
          onChange={e => onChange(clamp(Number(e.target.value) || 0))}
          min={min}
        />
        <button type="button" className="icon-btn" onClick={() => onChange(clamp(value + 1))} aria-label="Increase">
          <Plus size={16} />
        </button>
      </div>
      {quickSteps && quickSteps.length > 0 && (
        <div className="qty-quick">
          {quickSteps.map(step => (
            <button type="button" key={step} onClick={() => onChange(clamp(value + step))}>
              +{step}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
