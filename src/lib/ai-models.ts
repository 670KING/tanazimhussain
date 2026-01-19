import { Zap, Brain, Sparkles, Cpu, Rocket, Flame, Code, Eye, Image, Camera } from 'lucide-react';

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

// Text-only models
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

// Vision-capable models (can analyze images)
export const VISION_MODELS: AIModel[] = [
  {
    id: 'nemotron-nano',
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
    id: 'molmo2',
    name: 'Molmo2 8B',
    description: 'Multi-image understanding',
    icon: Camera,
    color: 'text-indigo-500',
    context: '37K',
    provider: 'AllenAI',
    specialties: ['Vision', 'Video', 'Grounding'],
    supportsVision: true,
  },
  {
    id: 'mistral-small',
    name: 'Mistral Small 3.1',
    description: 'Advanced multimodal',
    icon: Eye,
    color: 'text-rose-500',
    context: '128K',
    provider: 'Mistral AI',
    specialties: ['Vision', 'Math', 'Code'],
    supportsVision: true,
  },
  {
    id: 'qwen-vl',
    name: 'Qwen2.5-VL 7B',
    description: 'Image & video expert',
    icon: Image,
    color: 'text-teal-500',
    context: '33K',
    provider: 'Qwen',
    specialties: ['Vision', 'Video', 'Multilingual'],
    supportsVision: true,
  },
  {
    id: 'gemma-4b',
    name: 'Gemma 3 4B',
    description: 'Lightweight vision',
    icon: Sparkles,
    color: 'text-pink-500',
    context: '33K',
    provider: 'Google',
    specialties: ['Vision', 'Fast', 'Efficient'],
    supportsVision: true,
  },
  {
    id: 'gemma-12b',
    name: 'Gemma 3 12B',
    description: 'Powerful vision',
    icon: Eye,
    color: 'text-violet-500',
    context: '33K',
    provider: 'Google',
    specialties: ['Vision', 'Reasoning', 'Math'],
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

export const DEFAULT_MODEL = 'mimo-flash';
export const DEFAULT_VISION_MODEL = 'nemotron-nano';
