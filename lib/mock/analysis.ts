// 6레이어 분석 Mock 데이터

export interface LayerItem {
  [key: string]: string;
}

export interface LayerData {
  summary: string;
  items: LayerItem[];
}

export interface SixLayerAnalysis {
  priorWork: LayerData;
  keyConcepts: LayerData;
  pipeline: LayerData;
  followUp: LayerData;
  industry: LayerData;
  openQuestions: LayerData;
}

export interface CitationPaper {
  id: string;
  title: string;
  year: number;
  citations: number;
  fields: string[];
}

export interface PaperAnalysisData {
  tldr: string;
  analysis: SixLayerAnalysis;
  references: CitationPaper[];
  citedBy: CitationPaper[];
}

// "Attention Is All You Need" 논문 mock 분석
const attentionAnalysis: PaperAnalysisData = {
  tldr: "RNN과 CNN 없이 Self-Attention 메커니즘만으로 시퀀스-투-시퀀스 모델을 구성한 Transformer 아키텍처를 제안. 기계번역에서 기존 모델 대비 뛰어난 성능과 병렬화 가능성을 입증.",
  analysis: {
    priorWork: {
      summary: "Transformer 이전에는 RNN, LSTM, GRU 기반의 순차 처리 모델이 주류였으며, Attention 메커니즘은 보조 역할로 사용되었습니다.",
      items: [
        { title: "Sequence to Sequence Learning", relationship: "기초 인코더-디코더 구조 제공", significance: "Transformer의 인코더-디코더 패턴의 직접적 선행연구" },
        { title: "Bahdanau Attention", relationship: "Additive Attention 메커니즘 도입", significance: "RNN 위에 Attention을 추가하여 장거리 의존성 문제 완화" },
        { title: "Convolutional Sequence to Sequence", relationship: "CNN 기반 병렬 처리 시도", significance: "RNN의 순차 처리 한계를 극복하려는 대안적 접근" },
      ],
    },
    keyConcepts: {
      summary: "Self-Attention, Multi-Head Attention, Positional Encoding이 Transformer의 3대 핵심 개념입니다.",
      items: [
        { term: "Self-Attention (Scaled Dot-Product)", definition: "Query, Key, Value 행렬의 내적으로 시퀀스 내 모든 위치 간 관계를 계산", role: "RNN 없이 장거리 의존성을 직접 모델링하는 핵심 연산" },
        { term: "Multi-Head Attention", definition: "여러 Attention Head를 병렬로 실행하여 다양한 표현 부분공간을 학습", role: "단일 Attention보다 풍부한 패턴 포착 가능" },
        { term: "Positional Encoding", definition: "사인/코사인 함수로 위치 정보를 임베딩에 추가", role: "순서 정보가 없는 Self-Attention에 위치 개념 부여" },
        { term: "Layer Normalization", definition: "각 레이어의 출력을 정규화하여 학습 안정화", role: "깊은 네트워크에서도 안정적인 그래디언트 흐름 보장" },
      ],
    },
    pipeline: {
      summary: "입력 토큰 → 임베딩 + 위치 인코딩 → N개 인코더 레이어 → N개 디코더 레이어 → 출력 확률 분포",
      items: [
        { step: "입력 임베딩", description: "토큰을 d_model 차원의 벡터로 변환", technique: "학습 가능한 임베딩 행렬 + Positional Encoding" },
        { step: "인코더 블록 (×6)", description: "Multi-Head Self-Attention → Feed-Forward Network", technique: "각 서브레이어에 Residual Connection + Layer Norm" },
        { step: "디코더 블록 (×6)", description: "Masked Self-Attention → Cross-Attention → FFN", technique: "Auto-regressive 생성을 위한 마스킹" },
        { step: "출력 레이어", description: "디코더 출력을 어휘 크기의 확률 분포로 변환", technique: "선형 변환 + Softmax" },
      ],
    },
    followUp: {
      summary: "Transformer는 NLP뿐 아니라 CV, 음성, 멀티모달 등 거의 모든 AI 분야로 확장되었습니다.",
      items: [
        { direction: "BERT (2018)", description: "인코더만 사용한 양방향 사전학습 모델", evidence: "11개 NLP 벤치마크에서 SOTA 달성" },
        { direction: "GPT 시리즈 (2018-2023)", description: "디코더만 사용한 대규모 생성 모델", evidence: "GPT-3의 Few-shot 능력으로 범용 AI 가능성 입증" },
        { direction: "Vision Transformer (2020)", description: "이미지를 패치로 분할하여 Transformer에 입력", evidence: "대규모 데이터에서 CNN보다 우수한 성능" },
      ],
    },
    industry: {
      summary: "기계번역, 검색엔진, 챗봇 등 거의 모든 언어 AI 제품의 기반 아키텍처가 되었습니다.",
      items: [
        { domain: "기계번역", useCase: "Google Translate, DeepL 등의 핵심 모델", readiness: "Production" },
        { domain: "대화형 AI", useCase: "ChatGPT, Claude 등 LLM 기반 어시스턴트", readiness: "Production" },
        { domain: "코드 생성", useCase: "GitHub Copilot, Cursor 등 코드 자동완성", readiness: "Production" },
        { domain: "멀티모달 AI", useCase: "이미지-텍스트 동시 이해 (GPT-4V, Gemini)", readiness: "Growth" },
      ],
    },
    openQuestions: {
      summary: "Transformer의 확장성, 효율성, 해석 가능성에 대한 근본적 질문들이 활발히 연구되고 있습니다.",
      items: [
        { question: "Quadratic Attention의 효율성 한계", context: "시퀀스 길이에 대해 O(n²) 복잡도", potentialApproach: "Linear Attention, Flash Attention, Sparse Attention 등" },
        { question: "Positional Encoding의 일반화", context: "학습된 시퀀스 길이를 넘어서면 성능 저하", potentialApproach: "RoPE, ALiBi 등 상대적 위치 인코딩 연구" },
        { question: "Attention의 해석 가능성", context: "Attention 가중치가 실제 '의미적 관계'를 반영하는가?", potentialApproach: "Probing, Mechanistic Interpretability 연구" },
      ],
    },
  },
  references: [
    { id: "mock-ref-1", title: "Sequence to Sequence Learning with Neural Networks", year: 2014, citations: 18000, fields: ["NLP", "Deep Learning"] },
    { id: "mock-ref-2", title: "Neural Machine Translation by Jointly Learning to Align and Translate", year: 2014, citations: 22000, fields: ["NLP", "Machine Translation"] },
    { id: "mock-ref-3", title: "Convolutional Sequence to Sequence Learning", year: 2017, citations: 3500, fields: ["NLP", "CNN"] },
    { id: "mock-ref-4", title: "Layer Normalization", year: 2016, citations: 8000, fields: ["Deep Learning", "Optimization"] },
    { id: "mock-ref-5", title: "Deep Residual Learning for Image Recognition", year: 2015, citations: 200000, fields: ["Computer Vision", "Deep Learning"] },
  ],
  citedBy: [
    { id: "mock-cite-1", title: "BERT: Pre-training of Deep Bidirectional Transformers", year: 2018, citations: 90000, fields: ["NLP", "Pre-training"] },
    { id: "mock-cite-2", title: "Language Models are Few-Shot Learners (GPT-3)", year: 2020, citations: 35000, fields: ["NLP", "Large Language Models"] },
    { id: "mock-cite-3", title: "An Image is Worth 16x16 Words: Transformers for Image Recognition", year: 2020, citations: 25000, fields: ["Computer Vision", "Transformer"] },
    { id: "mock-cite-4", title: "DALL-E: Zero-Shot Text-to-Image Generation", year: 2021, citations: 5000, fields: ["Multimodal", "Generation"] },
    { id: "mock-cite-5", title: "Scaling Laws for Neural Language Models", year: 2020, citations: 3000, fields: ["NLP", "Scaling"] },
    { id: "mock-cite-6", title: "FlashAttention: Fast and Memory-Efficient Exact Attention", year: 2022, citations: 2000, fields: ["Efficient ML", "Systems"] },
  ],
};

// 논문 ID별 mock 분석 매핑 (다른 ID는 기본 분석 데이터 반환)
const MOCK_ANALYSES: Record<string, PaperAnalysisData> = {
  default: attentionAnalysis,
};

export function getMockAnalysis(paperId: string): PaperAnalysisData {
  return MOCK_ANALYSES[paperId] ?? MOCK_ANALYSES.default;
}
