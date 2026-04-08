import type { GraphNode, GraphEdge, GraphData, RoadmapModule } from "./types";

const nodes: GraphNode[] = [
  { id: "p1", label: "Attention Is All You Need", type: "paper", content: "Transformer 아키텍처를 제안한 논문. Self-attention 메커니즘만으로 seq2seq 모델을 구성하여 기존 RNN/CNN 기반 모델보다 뛰어난 성능을 달성.", meta: { authors: "Vaswani et al.", year: 2017, citations: 120000 } },
  { id: "p2", label: "BERT", type: "paper", content: "Bidirectional Encoder Representations from Transformers. 사전학습된 양방향 언어 모델로, 다양한 NLP 태스크에서 SOTA 달성.", meta: { authors: "Devlin et al.", year: 2018, citations: 90000 } },
  { id: "p3", label: "GPT-3", type: "paper", content: "175B 파라미터의 대규모 언어 모델. Few-shot learning으로 다양한 태스크 수행 가능함을 입증.", meta: { authors: "Brown et al.", year: 2020, citations: 35000 } },
  { id: "p4", label: "Vision Transformer (ViT)", type: "paper", content: "Transformer를 이미지 분류에 적용. 이미지를 패치로 분할하여 시퀀스로 처리.", meta: { authors: "Dosovitskiy et al.", year: 2020, citations: 25000 } },
  { id: "p5", label: "ResNet", type: "paper", content: "Residual Learning 프레임워크. Skip connection으로 매우 깊은 네트워크 학습 가능.", meta: { authors: "He et al.", year: 2015, citations: 200000 } },
  { id: "p6", label: "Diffusion Models Beat GANs", type: "paper", content: "Diffusion 모델이 이미지 생성에서 GAN을 능가할 수 있음을 입증.", meta: { authors: "Dhariwal & Nichol", year: 2021, citations: 8000 } },
  { id: "p7", label: "CLIP", type: "paper", content: "Contrastive Language-Image Pre-training. 텍스트와 이미지를 동일 임베딩 공간에서 학습.", meta: { authors: "Radford et al.", year: 2021, citations: 15000 } },
  { id: "c1", label: "Self-Attention", type: "concept", content: "시퀀스 내 각 위치가 다른 모든 위치를 참조하여 표현을 계산하는 메커니즘. Query, Key, Value 행렬의 내적으로 구현.", meta: { contexts: [
    { paperId: "p1", paperLabel: "Attention Is All You Need", year: 2017, description: "RNN 없이 Self-Attention만으로 시퀀스 모델링 가능함을 최초 제안" },
    { paperId: "p2", paperLabel: "BERT", year: 2018, description: "양방향 Self-Attention으로 문맥 표현력 극대화" },
    { paperId: "p4", paperLabel: "Vision Transformer (ViT)", year: 2020, description: "이미지 패치에 Self-Attention 적용, 비전 영역으로 확장" },
  ] } },
  { id: "c2", label: "Transformer", type: "concept", content: "Self-attention 기반의 인코더-디코더 아키텍처. 병렬 처리가 가능하여 RNN 대비 학습 속도가 빠름.", meta: { contexts: [
    { paperId: "p1", paperLabel: "Attention Is All You Need", year: 2017, description: "인코더-디코더 구조의 Transformer 아키텍처 최초 제안" },
    { paperId: "p2", paperLabel: "BERT", year: 2018, description: "인코더만 사용하는 변형으로 NLP 사전학습 혁신" },
    { paperId: "p3", paperLabel: "GPT-3", year: 2020, description: "디코더만 사용하는 대규모 생성 모델로 확장" },
  ] } },
  { id: "c3", label: "Transfer Learning", type: "concept", content: "사전학습된 모델을 다른 태스크에 미세조정하는 학습 패러다임.", meta: { contexts: [
    { paperId: "p1", paperLabel: "Attention Is All You Need", year: 2017, description: "인코더-디코더 간 지식 전달의 기초" },
    { paperId: "p2", paperLabel: "BERT", year: 2018, description: "사전학습 → 미세조정 패러다임 확립" },
    { paperId: "p3", paperLabel: "GPT-3", year: 2020, description: "Few-shot으로 미세조정 없이도 지식 전달 가능" },
  ] } },
  { id: "c4", label: "Pre-training", type: "concept", content: "대규모 비지도 데이터에서 언어/비전 모델을 사전학습하는 단계.", meta: { contexts: [
    { paperId: "p2", paperLabel: "BERT", year: 2018, description: "MLM + NSP로 양방향 사전학습" },
    { paperId: "p3", paperLabel: "GPT-3", year: 2020, description: "대규모 단방향 사전학습으로 범용 능력 확보" },
  ] } },
  { id: "c5", label: "CNN", type: "concept", content: "Convolutional Neural Network. 합성곱 연산으로 지역적 특징 추출." },
  { id: "c6", label: "Residual Connection", type: "concept", content: "입력을 출력에 더하는 skip connection. 깊은 네트워크의 학습을 안정화.", meta: { contexts: [
    { paperId: "p5", paperLabel: "ResNet", year: 2015, description: "Skip connection으로 152층 네트워크 학습 성공" },
    { paperId: "p1", paperLabel: "Attention Is All You Need", year: 2017, description: "Transformer 블록마다 Residual Connection 적용" },
  ] } },
  { id: "c7", label: "Diffusion Process", type: "concept", content: "점진적으로 노이즈를 추가한 뒤 역으로 노이즈를 제거하며 데이터를 생성하는 확률적 과정." },
  { id: "c8", label: "Contrastive Learning", type: "concept", content: "유사한 쌍은 가깝게, 다른 쌍은 멀게 임베딩하는 학습 방법." },
  { id: "c9", label: "Multi-modal Learning", type: "concept", content: "텍스트, 이미지, 오디오 등 서로 다른 modality를 함께 학습." },
  { id: "m1", label: "Transformer가 NLP를 바꾼 이유", type: "memo", content: "RNN의 순차 처리 한계를 병렬 처리로 극복. Attention으로 장거리 의존성 문제 해결. 이후 BERT, GPT 등 모든 주요 모델의 기반이 됨." },
  { id: "m2", label: "ViT vs CNN 정리", type: "memo", content: "ViT는 대규모 데이터에서 CNN보다 우수하나, 소규모 데이터에서는 CNN의 inductive bias가 유리. 하이브리드 접근이 실용적." },
  { id: "m3", label: "Diffusion vs GAN 비교", type: "memo", content: "GAN: 빠른 생성, 모드 붕괴 문제. Diffusion: 느리지만 안정적, 다양성 높음. 최근 속도 개선 연구 활발." },
  { id: "d1", label: "NLP 세미나 발표자료.pdf", type: "document", content: "2024년 1월 연구실 세미나에서 발표한 Transformer 계열 모델 서베이 자료." },
  { id: "d2", label: "CV 프로젝트 제안서.pdf", type: "document", content: "ViT 기반 의료 이미지 분류 프로젝트 제안서. ResNet과 성능 비교 포함." },
];

