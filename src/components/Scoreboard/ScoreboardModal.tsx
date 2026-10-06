'use client';

import React, { useState, useEffect } from 'react';
import { ModelPairingStat } from '../../lib/types';
import { getScoreboardStats } from '../../lib/storage';
import { useTranslation } from '../../i18n/LanguageContext';
import { BarChart3, X } from 'lucide-react';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ModelPairingStat[]>([]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setStats(getScoreboardStats());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={18} color="var(--accent-strong)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>{t.scoreboard}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Table Content */}
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {stats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Belum ada data pertandingan untuk papan skor. Selesaikan satu pertandingan untuk mencatat statistik.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                    }}
                  >
                    <th style={{ padding: '8px 12px' }}>Pasangan Model (White vs Black)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Total</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>W / L / D</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Rata-rata Waktu</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Illegal Move Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, idx) => {
                    const whiteIllegalRate = s.whiteTotalMoves > 0
                      ? ((s.whiteIllegalMoves / s.whiteTotalMoves) * 100).toFixed(1)
                      : '0.0';
                    const blackIllegalRate = s.blackTotalMoves > 0
                      ? ((s.blackIllegalMoves / s.blackTotalMoves) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid rgba(42, 42, 42, 0.4)',
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {s.whiteModel} (W)
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                            vs {s.blackModel} (B)
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text)' }}>
                          {s.totalGames}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>{s.whiteWins}</span>
                          <span style={{ color: 'var(--text-muted)' }}> - </span>
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{s.blackWins}</span>
                          <span style={{ color: 'var(--text-muted)' }}> - </span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{s.draws}</span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                          <div>W: {s.whiteAvgLatencyMs} ms</div>
                          <div>B: {s.blackAvgLatencyMs} ms</div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px' }}>
                          <div style={{ color: parseFloat(whiteIllegalRate) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                            W: {whiteIllegalRate}%
                          </div>
                          <div style={{ color: parseFloat(blackIllegalRate) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                            B: {blackIllegalRate}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
