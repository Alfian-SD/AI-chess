'use client';

import React from 'react';

export const Mascot: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="arena-mascot"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '20px',
        width: '64px',
        height: '64px',
        zIndex: 40,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
      >
        {/* Antenna */}
        <circle cx="32" cy="7" r="3" fill="#60a5fa" />
        <line x1="32" y1="10" x2="32" y2="16" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />

        {/* Head */}
        <rect x="18" y="16" width="28" height="22" rx="7" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />

        {/* Visor Screen */}
        <rect x="22" y="21" width="20" height="12" rx="4" fill="#0f172a" />

        {/* Glowing Eyes */}
        <circle cx="27" cy="27" r="2.5" fill="#38bdf8" />
        <circle cx="37" cy="27" r="2.5" fill="#38bdf8" />

        {/* Headphones / Ears */}
        <rect x="14" y="22" width="4" height="10" rx="2" fill="#3b82f6" />
        <rect x="46" y="22" width="4" height="10" rx="2" fill="#3b82f6" />

        {/* Body Neck */}
        <rect x="29" y="38" width="6" height="4" fill="#1d4ed8" />

        {/* Body */}
        <rect x="20" y="42" width="24" height="16" rx="6" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />

        {/* Chest Display (Chess Piece Icon or Heart) */}
        <circle cx="32" cy="50" r="4" fill="#0284c7" />
        <path d="M32 47v6M29 50h6" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" />

        {/* Arms */}
        <rect x="13" y="44" width="6" height="10" rx="3" fill="#2563eb" />
        <rect x="45" y="44" width="6" height="10" rx="3" fill="#2563eb" />
      </svg>
      <style>{`
        @media (max-width: 900px) {
          .arena-mascot {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
