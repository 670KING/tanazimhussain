import { Zap, Brain, Sparkles, Cpu, Rocket, Eye, Camera, Shield } from 'lucide-react';

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

// Text-only models - ONLY user-specified free models
export const AI_MODELS: AIModel[] = [
  {
    id: 'nemotron-super',
    name: 'Nemotron 3 Super',
    description: 'Ultra-powerful 120B',
    icon: Shield,
    color: 'text-green-500',
    context: '262K',
    provider: 'NVIDIA',
    specialties: ['Reasoning', 'Academic', 'Science'],
  },
  {
    id: 'gemma-4-26b',
    name: 'Gemma 4 26B',
    description: 'Latest Google model',
    icon: Sparkles,
    color: 'text-cyan-500',
    context: '262K',
    provider: 'Google',
    specialties: ['General', 'Fast', 'Reasoning'],
  },
  {
    id: 'lfm-thinking',
    name: 'LFM 2.5 Thinking',
    description: 'Reasoning specialist',
    icon: Brain,
    color: 'text-purple-500',
    context: '32K',
    provider: 'LiquidAI',
    specialties: ['Reasoning', 'Thinking', 'Logic'],
  },
  {
    id: 'gpt-oss-120b',
    name: 'GPT-OSS 120B',
    description: 'OpenAI open-source',
    icon: Cpu,
    color: 'text-orange-500',
    context: '131K',
    provider: 'OpenAI',
    specialties: ['Reasoning', 'Math', 'Writing'],
  },
  {
    id: 'qwen3-next',
    name: 'Qwen3 Next 80B',
    description: 'Next-gen Qwen',
    icon: Rocket,
    color: 'text-teal-500',
    context: '262K',
    provider: 'Qwen',
    specialties: ['Reasoning', 'Multilingual', 'Long Context'],
  },
];

// Vision-capable models
export const VISION_MODELS: AIModel[] = [
  {
    id: 'gemma-4-26b-vision',
    name: 'Gemma 4 26B Vision',
    description: 'Google multimodal',
    icon: Eye,
    color: 'text-cyan-500',
    context: '262K',
    provider: 'Google',
    specialties: ['Vision', 'Reasoning', 'Math'],
    supportsVision: true,
  },
  {
    id: 'nemotron-nano-vl',
    name: 'Nemotron Nano VL',
    description: 'NVIDIA vision model',
    icon: Camera,
    color: 'text-emerald-500',
    context: '128K',
    provider: 'NVIDIA',
    specialties: ['Vision', 'OCR', 'Documents'],
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
export const DEFAULT_VISION_MODEL = 'gemma-4-26b-vision';