const edges: GraphEdge[] = [
  // citation: 핵심 인용일수록 높은 weight
  { id: "e0", source: "p2", target: "p1", type: "citation", label: "Transformer 아키텍처 활용", weight: 0.95 },
  { id: "e1", source: "p3", target: "p1", type: "citation", label: "Transformer 디코더 확장", weight: 0.9 },
  { id: "e2", source: "p4", target: "p1", type: "citation", label: "Self-Attention을 비전에 적용", weight: 0.85 },
  { id: "e3", source: "p4", target: "p5", type: "citation", label: "CNN 베이스라인 비교", weight: 0.4 },
  { id: "e4", source: "p7", target: "p4", type: "citation", label: "비전 인코더로 ViT 사용", weight: 0.7 },
  { id: "e5", source: "p7", target: "p3", type: "citation", label: "텍스트 인코더로 GPT 계열 참조", weight: 0.6 },
  { id: "e6", source: "p2", target: "p3", type: "citation", label: "사전학습 패러다임 공유", weight: 0.55 },
  // contains: 핵심 기여일수록 높은 weight
  { id: "e7", source: "p1", target: "c1", type: "contains", label: "핵심 메커니즘", weight: 0.9 },
  { id: "e8", source: "p1", target: "c2", type: "contains", label: "제안 아키텍처", weight: 0.9 },
  { id: "e9", source: "p2", target: "c2", type: "contains", label: "인코더 활용", weight: 0.8 },
  { id: "e10", source: "p2", target: "c3", type: "contains", label: "미세조정 패러다임", weight: 0.85 },
  { id: "e11", source: "p2", target: "c4", type: "contains", label: "MLM 사전학습", weight: 0.8 },
  { id: "e12", source: "p3", target: "c2", type: "contains", label: "디코더 활용", weight: 0.75 },
  { id: "e13", source: "p3", target: "c4", type: "contains", label: "대규모 사전학습", weight: 0.85 },
  { id: "e14", source: "p4", target: "c1", type: "contains", label: "패치 Self-Attention", weight: 0.8 },
  { id: "e15", source: "p4", target: "c5", type: "contains", label: "CNN 대체", weight: 0.5 },
  { id: "e16", source: "p5", target: "c5", type: "contains", label: "핵심 구조", weight: 0.9 },
  { id: "e17", source: "p5", target: "c6", type: "contains", label: "핵심 기여", weight: 0.9 },
  { id: "e18", source: "p1", target: "c6", type: "contains", label: "학습 안정화", weight: 0.6 },
  { id: "e19", source: "p6", target: "c7", type: "contains", label: "생성 메커니즘", weight: 0.9 },
  { id: "e20", source: "p7", target: "c8", type: "contains", label: "학습 목적함수", weight: 0.85 },
  { id: "e21", source: "p7", target: "c9", type: "contains", label: "멀티모달 학습", weight: 0.8 },
  // shared_concept
  { id: "e22", source: "p1", target: "p4", type: "shared_concept", label: "Self-Attention 공유", weight: 0.75 },
  { id: "e23", source: "p5", target: "p4", type: "shared_concept", label: "비전 모델 비교", weight: 0.6 },
  { id: "e24", source: "p2", target: "p3", type: "shared_concept", label: "사전학습 언어모델", weight: 0.8 },
  // manual: 사용자 생성, 상대적으로 낮은 weight
  { id: "e25", source: "m1", target: "p1", type: "manual", label: "정리 대상", weight: 0.5 },
  { id: "e26", source: "m1", target: "c2", type: "manual", label: "개념 정리", weight: 0.4 },
  { id: "e27", source: "m2", target: "p4", type: "manual", label: "비교 분석", weight: 0.45 },
  { id: "e28", source: "m2", target: "p5", type: "manual", label: "비교 분석", weight: 0.45 },
  { id: "e29", source: "m3", target: "p6", type: "manual", label: "비교 대상", weight: 0.4 },
  { id: "e30", source: "d1", target: "p1", type: "manual", label: "발표 참조", weight: 0.35 },
  { id: "e31", source: "d1", target: "p2", type: "manual", label: "발표 참조", weight: 0.35 },
  { id: "e32", source: "d1", target: "p3", type: "manual", label: "발표 참조", weight: 0.3 },
  { id: "e33", source: "d2", target: "p4", type: "manual", label: "프로젝트 참조", weight: 0.4 },
  { id: "e34", source: "d2", target: "p5", type: "manual", label: "프로젝트 참조", weight: 0.4 },
  // similarity
  { id: "e35", source: "p6", target: "p7", type: "similarity", label: "생성 모델 비교", weight: 0.35 },
];

