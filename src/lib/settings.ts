import { PlayerConfig, ProviderType } from './types';

const STORAGE_KEY = 'ai_chess_player_settings_v1';
const REMEMBER_KEY = 'ai_chess_remember_device';

export interface SavedSettings {
  white: PlayerConfig;
  black: PlayerConfig;
  useSameSettings: boolean;
  rememberOnDevice: boolean;
  mockEnabled: boolean;
}

export interface PresetOption {
  id: string;
  label: string;
  provider: ProviderType;
  baseUrl: string;
  model: string;
  temperature: number;
}

export const PRESET_OPTIONS: PresetOption[] = [
  {
    id: 'openai',
    label: 'OpenAI (Official)',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.7,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (Multi-model)',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.7,
  },
  {
    id: 'together',
    label: 'Together AI',
    provider: 'together',
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    temperature: 0.7,
  },
  {
    id: 'ollama',
    label: 'Ollama (Localhost:11434)',
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    temperature: 0.7,
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (Localhost:1234)',
    provider: 'lmstudio',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
    temperature: 0.7,
  },
  {
    id: 'custom',
    label: 'Custom OpenAI-Compatible',
    provider: 'custom',
    baseUrl: '',
    model: '',
    temperature: 0.7,
  },
];

export const EMPTY_WHITE_PLAYER: PlayerConfig = {
  displayName: 'White',
  provider: 'openai',
  model: '',
  baseUrl: '',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 1024,
};

export const EMPTY_BLACK_PLAYER: PlayerConfig = {
  displayName: 'Black',
  provider: 'openai',
  model: '',
  baseUrl: '',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 1024,
};

export const MOCK_WHITE_PLAYER: PlayerConfig = {
  displayName: 'Mock White (GM)',
  provider: 'mock',
  model: 'mock-gm',
  baseUrl: '',
  apiKey: '',
  temperature: 0.7,
};

export const MOCK_BLACK_PLAYER: PlayerConfig = {
  displayName: 'Mock Black (Tactician)',
  provider: 'mock',
  model: 'mock-tactician',
  baseUrl: '',
  apiKey: '',
  temperature: 0.7,
};

/**
 * Loads configured settings.
 * Checks sessionStorage first (default per session), then localStorage if remembered.
 * Defaults to completely empty credentials.
 */
export function loadSavedSettings(): SavedSettings {
  if (typeof window === 'undefined') {
    return {
      white: { ...EMPTY_WHITE_PLAYER },
      black: { ...EMPTY_BLACK_PLAYER },
      useSameSettings: false,
      rememberOnDevice: false,
      mockEnabled: false,
    };
  }

  try {
    const rememberOnDevice = localStorage.getItem(REMEMBER_KEY) === 'true';

    let raw: string | null = null;
    if (rememberOnDevice) {
      raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    } else {
      raw = sessionStorage.getItem(STORAGE_KEY);
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        white: { ...EMPTY_WHITE_PLAYER, ...parsed.white },
        black: { ...EMPTY_BLACK_PLAYER, ...parsed.black },
        useSameSettings: Boolean(parsed.useSameSettings),
        rememberOnDevice,
        mockEnabled: Boolean(parsed.mockEnabled),
      };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  return {
    white: { ...EMPTY_WHITE_PLAYER },
    black: { ...EMPTY_BLACK_PLAYER },
    useSameSettings: false,
    rememberOnDevice: false,
    mockEnabled: false,
  };
}

/**
 * Saves settings to browser storage.
 * If rememberOnDevice is true, stores in localStorage.
 * Otherwise, keeps only in sessionStorage.
 */
export function saveSettings(settings: SavedSettings): void {
  if (typeof window === 'undefined') return;

  try {
    const payload = JSON.stringify({
      white: settings.white,
      black: settings.black,
      useSameSettings: settings.useSameSettings,
      mockEnabled: settings.mockEnabled,
    });

    if (settings.rememberOnDevice) {
      localStorage.setItem(STORAGE_KEY, payload);
      localStorage.setItem(REMEMBER_KEY, 'true');
      // Also write to sessionStorage for current tab
      sessionStorage.setItem(STORAGE_KEY, payload);
    } else {
      // Clear localStorage if user deselected "Remember on this device"
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      sessionStorage.setItem(STORAGE_KEY, payload);
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

/**
 * Completely wipes all keys and configurations from browser storage.
 */
export function clearAllSettings(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear settings:', err);
  }
}

/**
 * Masks an API key for safe UI display (shows only the last 4 characters).
 */
export function maskApiKey(key?: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 4) return '••••';
  const last4 = trimmed.slice(-4);
  return `••••••••••••${last4}`;
}

/**
 * Sanitizes a PlayerConfig to strip credentials before persistence or export.
 */
export function sanitizePlayerConfig(config: PlayerConfig): PlayerConfig {
  return {
    ...config,
    apiKey: '', // Strip API key entirely
  };
}

/**
 * Checks if a player config has enough info to attempt live API requests.
 */
export function isPlayerConfigured(player: PlayerConfig, isMockMode = false): boolean {
  if (isMockMode || player.provider === 'mock') return true;
  // Local Ollama or LM Studio might not require an API key, but requires baseUrl and model
  if (player.provider === 'ollama' || player.provider === 'lmstudio') {
    return Boolean(player.baseUrl.trim() && player.model.trim());
  }
  // Standard cloud providers require baseUrl, model, and apiKey
  return Boolean(player.baseUrl.trim() && player.model.trim() && player.apiKey.trim());
}
