import React from 'react';
import { ArrowLeftRight, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { TransactionType } from '../api';

const CONFIG: Record<TransactionType, { icon: React.ReactNode; bg: string; color: string; label: string }> = {
  stock_in: { icon: <Plus size={14} />, bg: 'var(--success-soft)', color: 'var(--success)', label: 'Stock Added' },
  stock_out: { icon: <Minus size={14} />, bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Stock Removed' },
  adjustment: {
    icon: <SlidersHorizontal size={14} />,
    bg: 'var(--warning-soft)',
    color: 'var(--warning)',
    label: 'Adjustment',
  },
  transfer_out: {
    icon: <ArrowLeftRight size={14} />,
    bg: 'var(--accent-soft)',
    color: 'var(--accent)',
    label: 'Transfer',
  },
  transfer_in: {
    icon: <ArrowLeftRight size={14} />,
    bg: 'var(--accent-soft)',
    color: 'var(--accent)',
    label: 'Transfer',
  },
};

export function activityConfig(type: TransactionType) {
  return CONFIG[type];
}

export default function ActivityIcon({ type }: { type: TransactionType }) {
  const config = CONFIG[type];
  return (
    <span className="act-icon" style={{ background: config.bg, color: config.color }}>
      {config.icon}
    </span>
  );
}
