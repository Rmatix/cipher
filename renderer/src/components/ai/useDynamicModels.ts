import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getStoredProviderKey,
  getCachedModels,
  setCachedModels,
  KNOWN_ANTHROPIC_MODELS,
} from './models'
import type { ModelGroup } from './models'

export interface DynamicModelEntry {
  id: string
  name: string
}

interface UseDynamicModelsReturn {
  /** Current model groups (one per provider with available models) */
  modelGroups: ModelGroup[]
  /** Whether a fetch is in progress */
  loading: boolean
  /** Force re-fetch all providers (after API key changes) */
  refreshAll: () => void
  /** Refresh a single provider */
  refreshProvider: (provider: string) => void
  /** Per-provider loading state */
  providerLoading: Record<string, boolean>
}

/**
 * Hook that dynamically discovers AI models by provider.
 * Uses cached models from localStorage and refreshes when API keys change.
 */
export function useDynamicModels(customModelGroups: ModelGroup[] = []): UseDynamicModelsReturn {
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [providerLoading, setProviderLoading] = useState<Record<string, boolean>>({})
  const mountedRef = useRef(true)

  const buildGroups = useCallback(async () => {
    if (!mountedRef.current) return

    const providers = [
      'openai', 'anthropic', 'google', 'deepseek',
      'openrouter', 'nim', 'kimi', 'qwen',
      'ollama', 'lmstudio',
    ]

    const groups: ModelGroup[] = []

    for (const provider of providers) {
      const apiKey = getStoredProviderKey(provider)
      const cached = getCachedModels(provider)

      // Anthropic: use known fallback since no /models endpoint
      if (provider === 'anthropic') {
        if (KNOWN_ANTHROPIC_MODELS.length > 0) {
          const groupLabel = 'Anthropic'
          groups.push({
            group: groupLabel,
            options: KNOWN_ANTHROPIC_MODELS.map(m => ({
              value: `anthropic:${m.value}`,
              label: m.label,
            })),
          })
        }
        continue
      }

      // Ollama / LM Studio: always try to detect (local, no API key needed)
      if (provider === 'ollama' || provider === 'lmstudio') {
        if (cached.length > 0) {
          const groupLabel = provider === 'ollama' ? 'Ollama (local)' : 'LM Studio (local)'
          groups.push({
            group: groupLabel,
            options: cached.map(m => ({
              value: `${provider}:${m.id}`,
              label: m.name,
            })),
          })
        }
        continue
      }

      // Cloud providers: only show if API key exists or models are cached
      if (apiKey || cached.length > 0) {
        if (cached.length > 0) {
          const labelMap: Record<string, string> = {
            openai: 'OpenAI',
            google: 'Google Gemini',
            deepseek: 'DeepSeek',
            openrouter: 'OpenRouter',
            nim: 'NVIDIA NIM',
            kimi: 'Kimi (Moonshot)',
            qwen: 'Qwen (Alibaba)',
          }
          groups.push({
            group: labelMap[provider] || provider,
            options: cached.map(m => ({
              value: `${provider}:${m.id}`,
              label: m.name,
            })),
          })
        }
      }
    }

    // Append custom model groups at the end
    if (customModelGroups.length > 0) {
      groups.push(...customModelGroups)
    }

    setModelGroups(groups)
  }, [customModelGroups])

  const refreshProvider = useCallback(async (provider: string) => {
    if (!mountedRef.current) return

    const apiKey = getStoredProviderKey(provider)

    // Anthropic: skip (static list)
    if (provider === 'anthropic') return

    setProviderLoading(prev => ({ ...prev, [provider]: true }))
    setLoading(true)

    try {
      const baseUrl = provider === 'ollama'
        ? (localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434')
        : provider === 'lmstudio'
          ? (localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234')
          : undefined

      const models = await window.cipher.aiListModels({
        provider,
        apiKey: apiKey || undefined,
        baseUrl,
      })

      if (mountedRef.current && models.length > 0) {
        setCachedModels(provider, models)
        // Rebuild groups after cache update
        buildGroups()
      }
    } catch {
      // Silently fail — keep stale cache
    } finally {
      if (mountedRef.current) {
        setProviderLoading(prev => ({ ...prev, [provider]: false }))
        setLoading(false)
      }
    }
  }, [buildGroups])

  const refreshAll = useCallback(() => {
    const providers = [
      'openai', 'google', 'deepseek', 'openrouter', 'nim', 'kimi', 'qwen',
      'ollama', 'lmstudio',
    ]
    for (const provider of providers) {
      refreshProvider(provider)
    }
  }, [refreshProvider])

  // Initial load: build from cache
  useEffect(() => {
    mountedRef.current = true
    buildGroups()
    return () => { mountedRef.current = false }
  }, [buildGroups])

  // Auto-refresh local providers on mount (no API key needed)
  useEffect(() => {
    refreshProvider('ollama')
    refreshProvider('lmstudio')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for storage events (API key changes from Settings)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('cipher-provider-api-key-')) {
        const provider = e.key.replace('cipher-provider-api-key-', '')
        if (e.newValue && e.newValue !== e.oldValue) {
          refreshProvider(provider)
        }
      }
      // Clear cache when key is removed
      if (e.key && e.key.startsWith('cipher-provider-api-key-') && !e.newValue) {
        const provider = e.key.replace('cipher-provider-api-key-', '')
        setCachedModels(provider, [])
        buildGroups()
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [refreshProvider, buildGroups])

  return { modelGroups, loading, refreshAll, refreshProvider, providerLoading }
}
