import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { ChevronDown } from 'lucide-react'
import { STATIC_MODELS } from '../ai/models'
import type { ModelGroup, ModelOption } from '../ai/models'

// Dynamic header dropdown for selecting active AI model, fully synchronized with AIPanel
export default function ModelSelector() {
  const { aiModel, setAiModel, customModels } = useStore()
  const [ollamaModels, setOllamaModels] = useState<ModelGroup | null>(null)
  const [lmstudioModels, setLmstudioModels] = useState<ModelGroup | null>(null)

  // Auto-detect local models just like in AIPanel
  useEffect(() => {
    const ollamaUrl = localStorage.getItem('cipher-ollama-url') || 'http://localhost:11434'
    window.cipher.ollamaList(ollamaUrl).then(models => {
      if (models.length === 0) return
      setOllamaModels({
        group: 'Ollama (local)',
        options: models.map(m => ({
          value: `ollama:${m.name}`,
          label: m.name,
        })),
      })
    }).catch(() => {})

    const lmstudioUrl = localStorage.getItem('cipher-lmstudio-url') || 'http://localhost:1234'
    window.cipher.lmstudioList(lmstudioUrl).then(models => {
      if (models.length === 0) return
      setLmstudioModels({
        group: 'LM Studio (local)',
        options: models.map(m => ({
          value: `lmstudio:${m.id}`,
          label: m.id,
        })),
      })
    }).catch(() => {})
  }, [])

  // Resolve all available model groups, grouping custom endpoints by their name
  const modelGroups = useMemo<ModelGroup[]>(() => {
    let base = [...STATIC_MODELS]
    if (lmstudioModels) {
      base = base.map(g =>
        g.group === 'LM Studio (local)' ? lmstudioModels : g
      )
    }
    const merged = ollamaModels ? [...base, ollamaModels] : base
    if (customModels.length === 0) return merged

    // Group customModels by endpointName
    const customGroupsMap = new Map<string, ModelOption[]>()
    customModels.forEach((model, index) => {
      const groupName = model.endpointName || 'Personalizados'
      if (!customGroupsMap.has(groupName)) {
        customGroupsMap.set(groupName, [])
      }
      customGroupsMap.get(groupName)!.push({
        value: `custom:${index}`,
        label: model.alias || model.name || model.modelId,
      })
    })

    const customGroupsList: ModelGroup[] = []
    customGroupsMap.forEach((options, group) => {
      customGroupsList.push({ group, options })
    })

    return [...merged, ...customGroupsList]
  }, [customModels, ollamaModels, lmstudioModels])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAiModel(e.target.value)
  }

  return (
    <div className="relative inline-block text-left">
      <select
        value={aiModel}
        onChange={handleChange}
        className="appearance-none rounded-md border border-[var(--cipher-border)] bg-[var(--cipher-surface)] pl-2.5 pr-8 py-1 text-[13px] text-[var(--cipher-text)] focus:outline-none cursor-pointer transition-all hover:border-[var(--cipher-accent)]"
      >
        {modelGroups.map(group => (
          <optgroup
            key={group.group}
            label={group.group}
            className="bg-[var(--cipher-surface)] text-[var(--cipher-text-muted)] font-semibold uppercase text-[11px] tracking-wider"
          >
            {group.options.map(option => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.soon}
                className="bg-[var(--cipher-surface)] text-[var(--cipher-text)] font-normal normal-case text-[13px]"
              >
                {option.label} {option.soon ? '(Pronto)' : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {/* Chevron down icon */}
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--cipher-text-muted)]" />
    </div>
  )
}
