import { Zap, Cpu, Eye, Camera, Sparkles, Brain, Zap as FastIcon } from 'lucide-react';

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

// Text models — Optimized for speed and responsiveness
export const AI_MODELS: AIModel[] = [
  {
    id: 'openai/gpt-oss-120b:free',
    name: 'GPT-OSS 120B (Free)',
    description: 'High-quality reasoning',
    icon: Cpu,
    color: 'text-orange-500',
    context: '131K',
    provider: 'OpenAI',
    specialties: ['Reasoning', 'Math', 'Writing'],
  },
  {
    id: 'openrouter/owl-alpha',
    name: 'Owl Alpha',
    description: 'Ultra-fast responses',
    icon: FastIcon,
    color: 'text-cyan-500',
    context: '128K',
    provider: 'OpenRouter',
    specialties: ['Speed', 'General', 'Real-time'],
  },
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free',
    description: 'Reliable fallback model',
    icon: Sparkles,
    color: 'text-green-500',
    context: '131K',
    provider: 'OpenRouter',
    specialties: ['Balanced', 'Reliable', 'Creative'],
  },
];

// Vision-capable models
export const VISION_MODELS: AIModel[] = [
  {
    id: 'openrouter/owl-alpha',
    name: 'Owl Alpha Vision',
    description: 'Fast multimodal model',
    icon: Eye,
    color: 'text-cyan-500',
    context: '128K',
    provider: 'OpenRouter',
    specialties: ['Vision', 'Speed', 'Images'],
    supportsVision: true,
  },
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Vision',
    description: 'Reliable multimodal',
    icon: Camera,
    color: 'text-emerald-500',
    context: '131K',
    provider: 'OpenRouter',
    specialties: ['Vision', 'Balanced', 'OCR'],
    supportsVision: true,
  },
];

export const ALL_MODELS = [...AI_MODELS, ...VISION_MODELS];

export const getModelById = (id: string): AIModel => {
  return ALL_MODELS.find((m): m is AIModel => m.id === id) || AI_MODELS[0];
};

export const isVisionModel = (id: string): boolean => {
  return VISION_MODELS.some((m): m is AIModel => m.id === id);
};

export const DEFAULT_MODEL = 'openai/gpt-oss-120b:free';
export const DEFAULT_VISION_MODEL = 'openrouter/owl-alpha';
