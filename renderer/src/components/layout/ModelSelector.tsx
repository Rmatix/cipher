import React from 'react'
import { useStore } from '../../store/useStore'
import { ChevronDown } from 'lucide-react'
import { useDynamicModels } from '../ai/useDynamicModels'
import type { ModelGroup } from '../ai/models'

// Dynamic header dropdown for selecting active AI model, fully synchronized with AIPanel
export default function ModelSelector() {
  const { aiModel, setAiModel, customModels } = useStore()

  // Build custom model groups from store
  const customModelGroups: ModelGroup[] = React.useMemo(() => {
    if (customModels.length === 0) return []
    const customGroupsMap = new Map<string, { value: string; label: string }[]>()
    customModels.forEach((model, index) => {
      const groupName = (model as any).endpointName || 'Personalizados'
      if (!customGroupsMap.has(groupName)) {
        customGroupsMap.set(groupName, [])
      }
      customGroupsMap.get(groupName)!.push({
        value: `custom:${index}`,
        label: (model as any).alias || (model as any).name || (model as any).modelId,
      })
    })
    const result: ModelGroup[] = []
    customGroupsMap.forEach((options, group) => {
      result.push({ group, options })
    })
    return result
  }, [customModels])

  const { modelGroups } = useDynamicModels(customModelGroups)

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
        {modelGroups.length === 0 && (
          <option value="" disabled>No hay modelos — configura una API key</option>
        )}
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
                className="bg-[var(--cipher-surface)] text-[var(--cipher-text)] font-normal normal-case text-[13px]"
              >
                {option.label}
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
