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
    name: 'Tanoedu Pro (Deep Thinking)',
    description: 'High-quality logical reasoning',
    icon: Cpu,
    color: 'text-orange-500',
    context: '131K',
    provider: 'OpenAI',
    specialties: ['Reasoning', 'Math', 'Writing'],
  },
  {
    id: 'liquid/lfm-2.5-1.2b-instruct:free',
    name: 'Tanoedu Lite (Super Fast)',
    description: 'High-efficiency model for quick questions',
    icon: Zap,
    color: 'text-purple-500',
    context: '32K',
    provider: 'Liquid',
    specialties: ['Efficiency', 'Instruct', 'Fast'],
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Tanoedu Ultra (Reasoning & Code)',
    description: 'Ultra-large scale performance for coding and STEM',
    icon: Brain,
    color: 'text-indigo-500',
    context: '128K',
    provider: 'NVIDIA',
    specialties: ['Reasoning', 'Knowledge', 'Coding'],
  },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:nitro',
    name: 'Tanoedu Omni (Fast Thinking)',
    description: 'Accelerated logical reasoning',
    icon: Sparkles,
    color: 'text-rose-500',
    context: '64K',
    provider: 'NVIDIA',
    specialties: ['Reasoning', 'Omni', 'Speed'],
  },
  {
    id: 'openrouter/owl-alpha',
    name: 'Tanoedu Owl (Instant Response)',
    description: 'Ultra-fast response speeds',
    icon: FastIcon,
    color: 'text-cyan-500',
    context: '128K',
    provider: 'OpenRouter',
    specialties: ['Speed', 'General', 'Real-time'],
  },
  {
    id: 'openrouter/free',
    name: 'Tanoedu Creative (Long Context)',
    description: 'Reliable fallback for creative and long responses',
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
    id: 'nvidia/llama-nemotron-rerank-vl-1b-v2:free',
    name: 'Tanoedu Vision (Deep Analyze)',
    description: 'Multimodal analysis and chart reading',
    icon: Eye,
    color: 'text-blue-500',
    context: '8K',
    provider: 'NVIDIA',
    specialties: ['Vision', 'Reranking', 'Relevance'],
    supportsVision: true,
  },
  {
    id: 'openrouter/owl-alpha',
    name: 'Tanoedu Vision (Fast Multimodal)',
    description: 'Fast multimodal scanner model',
    icon: Eye,
    color: 'text-cyan-500',
    context: '128K',
    provider: 'OpenRouter',
    specialties: ['Vision', 'Speed', 'Images'],
    supportsVision: true,
  },
  {
    id: 'openrouter/free',
    name: 'Tanoedu Vision (Creative OCR)',
    description: 'Reliable multimodal fallback',
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
