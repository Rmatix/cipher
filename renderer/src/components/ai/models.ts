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

export const STATIC_MODELS: ModelGroup[] = [
  {
    group: 'Anthropic',
    options: [
      { value: 'claude-opus-4-5', label: 'Claude Opus 4.5', soon: true },
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', soon: true },
      { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', soon: true },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    ],
  },
  {
    group: 'OpenAI',
    options: [
      { value: 'gpt-4.1', label: 'GPT-4.1', soon: true },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', soon: true },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'o3', label: 'o3' },
      { value: 'o4-mini', label: 'o4-mini', soon: true },
      { value: 'o3-mini', label: 'o3-mini' },
      { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview' },
    ],
  },
  {
    group: 'Google',
    options: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
  {
    group: 'DeepSeek',
    options: [
      { value: 'deepseek-chat', label: 'DeepSeek V3 (Chat)' },
      { value: 'deepseek-reasoner', label: 'DeepSeek R1 (Reasoner)' },
    ],
  },
  {
    group: 'Kimi (Moonshot)',
    options: [
      { value: 'kimi:moonshot-v1-8k', label: 'Kimi v1 8k' },
      { value: 'kimi:moonshot-v1-32k', label: 'Kimi v1 32k' },
      { value: 'kimi:moonshot-v1-128k', label: 'Kimi v1 128k' },
      { value: 'kimi:kimi-vl-a3b-thinking', label: 'Kimi VL Thinking', soon: true },
    ],
  },
  {
    group: 'Qwen (Alibaba)',
    options: [
      { value: 'qwen:qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen:qwen-turbo', label: 'Qwen Turbo' },
      { value: 'qwen:qwen-max', label: 'Qwen Max' },
      { value: 'qwen:qwen2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B' },
      { value: 'qwen:qwq-32b', label: 'QwQ 32B' },
    ],
  },
  {
    group: 'LM Studio (local)',
    options: [
      { value: 'lmstudio:local', label: 'Modelo activo' },
    ],
  },
]

export const PROVIDERS: ModelGroup[] = [
  {
    group: 'Proveedor',
    options: [
      { value: 'openrouter', label: 'OpenRouter' },
      { value: 'nim', label: 'NVIDIA NIM' },
      { value: 'ollama', label: 'Ollama local/nube' },
      { value: 'lmstudio', label: 'LM Studio local' },
      { value: 'openai-compatible', label: 'Compatible OpenAI' },
      { value: 'openai', label: 'OpenAI' },
      { value: 'anthropic', label: 'Anthropic' },
      { value: 'google', label: 'Google' },
      { value: 'deepseek', label: 'DeepSeek' },
      { value: 'kimi', label: 'Kimi' },
      { value: 'qwen', label: 'Qwen' },
    ],
  },
]

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
