import type { GraphNode, GraphEdge, GraphData } from "./types";

// Whiteboard 폴백 전용 미니 fixture.
// 빈 store에서 whiteboard에 진입했을 때만 사용됨 — 실제 사용자 데이터는 /api/graph/current.
// 노드 타입(7종) + 엣지 타입(3종) 모두 한 번씩 등장하도록만 유지.

const nodes: GraphNode[] = [
  // ---------- Papers ----------
  {
    id: "p1",
    label: "Attention Is All You Need",
    type: "paper",
    tldr: "Self-Attention만으로 seq2seq를 구성한 Transformer 아키텍처.",
    content: "RNN/CNN 없이 Self-Attention만으로 구성된 Transformer를 제안.",
    meta: { authors: "Vaswani et al.", year: 2017, citations: 120000 },
  },
  {
    id: "p2",
    label: "BERT",
    type: "paper",
    tldr: "Transformer 인코더 기반 양방향 사전학습 모델.",
    content: "Bidirectional Encoder Representations from Transformers.",
    meta: { authors: "Devlin et al.", year: 2018, citations: 90000 },
  },
  {
    id: "p3",
    label: "GPT-3",
    type: "paper",
    tldr: "175B 디코더 LLM, few-shot learning 입증.",
    content: "Language Models are Few-Shot Learners.",
    meta: { authors: "Brown et al.", year: 2020, citations: 35000 },
  },
  {
    id: "p4",
    label: "Vision Transformer (ViT)",
    type: "paper",
    tldr: "이미지를 패치 시퀀스로 다뤄 Transformer를 비전에 적용.",
    content: "An Image is Worth 16x16 Words.",
    meta: { authors: "Dosovitskiy et al.", year: 2020, citations: 30000 },
  },
  {
    id: "p5",
    label: "CLIP",
    type: "paper",
    tldr: "이미지-텍스트 대조학습으로 zero-shot 분류.",
    content: "Learning Transferable Visual Models From Natural Language Supervision.",
    meta: { authors: "Radford et al.", year: 2021, citations: 18000 },
  },
  {
    id: "p6",
    label: "Seq2Seq",
    type: "paper",
    tldr: "LSTM 인코더-디코더로 neural seq2seq 패러다임 확립.",
    content: "Sequence to Sequence Learning with Neural Networks.",
    meta: { authors: "Sutskever et al.", year: 2014, citations: 18000 },
  },

  // ---------- Concepts ----------
  {
    id: "c_attention",
    label: "Self-Attention",
    type: "concept",
    tldr: "토큰 간 가중합으로 문맥을 인코딩하는 메커니즘.",
    content: "Q·K·V로 토큰 간 관련도를 계산하고 V를 가중합하는 핵심 연산.",
  },
  {
    id: "c_transformer",
    label: "Transformer 아키텍처",
    type: "concept",
    tldr: "Self-Attention + FFN + Residual로 구성된 인코더/디코더.",
    content: "Multi-head attention과 position-wise FFN, residual·layernorm 결합.",
  },
  {
    id: "c_pretraining",
    label: "사전학습 (Pre-training)",
    type: "concept",
    tldr: "대규모 corpus에 대해 자기지도학습으로 표현을 학습.",
    content: "MLM/AR LM 목적으로 학습된 표현을 다양한 다운스트림에 전이.",
  },
  {
    id: "c_few_shot",
    label: "Few-shot Learning",
    type: "concept",
    tldr: "소수 예시만으로 태스크를 수행.",
    content: "프롬프트의 in-context 예시로 학습 없이 일반화.",
  },

  // ---------- Techniques ----------
  {
    id: "t_multihead",
    label: "Multi-Head Attention",
    type: "technique",
    tldr: "여러 head를 병렬로 두어 다양한 관계 학습.",
    content: "h개의 head로 attention을 독립 수행 후 concat.",
  },
  {
    id: "t_positional",
    label: "Positional Encoding",
    type: "technique",
    tldr: "위치 정보를 임베딩에 더해 순서 인식.",
    content: "Sinusoidal 또는 학습형 위치 임베딩.",
  },

  // ---------- Applications ----------
  {
    id: "a_translation",
    label: "기계번역",
    type: "application",
    tldr: "Transformer 등장 이전부터 seq2seq의 대표 응용.",
    content: "WMT 등 번역 벤치마크에서 SOTA 갱신.",
  },

  // ---------- Open questions ----------
  {
    id: "q_quadratic",
    label: "Attention의 O(n²) 문제",
    type: "question",
    tldr: "긴 문맥에서 메모리/연산이 quadratic으로 증가.",
    content: "Sparse/Linear/Sliding-window attention 등이 시도됨.",
  },

  // ---------- User memos ----------
  {
    id: "m1",
    label: "Transformer 정리 메모",
    type: "memo",
    tldr: "Self-attention 직관과 학습 순서 정리.",
    content: "Q·K·V → softmax → 가중합. multi-head는 표현력 확장.",
  },

  // ---------- Documents ----------
  {
    id: "d1",
    label: "Transformer 발표 자료",
    type: "document",
    tldr: "스터디용 슬라이드.",
    content: "p1·p2·p3 비교 + self-attention 시각화.",
  },
];

