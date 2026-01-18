import { Zap, Brain, Sparkles, Cpu, Rocket, Star, Flame, Code } from 'lucide-react';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: typeof Zap;
  color: string;
  context: string;
  provider: string;
  specialties: string[];
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'mimo-flash',
    name: 'MiMo Flash',
    description: 'Ultra-fast & accurate',
    icon: Zap,
    color: 'text-yellow-500',
    context: '256K',
    provider: 'Xiaomi',
    specialties: ['Reasoning', 'Coding', 'Academic'],
  },
  {
    id: 'devstral',
    name: 'Devstral 2',
    description: 'Expert programmer',
    icon: Code,
    color: 'text-blue-500',
    context: '256K',
    provider: 'Mistral AI',
    specialties: ['Coding', 'Debugging', 'Analysis'],
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: 'Advanced reasoning',
    icon: Brain,
    color: 'text-purple-500',
    context: '164K',
    provider: 'DeepSeek',
    specialties: ['Reasoning', 'Math', 'Science'],
  },
  {
    id: 'qwen-coder',
    name: 'Qwen3 Coder',
    description: 'Code specialist',
    icon: Cpu,
    color: 'text-green-500',
    context: '262K',
    provider: 'Alibaba',
    specialties: ['Coding', 'Tool Use', 'Long Context'],
  },
  {
    id: 'glm-air',
    name: 'GLM 4.5 Air',
    description: 'Fast & versatile',
    icon: Rocket,
    color: 'text-cyan-500',
    context: '131K',
    provider: 'Z.AI',
    specialties: ['General', 'Fast', 'Agents'],
  },
  {
    id: 'chimera',
    name: 'Chimera R1T2',
    description: 'Creative powerhouse',
    icon: Flame,
    color: 'text-orange-500',
    context: '164K',
    provider: 'TNG Tech',
    specialties: ['Creative', 'Roleplay', 'Storytelling'],
  },
];

export const getModelById = (id: string): AIModel => {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
};

export const DEFAULT_MODEL = 'mimo-flash';
