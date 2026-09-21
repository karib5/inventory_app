import React from 'react';

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="stats">
      {Array.from({ length: count }).map((_, i) => (
        <div className="card" key={i}>
          <span className="skeleton skeleton-circle" />
          <div style={{ flex: 1 }}>
            <span className="skeleton" style={{ display: 'block', height: 22, width: '60%', marginBottom: 6 }} />
            <span className="skeleton" style={{ display: 'block', height: 11, width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="card">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <span className="skeleton skeleton-thumb" />
          <div style={{ flex: 1 }}>
            <span className="skeleton" style={{ display: 'block', height: 13, width: '45%', marginBottom: 6 }} />
            <span className="skeleton" style={{ display: 'block', height: 11, width: '25%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