const roadmaps: RoadmapModule[] = [
  {
    id: "rm-transformer",
    name: "Transformer 학습 로드맵",
    entries: [
      { nodeId: "p5", order: 1, reason: "Residual Connection은 Transformer의 핵심 구성요소", difficulty: "beginner", estimatedMinutes: 10 },
      { nodeId: "p1", order: 2, reason: "Transformer 아키텍처를 제안한 핵심 논문", difficulty: "intermediate", estimatedMinutes: 15 },
      { nodeId: "p2", order: 3, reason: "Transformer 인코더의 대표적 활용 (BERT)", difficulty: "intermediate", estimatedMinutes: 10 },
      { nodeId: "p3", order: 4, reason: "Transformer 디코더 기반 대규모 생성 모델", difficulty: "advanced", estimatedMinutes: 15 },
      { nodeId: "p4", order: 5, reason: "Transformer의 비전 영역 확장", difficulty: "intermediate", estimatedMinutes: 10 },
    ],
  },
  {
    id: "rm-diffusion",
    name: "Diffusion 학습 로드맵",
    entries: [
      { nodeId: "p6", order: 1, reason: "Diffusion 모델이 GAN을 넘어선 핵심 논문", difficulty: "intermediate", estimatedMinutes: 15 },
      { nodeId: "p7", order: 2, reason: "멀티모달 학습과 Contrastive Learning 이해", difficulty: "intermediate", estimatedMinutes: 10 },
    ],
  },
  {
    id: "rm-vision",
    name: "비전 모델 로드맵",
    entries: [
      { nodeId: "p5", order: 1, reason: "CNN과 Residual Learning의 기초", difficulty: "beginner", estimatedMinutes: 10 },
      { nodeId: "p4", order: 2, reason: "이미지에 Transformer를 적용한 ViT", difficulty: "intermediate", estimatedMinutes: 10 },
      { nodeId: "p7", order: 3, reason: "텍스트-이미지 멀티모달 학습 (CLIP)", difficulty: "intermediate", estimatedMinutes: 10 },
    ],
  },
];

export const sampleGraphData: GraphData = { nodes, edges, roadmaps };
