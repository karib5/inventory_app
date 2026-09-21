import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  quickSteps,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** When set, the value (and every +N quick step) can never exceed this -
   * used wherever the quantity is drawn from a specific location's actual
   * stock, so you can't type in more than is really there. */
  max?: number;
  quickSteps?: number[];
}) {
  function clamp(next: number) {
    const floored = Math.max(min, next);
    return max != null ? Math.min(floored, max) : floored;
  }

  // If the cap drops below the current value (e.g. the source location
  // changed to one with less stock), pull the value back down to match.
  React.useEffect(() => {
    if (max != null && value > max) onChange(clamp(max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max]);

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
          max={max}
        />
        <button
          type="button"
          className="icon-btn"
          onClick={() => onChange(clamp(value + 1))}
          disabled={max != null && value >= max}
          aria-label="Increase"
        >
          <Plus size={16} />
        </button>
      </div>
      {quickSteps && quickSteps.length > 0 && (
        <div className="qty-quick">
          {quickSteps.map(step => (
            <button
              type="button"
              key={step}
              onClick={() => onChange(clamp(value + step))}
              disabled={max != null && value >= max}
            >
              +{step}
            </button>
          ))}
        </div>
      )}
      {max != null && <p className="location-empty-hint">Max {max} available here.</p>}
    </div>
  );
}
