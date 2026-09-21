import React from 'react';

/** A full-bleed, hand-built warehouse illustration for the login page's
 * brand panel - no external image assets are available to this app, so
 * this stands in for a photograph the way the reference design uses one.
 * Racks recede into a "horizon" for depth, and a pallet of boxes with a
 * worker standing beside it is the large foreground "hero" (in a fixed
 * hi-vis amber that pops against the always-dark brand panel, the same
 * way a warm dress pops against a blue mountain photo). A few drifting
 * box shapes stand in for clouds. Fixed colors throughout, not theme
 * tokens: this panel is permanently dark in both app themes. */
export default function WarehouseScene() {
  return (
    <svg
      className="warehouse-scene"
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ws-sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060b16" />
          <stop offset="55%" stopColor="#0f1e38" />
          <stop offset="100%" stopColor="#1d3a63" />
        </linearGradient>
        <radialGradient id="ws-glow" cx="50%" cy="72%" r="55%">
          <stop offset="0%" stopColor="#2f5aa0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2f5aa0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ws-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1a30" />
          <stop offset="100%" stopColor="#060d1a" />
        </linearGradient>
      </defs>

      <rect width="800" height="1000" fill="url(#ws-sky2)" />
      <ellipse cx="400" cy="740" rx="420" ry="260" fill="url(#ws-glow)" />

      {/* drifting box shapes, standing in for clouds */}
      <g fill="#ffffff" opacity="0.08">
        <rect x="90" y="120" width="46" height="34" rx="3" transform="rotate(-8 113 137)" />
        <rect x="620" y="90" width="60" height="42" rx="3" transform="rotate(6 650 111)" />
        <rect x="520" y="210" width="34" height="26" rx="3" transform="rotate(-4 537 223)" />
        <rect x="150" y="260" width="38" height="28" rx="3" transform="rotate(10 169 274)" />
      </g>

      {/* distant racks, receding toward a horizon */}
      <g fill="#274873" opacity="0.45">
        {[70, 210, 350, 490, 630].map((x, i) => (
          <g key={x} transform={`translate(${x} ${560 + (i % 2 === 0 ? 0 : 18)})`}>
            <rect x="0" y="0" width="70" height="150" fill="#213f68" />
            <rect x="6" y="14" width="20" height="16" fill="#3a5f92" />
            <rect x="30" y="14" width="20" height="16" fill="#3a5f92" />
            <rect x="6" y="46" width="20" height="16" fill="#3a5f92" />
            <rect x="30" y="46" width="20" height="16" fill="#3a5f92" />
            <rect x="6" y="78" width="20" height="16" fill="#3a5f92" />
            <rect x="30" y="78" width="20" height="16" fill="#3a5f92" />
          </g>
        ))}
      </g>

      {/* warehouse floor */}
      <rect x="0" y="710" width="800" height="290" fill="url(#ws-floor)" />
      <g stroke="#26456f" strokeWidth="1.5" opacity="0.4">
        <line x1="0" y1="760" x2="800" y2="760" />
        <line x1="0" y1="820" x2="800" y2="820" />
        <line x1="0" y1="900" x2="800" y2="900" />
      </g>

      {/* foreground racks, framing the scene */}
      <g opacity="0.9">
        <g transform="translate(-40 470)">
          <rect x="0" y="0" width="150" height="330" fill="#213f68" />
          <rect x="0" y="0" width="150" height="330" fill="#2b4d7c" opacity="0.85" />
          {[0, 1, 2, 3].map(row => (
            <g key={row} transform={`translate(0 ${24 + row * 76})`}>
              <rect x="12" y="0" width="126" height="6" fill="#0e2038" />
              <rect x="18" y="-38" width="34" height="34" rx="2" fill="#f2a53c" opacity="0.9" />
              <rect x="60" y="-38" width="34" height="34" rx="2" fill="#5b9cff" opacity="0.75" />
              <rect x="102" y="-38" width="30" height="34" rx="2" fill="#e8ecf4" opacity="0.55" />
            </g>
          ))}
        </g>
        <g transform="translate(690 470)">
          <rect x="0" y="0" width="150" height="330" fill="#213f68" />
          <rect x="0" y="0" width="150" height="330" fill="#2b4d7c" opacity="0.85" />
          {[0, 1, 2, 3].map(row => (
            <g key={row} transform={`translate(0 ${24 + row * 76})`}>
              <rect x="12" y="0" width="126" height="6" fill="#0e2038" />
              <rect x="18" y="-38" width="34" height="34" rx="2" fill="#5b9cff" opacity="0.75" />
              <rect x="60" y="-38" width="30" height="34" rx="2" fill="#e8ecf4" opacity="0.55" />
              <rect x="100" y="-38" width="34" height="34" rx="2" fill="#f2a53c" opacity="0.9" />
            </g>
          ))}
        </g>
      </g>

      {/* hero: a large pallet of boxes, with a worker standing beside it -
          simple, solid-color flat shapes throughout (no rotated limbs or
          hand-drawn arcs) so the figure stays legible at any size. */}
      <g transform="translate(330 660)">
        <ellipse cx="90" cy="290" rx="180" ry="20" fill="#010509" opacity="0.4" />

        {/* pallet */}
        <g transform="translate(0 250)">
          <rect x="-10" y="18" width="220" height="14" rx="2" fill="#16294a" />
          <rect x="4" y="0" width="16" height="18" fill="#0e2038" />
          <rect x="92" y="0" width="16" height="18" fill="#0e2038" />
          <rect x="180" y="0" width="16" height="18" fill="#0e2038" />
        </g>

        {/* stacked boxes */}
        <rect x="10" y="80" width="180" height="90" rx="3" fill="#f2a53c" />
        <rect x="10" y="80" width="180" height="90" rx="3" fill="none" stroke="#c47f1f" strokeWidth="3" />
        <line x1="100" y1="80" x2="100" y2="170" stroke="#c47f1f" strokeWidth="3" />

        <rect x="26" y="6" width="120" height="80" rx="3" fill="#5b9cff" />
        <rect x="26" y="6" width="120" height="80" rx="3" fill="none" stroke="#2f6fd6" strokeWidth="3" />
        <line x1="86" y1="6" x2="86" y2="86" stroke="#2f6fd6" strokeWidth="3" />

        <rect x="52" y="-56" width="68" height="68" rx="3" fill="#e8ecf4" />
        <rect x="52" y="-56" width="68" height="68" rx="3" fill="none" stroke="#b9c3d6" strokeWidth="3" />

        {/* worker, standing beside the stack */}
        <g transform="translate(258 30)">
          <rect x="-16" y="150" width="18" height="86" rx="6" fill="#0e2038" />
          <rect x="4" y="150" width="18" height="86" rx="6" fill="#16294a" />
          <rect x="-20" y="230" width="26" height="14" rx="4" fill="#060d18" />
          <rect x="0" y="230" width="26" height="14" rx="4" fill="#0a1526" />

          <rect x="-30" y="66" width="60" height="92" rx="14" fill="#f2a53c" />
          <rect x="-30" y="66" width="14" height="92" rx="7" fill="#e08f24" />
          <rect x="-26" y="88" width="52" height="8" fill="#fff6e0" opacity="0.9" />
          <rect x="-26" y="114" width="52" height="8" fill="#fff6e0" opacity="0.9" />

          <rect x="-46" y="72" width="16" height="62" rx="8" fill="#e08f24" />
          <rect x="30" y="72" width="16" height="62" rx="8" fill="#f2a53c" />

          <circle cx="0" cy="30" r="24" fill="#c98a5e" />
          <ellipse cx="0" cy="8" rx="26" ry="15" fill="#eef2f8" />
          <rect x="-29" y="8" width="58" height="6" rx="3" fill="#c3cbd9" />
        </g>
      </g>
    </svg>
  );
}
