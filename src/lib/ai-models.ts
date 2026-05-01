import { Zap, Cpu, Eye, Camera, Sparkles, Brain } from 'lucide-react';

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

// Text models — ONLY user-specified free OpenRouter IDs
export const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-oss-120b',
    name: 'GPT-OSS 120B',
    description: 'Primary — strong reasoning',
    icon: Cpu,
    color: 'text-orange-500',
    context: '131K',
    provider: 'OpenAI',
    specialties: ['Reasoning', 'Math', 'Writing'],
  },
  {
    id: 'hy3-preview',
    name: 'Hunyuan 3 Preview',
    description: 'Tencent — fast + creative',
    icon: Sparkles,
    color: 'text-pink-500',
    context: '131K',
    provider: 'Tencent',
    specialties: ['Creative', 'Chinese', 'Fast'],
  },
  {
    id: 'ling-2.6-1t',
    name: 'Ling 2.6 1T',
    description: 'Massive context, deep answers',
    icon: Brain,
    color: 'text-violet-500',
    context: '131K',
    provider: 'InclusionAI',
    specialties: ['Reasoning', 'Long', 'Detail'],
  },
  {
    id: 'gemma-4-31b',
    name: 'Gemma 4 31B',
    description: 'Google — balanced general',
    icon: Zap,
    color: 'text-yellow-500',
    context: '131K',
    provider: 'Google',
    specialties: ['Fast', 'General', 'Code'],
  },
];

// Vision-capable models
export const VISION_MODELS: AIModel[] = [
  {
    id: 'gemma-4-31b-vision',
    name: 'Gemma 4 31B Vision',
    description: 'Google multimodal',
    icon: Eye,
    color: 'text-cyan-500',
    context: '131K',
    provider: 'Google',
    specialties: ['Vision', 'Reasoning', 'OCR'],
    supportsVision: true,
  },
  {
    id: 'nemotron-omni',
    name: 'Nemotron Omni 30B',
    description: 'NVIDIA reasoning + vision',
    icon: Camera,
    color: 'text-emerald-500',
    context: '128K',
    provider: 'NVIDIA',
    specialties: ['Vision', 'Reasoning', 'OCR'],
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

export const DEFAULT_MODEL = 'gpt-oss-120b';
export const DEFAULT_VISION_MODEL = 'gemma-4-31b-vision';
