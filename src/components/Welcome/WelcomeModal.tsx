import React from 'react';
import { Sliders, Sparkles, Shield, Cpu, X, Play } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onEnableMock: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onEnableMock,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '18px',
                  lineHeight: '1',
                  padding: '4px 6px',
                  backgroundColor: 'var(--accent)',
                  borderRadius: '6px',
                  color: '#ffffff',
                }}
              >
                ♚
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                Welcome to AI Chess Arena
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Let them play. Watch two AI models compete with visible live reasoning.
            </p>
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

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text)' }}>
            This is a <strong>100% client-side static web application</strong> hosted on GitHub Pages.
            To watch a match, configure your OpenAI-compatible endpoint or run a local model (Ollama / LM Studio).
            No silent demo or fake moves will be played.
          </p>

          {/* Options Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            {/* Option 1: Configure Endpoints */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} color="var(--accent-strong)" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                  Option A: Configure Model Endpoints (Recommended)
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Enter your OpenAI, OpenRouter, Together, or local (Ollama / LM Studio) endpoint in Settings.
                API keys are kept exclusively in browser memory and sent only to your provider.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--accent)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Sliders size={13} />
                <span>Open Settings</span>
              </button>
            </div>

            {/* Option 2: Mock Provider */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid rgba(234, 154, 42, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#ea9a2a" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ea9a2a' }}>
                  Option B: Test with Offline Mock Provider
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Explore the UI, Stockfish evaluation, and board controls immediately without entering any API keys.
                Moves and thinking are simulated in-browser and labeled with [MOCK].
              </p>
              <button
                type="button"
                onClick={() => {
                  onEnableMock();
                  onClose();
                }}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'rgba(234, 154, 42, 0.2)',
                  border: '1px solid #ea9a2a',
                  borderRadius: '6px',
                  color: '#ea9a2a',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Play size={13} />
                <span>Enable Mock Mode & Try Arena</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Privacy Note */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <Shield size={14} color="var(--accent-strong)" style={{ flexShrink: 0 }} />
          <span>No keys or match data are ever sent to any third-party server. Pure static GitHub Pages app.</span>
        </div>
      </div>
    </div>
  );
};
