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
    { name: 'Claude 4.8 Sonnet (Anthropic)', id: 'claude-sonnet-4-8' },
    { name: 'Claude 4.8 Opus (Anthropic)', id: 'claude-opus-4-8' },
    { name: 'GPT-5.5 Pro (OpenAI)', id: 'gpt-5.5-pro' },
    { name: 'GPT-5.5 Mini (OpenAI)', id: 'gpt-5.5-mini' },
    { name: 'Gemini 3.5 Flash (Google)', id: 'gemini-3.5-flash' },
    { name: 'Gemini 3.5 Pro (Google)', id: 'gemini-3.5-pro' },
    { name: 'DeepSeek V4 (OpenRouter)', id: 'openrouter:deepseek/deepseek-chat-v4' },
    { name: 'DeepSeek Reasoner V4 (OpenRouter)', id: 'openrouter:deepseek/deepseek-reasoner-v4' },
    { name: 'Ollama Qwen3.7 Coder (Local)', id: 'ollama:qwen-3.7-coder:7b' },
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
