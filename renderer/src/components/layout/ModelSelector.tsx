import React from 'react';
import { useStore } from '../../store/useStore';
import { ChevronDown } from 'lucide-react';

// Simple dropdown for selecting AI model
export default function ModelSelector() {
  const aiModel = useStore(state => state.aiModel);
  const setAiModel = useStore(state => state.setAiModel);
  const customModels = useStore(state => state.customModels);

  // Built‑in models list. Adjust as needed.
  const builtInModels = [
    { name: 'Claude 3.7 Sonnet (Anthropic)', id: 'claude-3-7-sonnet-latest' },
    { name: 'Claude 3.5 Sonnet (Anthropic)', id: 'claude-3-5-sonnet-latest' },
    { name: 'GPT-4o (OpenAI)', id: 'gpt-4o' },
    { name: 'GPT-4o Mini (OpenAI)', id: 'gpt-4o-mini' },
    { name: 'Gemini 2.0 Flash (Google)', id: 'gemini-2.0-flash' },
    { name: 'Gemini 1.5 Pro (Google)', id: 'gemini-1.5-pro' },
    { name: 'DeepSeek V3 (OpenRouter)', id: 'openrouter:deepseek/deepseek-chat' },
    { name: 'DeepSeek R1 (OpenRouter)', id: 'openrouter:deepseek/deepseek-r1' },
    { name: 'Ollama Qwen2.5 Coder (Local)', id: 'ollama:qwen2.5-coder:7b' },
  ];

  const allModels = [...builtInModels, ...customModels.map(m => ({ name: m.name ?? m.provider, id: m.modelId }))];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAiModel(e.target.value);
  };

  return (
    <div className="relative inline-block text-left">
      <select
        value={aiModel}
        onChange={handleChange}
        className="appearance-none rounded-md border border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-2 py-1 text-[var(--cipher-text)] focus:outline-none"
      >
        {allModels.map(m => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {/* Chevron icon */}
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--cipher-text-muted)]" />
    </div>
  );
}