const edges: GraphEdge[] = [
  // prerequisite — 학습 순서(DAG)
  { id: "e1", source: "c_attention", target: "c_transformer", type: "prerequisite", weight: 0.9 },
  { id: "e2", source: "c_transformer", target: "c_pretraining", type: "prerequisite", weight: 0.85 },
  { id: "e3", source: "c_pretraining", target: "c_few_shot", type: "prerequisite", weight: 0.8 },
  { id: "e4", source: "p6", target: "p1", type: "prerequisite", weight: 0.7 },
  { id: "e5", source: "p1", target: "p2", type: "prerequisite", weight: 0.85 },
  { id: "e6", source: "p2", target: "p3", type: "prerequisite", weight: 0.7 },
  { id: "e7", source: "p1", target: "p4", type: "prerequisite", weight: 0.75 },

  // contains — 상위/하위 포함
  { id: "e8", source: "c_transformer", target: "t_multihead", type: "contains", weight: 0.9 },
  { id: "e9", source: "c_transformer", target: "t_positional", type: "contains", weight: 0.85 },
  { id: "e10", source: "c_attention", target: "t_multihead", type: "contains", weight: 0.8 },

  // relatedTo — 동일 맥락 공출현
  { id: "e11", source: "p1", target: "c_transformer", type: "relatedTo", label: "도입", weight: 0.95 },
  { id: "e12", source: "p1", target: "c_attention", type: "relatedTo", weight: 0.9 },
  { id: "e13", source: "p2", target: "c_pretraining", type: "relatedTo", weight: 0.85 },
  { id: "e14", source: "p3", target: "c_few_shot", type: "relatedTo", weight: 0.9 },
  { id: "e15", source: "p4", target: "c_transformer", type: "relatedTo", weight: 0.7 },
  { id: "e16", source: "p5", target: "p4", type: "relatedTo", label: "비전 멀티모달", weight: 0.7 },
  { id: "e17", source: "p6", target: "a_translation", type: "relatedTo", weight: 0.8 },
  { id: "e18", source: "p1", target: "a_translation", type: "relatedTo", weight: 0.7 },
  { id: "e19", source: "p1", target: "q_quadratic", type: "relatedTo", weight: 0.6 },
  { id: "e20", source: "m1", target: "p1", type: "relatedTo", label: "핵심 참조", weight: 0.5 },
  { id: "e21", source: "m1", target: "c_transformer", type: "relatedTo", weight: 0.45 },
  { id: "e22", source: "d1", target: "p1", type: "relatedTo", label: "발표 참조", weight: 0.4 },
  { id: "e23", source: "d1", target: "p2", type: "relatedTo", weight: 0.35 },
  { id: "e24", source: "d1", target: "p3", type: "relatedTo", weight: 0.3 },
];

export const sampleGraphData: GraphData = { nodes, edges };
