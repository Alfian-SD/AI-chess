import React, { useState, useEffect } from 'react';
import { PlayerConfig, ProviderType } from '../../lib/types';
import {
  PRESET_OPTIONS,
  maskApiKey,
  saveSettings,
  clearAllSettings,
  loadSavedSettings,
  MOCK_WHITE_PLAYER,
  MOCK_BLACK_PLAYER,
} from '../../lib/settings';
import { testEndpointConnection, TestConnectionResult } from '../../lib/llm-client';
import {
  X,
  Eye,
  EyeOff,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Shield,
  Trash2,
  Activity,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  whiteConfig: PlayerConfig;
  blackConfig: PlayerConfig;
  mockEnabled: boolean;
  onSave: (white: PlayerConfig, black: PlayerConfig, mockEnabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  whiteConfig,
  blackConfig,
  mockEnabled,
  onSave,
}) => {
  const [wConfig, setWConfig] = useState<PlayerConfig>({ ...whiteConfig });
  const [bConfig, setBConfig] = useState<PlayerConfig>({ ...blackConfig });
  const [showKeyW, setShowKeyW] = useState(false);
  const [showKeyB, setShowKeyB] = useState(false);
  const [useSameSettings, setUseSameSettings] = useState(false);
  const [rememberOnDevice, setRememberOnDevice] = useState(false);
  const [isMockMode, setIsMockMode] = useState(mockEnabled);

  // Connection testing states
  const [testingW, setTestingW] = useState(false);
  const [testResultW, setTestResultW] = useState<TestConnectionResult | null>(null);
  const [testingB, setTestingB] = useState(false);
  const [testResultB, setTestResultB] = useState<TestConnectionResult | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = loadSavedSettings();
      setWConfig({ ...whiteConfig });
      setBConfig({ ...blackConfig });
      setUseSameSettings(saved.useSameSettings);
      setRememberOnDevice(saved.rememberOnDevice);
      setIsMockMode(mockEnabled);
      setTestResultW(null);
      setTestResultB(null);
      setStatusMsg(null);
    }
  }, [isOpen, whiteConfig, blackConfig, mockEnabled]);

  if (!isOpen) return null;

  const handlePresetSelect = (color: 'w' | 'b', presetId: string) => {
    const preset = PRESET_OPTIONS.find((p) => p.id === presetId);
    if (!preset) return;

    const patch: Partial<PlayerConfig> = {
      provider: preset.provider,
      baseUrl: preset.baseUrl,
      model: preset.model,
      temperature: preset.temperature,
    };

    if (color === 'w') {
      const updated = { ...wConfig, ...patch };
      setWConfig(updated);
      if (useSameSettings) {
        setBConfig({
          ...bConfig,
          ...patch,
          apiKey: updated.apiKey,
        });
      }
    } else {
      setBConfig((prev) => ({ ...prev, ...patch }));
    }
  };

  const handleWhiteChange = (patch: Partial<PlayerConfig>) => {
    const updated = { ...wConfig, ...patch };
    setWConfig(updated);
    if (useSameSettings) {
      setBConfig((prev) => ({
        ...prev,
        baseUrl: updated.baseUrl,
        apiKey: updated.apiKey,
        model: updated.model,
        temperature: updated.temperature,
        maxTokens: updated.maxTokens,
        extraHeaders: updated.extraHeaders,
      }));
    }
  };

  const handleTestConnection = async (color: 'w' | 'b') => {
    const target = color === 'w' ? wConfig : bConfig;
    if (color === 'w') {
      setTestingW(true);
      setTestResultW(null);
      const res = await testEndpointConnection(target);
      setTestResultW(res);
      setTestingW(false);
    } else {
      setTestingB(true);
      setTestResultB(null);
      const res = await testEndpointConnection(target);
      setTestResultB(res);
      setTestingB(false);
    }
  };

  const handleSave = () => {
    let finalWhite = { ...wConfig };
    let finalBlack = { ...bConfig };

    if (isMockMode) {
      finalWhite = { ...MOCK_WHITE_PLAYER, displayName: wConfig.displayName || 'Mock White' };
      finalBlack = { ...MOCK_BLACK_PLAYER, displayName: bConfig.displayName || 'Mock Black' };
    } else if (useSameSettings) {
      finalBlack = {
        ...finalBlack,
        baseUrl: finalWhite.baseUrl,
        apiKey: finalWhite.apiKey,
        model: finalWhite.model,
        temperature: finalWhite.temperature,
        maxTokens: finalWhite.maxTokens,
        extraHeaders: finalWhite.extraHeaders,
      };
    }

    saveSettings({
      white: finalWhite,
      black: finalBlack,
      useSameSettings,
      rememberOnDevice,
      mockEnabled: isMockMode,
    });

    onSave(finalWhite, finalBlack, isMockMode);
    onClose();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all settings and erase API keys from this browser?')) {
      clearAllSettings();
      setWConfig({
        displayName: 'White',
        provider: 'openai',
        model: '',
        baseUrl: '',
        apiKey: '',
        temperature: 0.7,
      });
      setBConfig({
        displayName: 'Black',
        provider: 'openai',
        model: '',
        baseUrl: '',
        apiKey: '',
        temperature: 0.7,
      });
      setIsMockMode(false);
      setTestResultW(null);
      setTestResultB(null);
      setStatusMsg({ type: 'info', text: 'All settings and keys wiped from storage.' });
    }
  };

  const renderPlayerForm = (
    color: 'w' | 'b',
    config: PlayerConfig,
    onChange: (patch: Partial<PlayerConfig>) => void,
    showKey: boolean,
    setShowKey: (val: boolean) => void,
    testing: boolean,
    testResult: TestConnectionResult | null,
    onTest: () => void,
    disabled = false
  ) => {
    const isWhite = color === 'w';
    const label = isWhite ? 'White Player (Putih)' : 'Black Player (Hitam)';
    const dotColor = isWhite ? '#ffffff' : '#777777';

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
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: dotColor,
                display: 'inline-block',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{label}</h3>
          </div>
          {disabled && (
            <span style={{ fontSize: '10px', color: 'var(--accent-strong)', fontFamily: 'var(--font-mono)' }}>
              SYNCED WITH WHITE
            </span>
          )}
        </div>

        {/* Preset Selector */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Fill from Preset (fills URL & model only, no keys)
          </label>
          <select
            style={{
              width: '100%',
              padding: '7px 10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '12px',
            }}
            onChange={(e) => handlePresetSelect(color, e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              -- Select Provider Preset --
            </option>
            {PRESET_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
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
            placeholder={isWhite ? 'e.g. Grandmaster White' : 'e.g. Grandmaster Black'}
            value={config.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            style={{
              width: '100%',
              padding: '7px 10px',
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
            Endpoint Base URL (OpenAI-compatible)
          </label>
          <input
            type="text"
            placeholder="https://api.openai.com/v1"
            value={config.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            style={{
              width: '100%',
              padding: '7px 10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        {/* API Key */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>API Key</label>
            {config.apiKey && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Saved: {maskApiKey(config.apiKey)}
              </span>
            )}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="Enter API key"
              value={config.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              style={{
                width: '100%',
                padding: '7px 34px 7px 10px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Model Identifier */}
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Model Name
          </label>
          <input
            type="text"
            placeholder="e.g. gpt-4o, claude-3-5-sonnet, llama3.2"
            value={config.model}
            onChange={(e) => onChange({ model: e.target.value })}
            style={{
              width: '100%',
              padding: '7px 10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        {/* Optional parameters: Temperature & Max Tokens */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
              Temperature: {(config.temperature ?? 0.7).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.05"
              value={config.temperature ?? 0.7}
              onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
              Max Tokens
            </label>
            <input
              type="number"
              placeholder="1024"
              value={config.maxTokens ?? 1024}
              onChange={(e) => onChange({ maxTokens: parseInt(e.target.value, 10) || undefined })}
              style={{
                width: '100%',
                padding: '4px 8px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text)',
                fontSize: '11px',
              }}
            />
          </div>
        </div>

        {/* Optional Custom Headers (JSON) */}
        <div>
          <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
            Extra Headers (Optional JSON, e.g. {`{"HTTP-Referer":"..."}`})
          </label>
          <input
            type="text"
            placeholder='{"X-Custom-Header": "value"}'
            value={config.extraHeaders || ''}
            onChange={(e) => onChange({ extraHeaders: e.target.value || undefined })}
            style={{
              width: '100%',
              padding: '5px 8px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        {/* Test Connection Button & Status */}
        <div style={{ marginTop: '4px' }}>
          <button
            type="button"
            onClick={onTest}
            disabled={testing}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '7px 12px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: testing ? 'wait' : 'pointer',
            }}
          >
            <Activity size={13} color="var(--accent-strong)" />
            <span>{testing ? 'Testing connection...' : 'Test Connection'}</span>
          </button>

          {testResult && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                backgroundColor: testResult.success ? 'rgba(125, 138, 94, 0.15)' : 'rgba(192, 86, 75, 0.15)',
                border: `1px solid ${testResult.success ? 'var(--accent)' : 'var(--danger)'}`,
                color: testResult.success ? 'var(--accent-strong)' : '#f87171',
              }}
            >
              {testResult.success ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} />
                  <span>
                    Success! Connected in <strong>{testResult.latencyMs}ms</strong>
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <AlertTriangle size={14} />
                    <span>{testResult.error || 'Connection Failed'}</span>
                  </div>
                  {testResult.hint && (
                    <p style={{ margin: 0, fontSize: '10px', color: 'var(--text)', opacity: 0.85, lineHeight: 1.4 }}>
                      {testResult.hint}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
          maxWidth: '780px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
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
            <Sliders size={18} color="var(--accent-strong)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Configure Endpoints & Players</h2>
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

        {/* Global Controls & Toggles Banner */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            {/* Same settings for both players */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={useSameSettings}
                disabled={isMockMode}
                onChange={(e) => {
                  setUseSameSettings(e.target.checked);
                  if (e.target.checked) {
                    setBConfig({
                      ...bConfig,
                      baseUrl: wConfig.baseUrl,
                      apiKey: wConfig.apiKey,
                      model: wConfig.model,
                      temperature: wConfig.temperature,
                      maxTokens: wConfig.maxTokens,
                      extraHeaders: wConfig.extraHeaders,
                    });
                  }
                }}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span>Use same endpoint settings for both players</span>
            </label>

            {/* Mock Provider toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                color: isMockMode ? '#ea9a2a' : 'var(--text)',
                fontWeight: isMockMode ? 600 : 400,
              }}
            >
              <input
                type="checkbox"
                checked={isMockMode}
                onChange={(e) => setIsMockMode(e.target.checked)}
                style={{ accentColor: '#ea9a2a', cursor: 'pointer' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={14} color={isMockMode ? '#ea9a2a' : 'var(--text-muted)'} />
                <span>Mock Provider (Offline UI Testing, No Keys Required)</span>
              </span>
            </label>
          </div>

          {/* Storage persistence option */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={rememberOnDevice}
                onChange={(e) => setRememberOnDevice(e.target.checked)}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span>Remember on this device (Save to localStorage)</span>
            </label>
            {rememberOnDevice && (
              <span style={{ fontSize: '11px', color: '#ea9a2a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} />
                <span>Warning: Keys are stored unencrypted in this browser.</span>
              </span>
            )}
          </div>
        </div>

        {/* Mock Mode Alert Banner if active */}
        {isMockMode && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(234, 154, 42, 0.15)',
              borderBottom: '1px solid rgba(234, 154, 42, 0.3)',
              fontSize: '12px',
              color: '#ea9a2a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>
              <strong>MOCK MODE ACTIVE:</strong> Moves and thoughts are generated offline in the browser for testing.
              Every move will be tagged with [MOCK].
            </span>
          </div>
        )}

        {/* Body Forms */}
        <div
          style={{
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            overflowY: 'auto',
          }}
        >
          {renderPlayerForm(
            'w',
            wConfig,
            handleWhiteChange,
            showKeyW,
            setShowKeyW,
            testingW,
            testResultW,
            () => handleTestConnection('w'),
            isMockMode
          )}
          {renderPlayerForm(
            'b',
            bConfig,
            (patch) => setBConfig((prev) => ({ ...prev, ...patch })),
            showKeyB,
            setShowKeyB,
            testingB,
            testResultB,
            () => handleTestConnection('b'),
            isMockMode || useSameSettings
          )}
        </div>

        {/* Privacy & Security Note */}
        <div
          style={{
            padding: '8px 20px',
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
          <span>
            <strong>Privacy Note:</strong> Your API key stays in your browser and is sent only to the endpoint you
            entered. This project has no server.
          </span>
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(192, 86, 75, 0.4)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--danger)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={13} />
            <span>Clear all settings</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
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
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '8px 22px',
                backgroundColor: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-control)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
