import { Zap, Cpu, Eye, Camera } from 'lucide-react';

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
    id: 'gpt-oss-120b',
    name: 'GPT-OSS 120B',
    description: 'Primary — powerful reasoning',
    icon: Cpu,
    color: 'text-orange-500',
    context: '131K',
    provider: 'OpenAI',
    specialties: ['Reasoning', 'Math', 'Writing'],
  },
  {
    id: 'ling-flash',
    name: 'Ling 2.6 Flash',
    description: 'Secondary — ultra fast',
    icon: Zap,
    color: 'text-yellow-500',
    context: '131K',
    provider: 'InclusionAI',
    specialties: ['Fast', 'Short', 'General'],
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

export const DEFAULT_MODEL = 'gpt-oss-120b';
export const DEFAULT_VISION_MODEL = 'gemma-4-26b-vision';
