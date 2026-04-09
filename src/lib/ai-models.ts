import { Zap, Brain, Sparkles, Cpu, Rocket, Flame, Code, Eye, Image, Camera, Shield, Star, Atom, Globe, Bot } from 'lucide-react';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: typeof Zap;
  color: string;
  context: string;
  provider: string;
  specialties: string[];
  supportsVision?: boolean;
}

// Text-only models - Updated April 2026
export const AI_MODELS: AIModel[] = [
  {
    id: 'nemotron-super',
    name: 'Nemotron 3 Super',
    description: 'Ultra-powerful 599B',
    icon: Shield,
    color: 'text-green-500',
    context: '262K',
    provider: 'NVIDIA',
    specialties: ['Reasoning', 'Academic', 'Science'],
  },
  {
    id: 'trinity-large',
    name: 'Trinity Large',
    description: 'Advanced preview 137B',
    icon: Star,
    color: 'text-purple-500',
    context: '131K',
    provider: 'Arcee AI',
    specialties: ['Reasoning', 'Analysis', 'Writing'],
  },
  {
    id: 'qwen3-coder',
    name: 'Qwen3 Coder 480B',
    description: 'Code specialist',
    icon: Code,
    color: 'text-blue-500',
    context: '262K',
    provider: 'Qwen',
    specialties: ['Coding', 'Tool Use', 'Long Context'],
  },
  {
    id: 'gemma-4-31b',
    name: 'Gemma 4 31B',
    description: 'Latest Google model',
    icon: Sparkles,
    color: 'text-cyan-500',
    context: '262K',
    provider: 'Google',
    specialties: ['General', 'Fast', 'Reasoning'],
  },
  {
    id: 'glm-air',
    name: 'GLM 4.5 Air',
    description: 'Fast & versatile',
    icon: Rocket,
    color: 'text-yellow-500',
    context: '131K',
    provider: 'Z.AI',
    specialties: ['General', 'Fast', 'Agents'],
  },
  {
    id: 'gpt-oss-120b',
    name: 'GPT-OSS 120B',
    description: 'OpenAI open-source',
    icon: Brain,
    color: 'text-orange-500',
    context: '131K',
    provider: 'OpenAI',
    specialties: ['Reasoning', 'Math', 'Writing'],
  },
  {
    id: 'llama-70b',
    name: 'Llama 3.3 70B',
    description: 'Meta powerhouse',
    icon: Flame,
    color: 'text-red-500',
    context: '65K',
    provider: 'Meta',
    specialties: ['General', 'Coding', 'Math'],
  },
  {
    id: 'minimax-m25',
    name: 'MiniMax M2.5',
    description: 'High context model',
    icon: Cpu,
    color: 'text-indigo-500',
    context: '196K',
    provider: 'MiniMax',
    specialties: ['Long Context', 'Creative', 'Fast'],
  },
  {
    id: 'nemotron-nano-30b',
    name: 'Nemotron Nano 30B',
    description: 'Efficient NVIDIA',
    icon: Zap,
    color: 'text-emerald-500',
    context: '256K',
    provider: 'NVIDIA',
    specialties: ['Fast', 'Efficient', 'Reasoning'],
  },
  {
    id: 'trinity-mini',
    name: 'Trinity Mini',
    description: 'Fast Arcee model',
    icon: Atom,
    color: 'text-pink-500',
    context: '131K',
    provider: 'Arcee AI',
    specialties: ['Fast', 'General', 'Compact'],
  },
  {
    id: 'qwen3-next',
    name: 'Qwen3 Next 80B',
    description: 'Next-gen Qwen',
    icon: Globe,
    color: 'text-teal-500',
    context: '262K',
    provider: 'Qwen',
    specialties: ['Reasoning', 'Multilingual', 'Long Context'],
  },
  {
    id: 'hermes-405b',
    name: 'Hermes 3 405B',
    description: 'Largest free model',
    icon: Bot,
    color: 'text-violet-500',
    context: '131K',
    provider: 'Nous',
    specialties: ['Reasoning', 'Creative', 'Academic'],
  },
];

// Vision-capable models (can analyze images)
export const VISION_MODELS: AIModel[] = [
  {
    id: 'nemotron-nano-vl',
    name: 'Nemotron Nano VL',
    description: 'Video & document AI',
    icon: Eye,
    color: 'text-emerald-500',
    context: '128K',
    provider: 'NVIDIA',
    specialties: ['Vision', 'OCR', 'Documents'],
    supportsVision: true,
  },
  {
    id: 'gemma-4-31b-vision',
    name: 'Gemma 4 31B',
    description: 'Google multimodal',
    icon: Sparkles,
    color: 'text-cyan-500',
    context: '262K',
    provider: 'Google',
    specialties: ['Vision', 'Reasoning', 'Math'],
    supportsVision: true,
  },
  {
    id: 'gemma-3-12b',
    name: 'Gemma 3 12B',
    description: 'Powerful vision',
    icon: Eye,
    color: 'text-violet-500',
    context: '32K',
    provider: 'Google',
    specialties: ['Vision', 'Reasoning', 'Math'],
    supportsVision: true,
  },
  {
    id: 'gemma-3-4b',
    name: 'Gemma 3 4B',
    description: 'Lightweight vision',
    icon: Camera,
    color: 'text-pink-500',
    context: '32K',
    provider: 'Google',
    specialties: ['Vision', 'Fast', 'Efficient'],
    supportsVision: true,
  },
  {
    id: 'nemotron-embed-vl',
    name: 'Nemotron Embed VL',
    description: 'Embedding + vision',
    icon: Image,
    color: 'text-rose-500',
    context: '131K',
    provider: 'NVIDIA',
    specialties: ['Vision', 'Embedding', 'Search'],
    supportsVision: true,
  },
];

export const ALL_MODELS = [...AI_MODELS, ...VISION_MODELS];

export const getModelById = (id: string): AIModel => {
  return ALL_MODELS.find(m => m.id === id) || AI_MODELS[0];
};

export const isVisionModel = (id: string): boolean => {
  return VISION_MODELS.some(m => m.id === id);
};

export const DEFAULT_MODEL = 'nemotron-super';
export const DEFAULT_VISION_MODEL = 'nemotron-nano-vl';
