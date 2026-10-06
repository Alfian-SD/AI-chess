'use client';

import React, { useState } from 'react';
import { PlayerConfig } from '../../lib/types';
import { useTranslation } from '../../i18n/LanguageContext';
import { X, Settings2 } from 'lucide-react';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  whiteConfig: PlayerConfig;
  blackConfig: PlayerConfig;
  onSave: (white: PlayerConfig, black: PlayerConfig) => void;
}

const PRESETS = [
  { displayName: 'GPT-4o', provider: 'openai', model: 'gpt-4o' },
  { displayName: 'GPT-4o-mini', provider: 'openai', model: 'gpt-4o-mini' },
  { displayName: 'Claude 3.5 Sonnet', provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
  { displayName: 'DeepSeek R1', provider: 'openrouter', model: 'deepseek/deepseek-r1' },
  { displayName: 'Groq Llama 3.3', provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { displayName: 'Mock Grandmaster', provider: 'mock', model: 'mock-gm' },
  { displayName: 'Mock Tactician', provider: 'mock', model: 'mock-tactician' },
  { displayName: 'Mock Illegal (Test Retries)', provider: 'mock', model: 'mock-illegal' },
];

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  whiteConfig,
  blackConfig,
  onSave,
}) => {
  const { t } = useTranslation();

  const [wConfig, setWConfig] = useState<PlayerConfig>(whiteConfig);
  const [bConfig, setBConfig] = useState<PlayerConfig>(blackConfig);

  if (!isOpen) return null;

  const handleApplyPreset = (color: 'w' | 'b', presetIndex: number) => {
    const selected = PRESETS[presetIndex];
    if (color === 'w') {
      setWConfig((prev) => ({
        ...prev,
        displayName: selected.displayName,
        provider: selected.provider as PlayerConfig['provider'],
        model: selected.model,
      }));
    } else {
      setBConfig((prev) => ({
        ...prev,
        displayName: selected.displayName,
        provider: selected.provider as PlayerConfig['provider'],
        model: selected.model,
      }));
    }
  };

  const handleSave = () => {
    onSave(wConfig, bConfig);
    onClose();
  };

  const renderPlayerForm = (color: 'w' | 'b', cfg: PlayerConfig, setCfg: React.Dispatch<React.SetStateAction<PlayerConfig>>) => {
    const label = color === 'w' ? t.modelWhite : t.modelBlack;
    const dotColor = color === 'w' ? '#ffffff' : '#888888';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          backgroundColor: 'var(--surface-2)',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: dotColor,
              display: 'inline-block',
            }}
          />
          <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{label}</h3>
        </div>

        {/* Preset Selector */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Preset
          </label>
          <select
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '12px',
            }}
            onChange={(e) => handleApplyPreset(color, parseInt(e.target.value, 10))}
            defaultValue=""
          >
            <option value="" disabled>-- Pilih Preset --</option>
            {PRESETS.map((p, idx) => (
              <option key={idx} value={idx}>
                {p.displayName} ({p.provider})
              </option>
            ))}
          </select>
        </div>

        {/* Display Name */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Display Name
          </label>
          <input
            type="text"
            value={cfg.displayName}
            onChange={(e) => setCfg({ ...cfg, displayName: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '12px',
            }}
          />
        </div>

        {/* Model ID */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Model Identifier
          </label>
          <input
            type="text"
            value={cfg.model}
            onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '12px',
            }}
          />
        </div>

        {/* Base URL */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Base URL (optional, defaults to https://api.openai.com/v1)
          </label>
          <input
            type="text"
            placeholder="https://api.openai.com/v1"
            value={cfg.baseUrl || ''}
            onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value || undefined })}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '12px',
            }}
          />
        </div>

        {/* API Key Override */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            API Key (optional, defaults to server .env)
          </label>
          <input
            type="password"
            placeholder="sk-..."
            value={cfg.apiKey || ''}
            onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value || undefined })}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '12px',
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
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
          maxWidth: '680px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings2 size={18} color="var(--accent-strong)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>{t.configureModels}</h2>
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

        {/* Body */}
        <div
          style={{
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            overflowY: 'auto',
          }}
        >
          {renderPlayerForm('w', wConfig, setWConfig)}
          {renderPlayerForm('b', bConfig, setBConfig)}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--text-muted)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-control)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};
