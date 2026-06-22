import type { CustomModel } from '../../store/useStore'

export interface ModelOption {
  value: string
  label: string
  soon?: boolean
}

export interface ModelGroup {
  group: string
  options: ModelOption[]
}

// Only used for Anthropic (no public /models endpoint).
// All other providers fetch models dynamically via ai-list-models.
export const KNOWN_ANTHROPIC_MODELS: ModelOption[] = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
]

export const PROVIDERS: ModelGroup[] = [
  {
    group: 'Proveedor',
    options: [
      { value: 'openrouter', label: 'OpenRouter' },
      { value: 'nim', label: 'NVIDIA NIM' },
      { value: 'ollama', label: 'Ollama local/nube' },
      { value: 'lmstudio', label: 'LM Studio local' },
      { value: 'openai', label: 'OpenAI' },
      { value: 'anthropic', label: 'Anthropic' },
      { value: 'google', label: 'Google' },
      { value: 'deepseek', label: 'DeepSeek' },
      { value: 'kimi', label: 'Kimi' },
      { value: 'qwen', label: 'Qwen' },
    ],
  },
]

export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com',
  deepseek: 'https://api.deepseek.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  nim: 'https://integrate.api.nvidia.com',
  kimi: 'https://api.moonshot.cn/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
}

export const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  nim: 'NVIDIA NIM',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  kimi: 'Kimi (Moonshot)',
  qwen: 'Qwen (Alibaba)',
}

export const isLocalModel = (model: string) =>
  model.startsWith('ollama:') || model.startsWith('lmstudio:')

export function getProviderFromModel(model: string) {
  if (model.startsWith('openrouter:')) return 'openrouter'
  if (model.startsWith('nim:')) return 'nim'
  if (model.startsWith('deepseek:')) return 'deepseek'
  if (model.startsWith('kimi:')) return 'kimi'
  if (model.startsWith('qwen:')) return 'qwen'
  if (model.startsWith('ollama:')) return 'ollama'
  if (model.startsWith('lmstudio:')) return 'lmstudio'
  if (model.startsWith('gpt') || model.startsWith('o') || model.startsWith('openai:')) return 'openai'
  if (model.startsWith('claude') || model.startsWith('anthropic:')) return 'anthropic'
  if (model.startsWith('gemini') || model.startsWith('google:')) return 'google'
  return 'custom'
}

export function getStoredApiKey(model: string, fallback?: string) {
  const provider = getProviderFromModel(model)
  const modelId = model.includes(':') ? model.split(':').slice(1).join(':') : model
  return (
    localStorage.getItem(`cipher-api-key-${model}`) ||
    localStorage.getItem(`cipher-model-api-key-${model}`) ||
    localStorage.getItem(`cipher-model-api-key-${provider}:${modelId}`) ||
    localStorage.getItem(`cipher-provider-api-key-${provider}`) ||
    fallback ||
    ''
  )
}

export function getStoredProviderKey(provider: string): string {
  return (
    localStorage.getItem(`cipher-provider-api-key-${provider}`) ||
    ''
  )
}

export function setStoredProviderKey(provider: string, key: string): void {
  localStorage.setItem(`cipher-provider-api-key-${provider}`, key)
}

/** Cache key for dynamically fetched models */
export function modelCacheKey(provider: string): string {
  return `cipher-models-${provider}`
}

export function getCachedModels(provider: string): { id: string; name: string }[] {
  try {
    const raw = localStorage.getItem(modelCacheKey(provider))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setCachedModels(provider: string, models: { id: string; name: string }[]): void {
  localStorage.setItem(modelCacheKey(provider), JSON.stringify(models))
}

export function resolveCustomModel(
  value: string,
  customModels: CustomModel[]
): { model: string; savedKey: string | undefined } {
  if (!value.startsWith('custom:')) return { model: value, savedKey: undefined }
  const index = Number(value.replace('custom:', ''))
  const custom = customModels[index]
  if (!custom) return { model: value, savedKey: undefined }
  // If custom endpoint is set, pass it to backend via pipe-delimited format
  if (custom.url) {
    return { model: `${custom.provider}|${custom.url}|${custom.modelId}`, savedKey: custom.key }
  }
  // If openai-compatible without special url, keep legacy format
  if (custom.provider === 'openai-compatible') {
    return { model: `openai-compatible||${custom.modelId}`, savedKey: custom.key }
  }
  return { model: `${custom.provider}:${custom.modelId}`, savedKey: custom.key }
}
