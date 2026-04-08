// 로드맵 Mock 데이터

export interface RoadmapStep {
  order: number;
  paperId: string;
  title: string;
  reason: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  fields: string[];
}

export interface Roadmap {
  keyword: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  steps: RoadmapStep[];
  totalMinutes: number;
}

const MOCK_ROADMAPS: Record<string, Record<string, Roadmap>> = {
  transformer: {
    beginner: {
      keyword: "Transformer",
      difficulty: "beginner",
      totalMinutes: 70,
      steps: [
        { order: 1, paperId: "mock-road-1", title: "Adam: A Method for Stochastic Optimization", reason: "Transformer 학습에 사용되는 기초 옵티마이저를 이해해야 합니다", difficulty: "beginner", estimatedMinutes: 10, fields: ["Optimization", "Deep Learning"] },
        { order: 2, paperId: "mock-road-2", title: "Deep Residual Learning for Image Recognition (ResNet)", reason: "Residual Connection은 Transformer의 핵심 구성요소입니다", difficulty: "beginner", estimatedMinutes: 10, fields: ["Computer Vision", "Deep Learning"] },
        { order: 3, paperId: "mock-road-3", title: "Sequence to Sequence Learning with Neural Networks", reason: "인코더-디코더 구조의 기초를 이해할 수 있습니다", difficulty: "beginner", estimatedMinutes: 10, fields: ["NLP", "Deep Learning"] },
        { order: 4, paperId: "mock-road-4", title: "Neural Machine Translation by Jointly Learning to Align and Translate", reason: "Attention 메커니즘의 원리를 최초로 제안한 논문입니다", difficulty: "beginner", estimatedMinutes: 10, fields: ["NLP", "Machine Translation"] },
        { order: 5, paperId: "mock-road-5", title: "Attention Is All You Need", reason: "Transformer 아키텍처를 제안한 핵심 논문입니다", difficulty: "intermediate", estimatedMinutes: 15, fields: ["NLP", "Architecture"] },
        { order: 6, paperId: "mock-road-6", title: "BERT: Pre-training of Deep Bidirectional Transformers", reason: "Transformer 인코더의 대표적 활용 사례입니다", difficulty: "intermediate", estimatedMinutes: 10, fields: ["NLP", "Pre-training"] },
        { order: 7, paperId: "mock-road-7", title: "Language Models are Unsupervised Multitask Learners (GPT-2)", reason: "Transformer 디코더 기반 생성 모델의 발전을 보여줍니다", difficulty: "intermediate", estimatedMinutes: 5, fields: ["NLP", "Generation"] },
      ],
    },
    intermediate: {
      keyword: "Transformer",
      difficulty: "intermediate",
      totalMinutes: 90,
      steps: [
        { order: 1, paperId: "mock-road-5", title: "Attention Is All You Need", reason: "Transformer의 원본 논문으로 아키텍처 세부사항을 깊이 이해해야 합니다", difficulty: "intermediate", estimatedMinutes: 15, fields: ["NLP", "Architecture"] },
        { order: 2, paperId: "mock-road-6", title: "BERT: Pre-training of Deep Bidirectional Transformers", reason: "양방향 사전학습의 핵심 기법을 분석합니다", difficulty: "intermediate", estimatedMinutes: 15, fields: ["NLP", "Pre-training"] },
        { order: 3, paperId: "mock-road-8", title: "Language Models are Few-Shot Learners (GPT-3)", reason: "스케일링과 In-context Learning의 발견을 이해합니다", difficulty: "advanced", estimatedMinutes: 15, fields: ["NLP", "Large Language Models"] },
        { order: 4, paperId: "mock-road-9", title: "An Image is Worth 16x16 Words (ViT)", reason: "Transformer의 비전 영역 확장을 분석합니다", difficulty: "intermediate", estimatedMinutes: 10, fields: ["Computer Vision", "Transformer"] },
        { order: 5, paperId: "mock-road-10", title: "FlashAttention: Fast and Memory-Efficient Attention", reason: "Attention의 효율성 문제와 해결책을 이해합니다", difficulty: "advanced", estimatedMinutes: 15, fields: ["Efficient ML", "Systems"] },
        { order: 6, paperId: "mock-road-11", title: "Scaling Laws for Neural Language Models", reason: "모델 크기, 데이터, 컴퓨팅의 관계를 정량적으로 분석합니다", difficulty: "advanced", estimatedMinutes: 20, fields: ["NLP", "Scaling"] },
      ],
    },
    advanced: {
      keyword: "Transformer",
      difficulty: "advanced",
      totalMinutes: 120,
      steps: [
        { order: 1, paperId: "mock-road-12", title: "Formal Algorithms for Transformers", reason: "Transformer의 수학적 정의를 형식적으로 이해합니다", difficulty: "advanced", estimatedMinutes: 20, fields: ["Theory", "Architecture"] },
        { order: 2, paperId: "mock-road-10", title: "FlashAttention: Fast and Memory-Efficient Attention", reason: "IO-aware 알고리즘으로 Attention 최적화 방법을 분석합니다", difficulty: "advanced", estimatedMinutes: 20, fields: ["Efficient ML", "Systems"] },
        { order: 3, paperId: "mock-road-13", title: "RoFormer: Enhanced Transformer with Rotary Position Embedding", reason: "위치 인코딩의 한계와 RoPE의 혁신을 깊이 분석합니다", difficulty: "advanced", estimatedMinutes: 15, fields: ["NLP", "Architecture"] },
        { order: 4, paperId: "mock-road-14", title: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces", reason: "Transformer 대안 아키텍처의 가능성을 탐구합니다", difficulty: "advanced", estimatedMinutes: 20, fields: ["Architecture", "Efficiency"] },
        { order: 5, paperId: "mock-road-15", title: "A Mathematical Framework for Transformer Circuits", reason: "Mechanistic Interpretability로 Transformer 내부를 해석합니다", difficulty: "advanced", estimatedMinutes: 25, fields: ["Interpretability", "Theory"] },
        { order: 6, paperId: "mock-road-16", title: "Mixture of Experts Meets Instruction Tuning", reason: "MoE를 통한 효율적 스케일링 전략을 이해합니다", difficulty: "advanced", estimatedMinutes: 20, fields: ["Scaling", "Architecture"] },
      ],
    },
  },
  diffusion: {
    beginner: {
      keyword: "Diffusion",
      difficulty: "beginner",
      totalMinutes: 60,
      steps: [
        { order: 1, paperId: "mock-diff-1", title: "Auto-Encoding Variational Bayes (VAE)", reason: "잠재 변수 모델의 기초를 이해해야 합니다", difficulty: "beginner", estimatedMinutes: 10, fields: ["Generative Models", "Deep Learning"] },
        { order: 2, paperId: "mock-diff-2", title: "Generative Adversarial Networks (GAN)", reason: "Diffusion 이전의 주류 생성 모델을 이해합니다", difficulty: "beginner", estimatedMinutes: 10, fields: ["Generative Models", "Deep Learning"] },
        { order: 3, paperId: "mock-diff-3", title: "Denoising Diffusion Probabilistic Models (DDPM)", reason: "현대 Diffusion 모델의 기초를 확립한 핵심 논문입니다", difficulty: "intermediate", estimatedMinutes: 15, fields: ["Generative Models", "Diffusion"] },
        { order: 4, paperId: "mock-diff-4", title: "Diffusion Models Beat GANs on Image Synthesis", reason: "Diffusion이 GAN을 넘어선 기법과 실험을 분석합니다", difficulty: "intermediate", estimatedMinutes: 15, fields: ["Generative Models", "Image Synthesis"] },
        { order: 5, paperId: "mock-diff-5", title: "High-Resolution Image Synthesis with Latent Diffusion Models", reason: "Stable Diffusion의 기반이 된 Latent Diffusion을 이해합니다", difficulty: "intermediate", estimatedMinutes: 10, fields: ["Generative Models", "Efficient ML"] },
      ],
    },
    intermediate: {
      keyword: "Diffusion",
      difficulty: "intermediate",
      totalMinutes: 60,
      steps: [
        { order: 1, paperId: "mock-diff-3", title: "Denoising Diffusion Probabilistic Models (DDPM)", reason: "Forward/Reverse process의 수학적 기초를 분석합니다", difficulty: "intermediate", estimatedMinutes: 15, fields: ["Generative Models", "Diffusion"] },
        { order: 2, paperId: "mock-diff-4", title: "Diffusion Models Beat GANs on Image Synthesis", reason: "Classifier guidance 등 핵심 기법을 깊이 이해합니다", difficulty: "intermediate", estimatedMinutes: 15, fields: ["Generative Models", "Image Synthesis"] },
        { order: 3, paperId: "mock-diff-5", title: "High-Resolution Image Synthesis with Latent Diffusion Models", reason: "Latent space에서의 효율적 Diffusion을 분석합니다", difficulty: "intermediate", estimatedMinutes: 15, fields: ["Generative Models", "Efficient ML"] },
        { order: 4, paperId: "mock-diff-6", title: "Classifier-Free Diffusion Guidance", reason: "실용적 Guidance 기법의 원리를 이해합니다", difficulty: "advanced", estimatedMinutes: 15, fields: ["Generative Models", "Conditioning"] },
      ],
    },
    advanced: {
      keyword: "Diffusion",
      difficulty: "advanced",
      totalMinutes: 60,
      steps: [
        { order: 1, paperId: "mock-diff-7", title: "Score-Based Generative Modeling through SDEs", reason: "Score matching과 SDE 프레임워크로 Diffusion을 통합 이해합니다", difficulty: "advanced", estimatedMinutes: 20, fields: ["Theory", "Generative Models"] },
        { order: 2, paperId: "mock-diff-8", title: "Flow Matching for Generative Modeling", reason: "ODE 기반의 효율적 생성 패러다임을 분석합니다", difficulty: "advanced", estimatedMinutes: 20, fields: ["Theory", "Generative Models"] },
        { order: 3, paperId: "mock-diff-9", title: "Consistency Models", reason: "단일 스텝 생성을 위한 최신 접근법을 탐구합니다", difficulty: "advanced", estimatedMinutes: 20, fields: ["Efficient ML", "Generative Models"] },
      ],
    },
  },
};

export function getMockRoadmap(keyword: string, difficulty: "beginner" | "intermediate" | "advanced"): Roadmap | null {
  const normalized = keyword.toLowerCase().trim();
  for (const [key, roadmaps] of Object.entries(MOCK_ROADMAPS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return roadmaps[difficulty] ?? roadmaps.beginner;
    }
  }
  // 키워드가 없으면 transformer 기본값 반환
  return MOCK_ROADMAPS.transformer[difficulty];
}
