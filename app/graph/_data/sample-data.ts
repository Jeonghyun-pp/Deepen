import type { GraphNode, GraphEdge, GraphData } from "./types";

// ============================================================
// v2 Unified Graph Dataset
// 모든 정보(논문·개념·기법·응용·질문·메모·문서)를 단일 그래프로 통합.
// 6-layer 분석 대신 typed relations (introduces/uses/extends/appliedIn/raises)로 환원.
// ============================================================

const nodes: GraphNode[] = [
  // ===== Papers =====
  {
    id: "p1",
    label: "Attention Is All You Need",
    type: "paper",
    tldr: "RNN/CNN 없이 Self-Attention만으로 seq2seq 모델을 구성한 Transformer 아키텍처.",
    content:
      "Transformer 아키텍처를 제안한 논문. Self-attention 메커니즘만으로 seq2seq 모델을 구성하여 기존 RNN/CNN 기반 모델보다 뛰어난 성능과 병렬화 가능성을 달성.",
    meta: { authors: "Vaswani et al.", year: 2017, citations: 120000 },
  },
  {
    id: "p2",
    label: "BERT",
    type: "paper",
    tldr: "Transformer 인코더만 사용한 양방향 사전학습 모델.",
    content:
      "Bidirectional Encoder Representations from Transformers. 양방향 Self-Attention 기반 사전학습 모델로 다양한 NLP 태스크에서 SOTA 달성.",
    meta: { authors: "Devlin et al.", year: 2018, citations: 90000 },
  },
  {
    id: "p3",
    label: "GPT-3",
    type: "paper",
    tldr: "175B 파라미터 디코더 전용 LLM, few-shot learning 입증.",
    content:
      "Language Models are Few-Shot Learners. 175B 파라미터의 디코더 전용 모델로 few-shot prompting만으로 다양한 태스크 수행 가능함을 입증.",
    meta: { authors: "Brown et al.", year: 2020, citations: 35000 },
  },
  {
    id: "p4",
    label: "Vision Transformer (ViT)",
    type: "paper",
    tldr: "이미지를 패치 시퀀스로 처리하여 Transformer를 비전에 적용.",
    content:
      "An Image is Worth 16x16 Words. 이미지를 패치로 분할하여 Transformer 인코더에 입력함으로써 CNN 없이 이미지 분류 SOTA 달성.",
    meta: { authors: "Dosovitskiy et al.", year: 2020, citations: 25000 },
  },
  {
    id: "p5",
    label: "ResNet",
    type: "paper",
    tldr: "Residual Connection으로 152층 네트워크 학습을 가능하게 함.",
    content:
      "Deep Residual Learning for Image Recognition. Skip connection으로 vanishing gradient 문제를 완화, 매우 깊은 CNN 학습을 가능하게 한 Residual Learning 제안.",
    meta: { authors: "He et al.", year: 2015, citations: 200000 },
  },
  {
    id: "p6",
    label: "DDPM",
    type: "paper",
    tldr: "점진적 denoising으로 고품질 이미지 생성. Diffusion 모델 현대화.",
    content:
      "Denoising Diffusion Probabilistic Models. 점진적으로 가우시안 노이즈를 추가/제거하는 forward-reverse process를 학습하여 GAN 수준의 이미지 생성 품질 달성.",
    meta: { authors: "Ho et al.", year: 2020, citations: 12000 },
  },
  {
    id: "p7",
    label: "CLIP",
    type: "paper",
    tldr: "400M 텍스트-이미지 쌍으로 contrastive 학습, zero-shot 분류.",
    content:
      "Learning Transferable Visual Models From Natural Language Supervision. 텍스트와 이미지를 동일 임베딩 공간에서 contrastive learning, zero-shot 이미지 분류 가능.",
    meta: { authors: "Radford et al.", year: 2021, citations: 15000 },
  },
  {
    id: "p8",
    label: "Seq2Seq",
    type: "paper",
    tldr: "RNN 기반 인코더-디코더로 시퀀스 변환 문제 해결.",
    content:
      "Sequence to Sequence Learning with Neural Networks. LSTM 인코더-디코더 구조를 기계번역에 적용하여 neural seq2seq 패러다임 확립.",
    meta: { authors: "Sutskever et al.", year: 2014, citations: 18000 },
  },
  {
    id: "p9",
    label: "Chain-of-Thought Prompting",
    type: "paper",
    tldr: "중간 추론 단계 생성을 유도하는 프롬프팅으로 reasoning 성능 향상.",
    content:
      "Chain-of-Thought Prompting Elicits Reasoning. few-shot 예시에 중간 추론 단계를 포함시키면 LLM의 복잡한 reasoning 성능이 크게 향상됨을 보임.",
    meta: { authors: "Wei et al.", year: 2022, citations: 6000 },
  },

  // ===== Concepts (범용 개념) =====
  {
    id: "c_self_attention",
    label: "Self-Attention",
    type: "concept",
    tldr: "시퀀스 내 모든 위치가 서로를 참조해 표현을 계산하는 메커니즘.",
    content:
      "Query·Key·Value 행렬의 내적으로 시퀀스 내 모든 위치 간 관계를 계산. RNN 없이 장거리 의존성을 직접 모델링.",
  },
  {
    id: "c_transformer_arch",
    label: "Transformer Architecture",
    type: "concept",
    tldr: "Self-Attention 기반 인코더-디코더 아키텍처.",
    content:
      "Multi-head Self-Attention + Feed-Forward + Residual + LayerNorm으로 구성된 블록을 N회 반복하는 인코더-디코더 구조.",
  },
  {
    id: "c_transfer_learning",
    label: "Transfer Learning",
    type: "concept",
    tldr: "사전학습 모델을 다른 태스크에 전이.",
    content:
      "대규모 데이터에서 사전학습한 표현을 소규모 타깃 태스크에 미세조정하여 성능을 끌어올리는 학습 패러다임.",
  },
  {
    id: "c_pretraining",
    label: "Pre-training",
    type: "concept",
    tldr: "레이블 없는 대규모 데이터로 범용 표현 학습.",
    content:
      "MLM, CLM 등 self-supervised objective로 대규모 비지도 데이터에서 모델을 학습하는 단계.",
  },
  {
    id: "c_residual",
    label: "Residual Connection",
    type: "concept",
    tldr: "입력을 출력에 더하는 skip connection.",
    content:
      "H(x) = F(x) + x 형태로 identity mapping을 학습 가능하게 함. 깊은 네트워크의 vanishing gradient 완화.",
  },
  {
    id: "c_contrastive_learning",
    label: "Contrastive Learning",
    type: "concept",
    tldr: "유사 쌍은 가깝게, 비유사 쌍은 멀게 학습.",
    content:
      "positive pair와 negative pair를 구분하도록 임베딩을 학습하는 self-supervised learning 접근.",
  },
  {
    id: "c_multimodal",
    label: "Multi-modal Learning",
    type: "concept",
    tldr: "텍스트·이미지·오디오 등 복수 modality 공동 학습.",
    content:
      "서로 다른 modality를 공유 임베딩 공간 또는 cross-attention으로 결합하여 학습.",
  },
  {
    id: "c_few_shot",
    label: "Few-shot Learning",
    type: "concept",
    tldr: "소수 예시만으로 새 태스크 수행.",
    content:
      "gradient update 없이 prompt 내 소수의 입력-출력 예시로 태스크를 수행하는 LLM의 emergent 능력.",
  },

  // ===== Techniques (구체적 기법, Concept의 subtype) =====
  {
    id: "t_multi_head",
    label: "Multi-Head Attention",
    type: "technique",
    tldr: "여러 attention head를 병렬로 실행.",
    content:
      "단일 attention을 h개로 분할해 다양한 표현 부분공간을 병렬 학습, 결과를 concat하여 선형 투영.",
  },
  {
    id: "t_positional_encoding",
    label: "Positional Encoding",
    type: "technique",
    tldr: "사인/코사인 함수로 위치 정보 주입.",
    content:
      "순서 정보가 없는 Self-Attention에 sinusoidal 또는 학습 가능한 위치 인코딩을 더해 순서 개념을 부여.",
  },
  {
    id: "t_mlm",
    label: "Masked Language Modeling",
    type: "technique",
    tldr: "일부 토큰을 마스킹하고 복원하는 사전학습 objective.",
    content:
      "입력 토큰의 15%를 [MASK]로 가리고 주변 문맥으로부터 예측하도록 학습하는 양방향 사전학습 기법.",
  },
  {
    id: "t_patch_embedding",
    label: "Patch Embedding",
    type: "technique",
    tldr: "이미지를 고정 크기 패치로 분할해 토큰화.",
    content:
      "이미지를 16×16 패치로 나누고 flatten + linear projection하여 Transformer 입력 시퀀스로 변환.",
  },
  {
    id: "t_denoising",
    label: "Iterative Denoising",
    type: "technique",
    tldr: "노이즈를 점진적으로 제거해 샘플을 생성.",
    content:
      "t 스텝 동안 예측된 노이즈를 점진적으로 제거하며 노이즈에서 샘플로 수렴하는 reverse process.",
  },
  {
    id: "t_cot_prompt",
    label: "Chain-of-Thought Prompting",
    type: "technique",
    tldr: "추론 과정을 단계별로 출력하도록 유도.",
    content:
      "few-shot 예시에 중간 reasoning 단계를 포함시켜 LLM이 답 이전에 추론 과정을 먼저 생성하게 함.",
  },

  // ===== Applications (실제 응용 분야) =====
  {
    id: "app_machine_translation",
    label: "기계번역",
    type: "application",
    tldr: "Google Translate, DeepL 등.",
    content: "Transformer 기반 모델이 현대 기계번역의 표준 아키텍처.",
  },
  {
    id: "app_chat_assistant",
    label: "대화형 AI",
    type: "application",
    tldr: "ChatGPT, Claude 등 LLM 기반 어시스턴트.",
    content: "대규모 디코더 Transformer + RLHF 기반의 대화형 AI 제품군.",
  },
  {
    id: "app_image_generation",
    label: "이미지 생성",
    type: "application",
    tldr: "Stable Diffusion, DALL-E 등 생성 모델.",
    content: "Diffusion 모델 기반의 text-to-image 생성 제품.",
  },
  {
    id: "app_image_classification",
    label: "이미지 분류",
    type: "application",
    tldr: "ImageNet 등 대규모 분류 벤치마크.",
    content: "CNN/ViT 기반 이미지 분류 모델이 의료·자율주행·리테일 등에서 활용.",
  },
  {
    id: "app_code_generation",
    label: "코드 생성",
    type: "application",
    tldr: "GitHub Copilot, Cursor 등 코드 어시스턴트.",
    content: "코드 데이터에 사전학습한 LLM이 IDE 내 자동완성·설명·리팩터링을 지원.",
  },

  // ===== Open Questions =====
  {
    id: "q_quadratic_attention",
    label: "O(n²) Attention 복잡도",
    type: "question",
    tldr: "시퀀스 길이에 대해 quadratic 복잡도.",
    content:
      "Self-Attention은 시퀀스 길이 n에 대해 O(n²) 연산/메모리를 요구. Linear/Flash/Sparse Attention 등으로 개선 시도 중.",
  },
  {
    id: "q_positional_generalization",
    label: "위치 인코딩 일반화",
    type: "question",
    tldr: "학습 범위 밖 시퀀스 길이로 일반화 어려움.",
    content:
      "절대 위치 인코딩은 학습된 시퀀스 길이 밖으로 일반화 어려움. RoPE, ALiBi 등 상대 위치 연구 활발.",
  },
  {
    id: "q_attention_interpretability",
    label: "Attention 해석 가능성",
    type: "question",
    tldr: "attention 가중치가 의미적 관계를 반영하는가?",
    content:
      "Attention 가중치가 실제 언어학적·의미적 관계를 반영하는지 논란. Mechanistic Interpretability 연구 주제.",
  },
  {
    id: "q_small_data_vit",
    label: "소규모 데이터 ViT 성능",
    type: "question",
    tldr: "CNN의 inductive bias 부재로 소규모 데이터에서 취약.",
    content:
      "ViT는 대규모 데이터에서 CNN을 능가하나 소규모 데이터에서는 inductive bias 부재로 취약. 하이브리드 접근 연구.",
  },
  {
    id: "q_diffusion_speed",
    label: "Diffusion 샘플링 속도",
    type: "question",
    tldr: "수십~수백 step 샘플링이 느림.",
    content:
      "DDPM은 1000 step 샘플링이 필요해 느림. DDIM, consistency model 등으로 step 수 축소 연구 진행.",
  },

  // ===== Memos (사용자 노트) =====
  {
    id: "m1",
    label: "Transformer가 NLP를 바꾼 이유",
    type: "memo",
    content:
      "RNN의 순차 처리 한계를 병렬로 극복. Attention으로 장거리 의존성 해결. 이후 BERT·GPT·ViT의 공통 기반이 됨.",
  },
  {
    id: "m2",
    label: "ViT vs CNN 정리",
    type: "memo",
    content:
      "ViT는 대규모 데이터에서 우수, 소규모 데이터에선 CNN의 inductive bias 유리. 하이브리드 실용적.",
  },
  {
    id: "m3",
    label: "Diffusion vs GAN 비교",
    type: "memo",
    content:
      "GAN: 빠르지만 mode collapse. Diffusion: 느리지만 안정적·다양성 높음. 속도 개선 연구 활발.",
  },

  // ===== Documents =====
  {
    id: "d1",
    label: "NLP 세미나 발표자료.pdf",
    type: "document",
    content:
      "2024년 1월 연구실 세미나에서 발표한 Transformer 계열 모델 서베이 자료.",
  },
  {
    id: "d2",
    label: "CV 프로젝트 제안서.pdf",
    type: "document",
    content:
      "ViT 기반 의료 이미지 분류 프로젝트 제안서. ResNet과 성능 비교 포함.",
  },
];

const edges: GraphEdge[] = [
  // ==================== p1: Attention Is All You Need ====================
  {
    id: "e_p1_int_sa",
    source: "p1",
    target: "c_self_attention",
    type: "introduces",
    weight: 0.95,
    note: "RNN 없이 Self-Attention만으로 시퀀스 모델링 가능함을 최초 제안",
  },
  {
    id: "e_p1_int_tf",
    source: "p1",
    target: "c_transformer_arch",
    type: "introduces",
    weight: 0.95,
    note: "인코더-디코더 Transformer 아키텍처 최초 제안",
  },
  {
    id: "e_p1_int_mh",
    source: "p1",
    target: "t_multi_head",
    type: "introduces",
    weight: 0.9,
    note: "Multi-Head Attention 도입",
  },
  {
    id: "e_p1_int_pe",
    source: "p1",
    target: "t_positional_encoding",
    type: "introduces",
    weight: 0.85,
    note: "사인/코사인 기반 Positional Encoding 제안",
  },
  {
    id: "e_p1_uses_res",
    source: "p1",
    target: "c_residual",
    type: "uses",
    weight: 0.7,
    note: "각 서브레이어에 Residual Connection 적용",
  },
  {
    id: "e_p1_ext_s2s",
    source: "p1",
    target: "p8",
    type: "extends",
    weight: 0.9,
    note: "Seq2Seq의 인코더-디코더 구조를 계승하되 RNN 제거",
  },
  {
    id: "e_p1_app_mt",
    source: "p1",
    target: "app_machine_translation",
    type: "appliedIn",
    weight: 0.9,
    note: "WMT 기계번역 벤치마크에서 SOTA",
  },
  {
    id: "e_p1_raises_quad",
    source: "p1",
    target: "q_quadratic_attention",
    type: "raises",
    weight: 0.85,
    note: "O(n²) 복잡도 문제 제기",
  },
  {
    id: "e_p1_raises_posgen",
    source: "p1",
    target: "q_positional_generalization",
    type: "raises",
    weight: 0.7,
    note: "학습 범위 밖 시퀀스 길이 일반화 한계",
  },
  {
    id: "e_p1_raises_interp",
    source: "p1",
    target: "q_attention_interpretability",
    type: "raises",
    weight: 0.6,
    note: "Attention 가중치 해석 논란 촉발",
  },

  // ==================== p2: BERT ====================
  {
    id: "e_p2_uses_tf",
    source: "p2",
    target: "c_transformer_arch",
    type: "uses",
    weight: 0.9,
    note: "Transformer 인코더만 사용",
  },
  {
    id: "e_p2_int_mlm",
    source: "p2",
    target: "t_mlm",
    type: "introduces",
    weight: 0.95,
    note: "Masked Language Modeling 사전학습 objective 제안",
  },
  {
    id: "e_p2_int_pretrain",
    source: "p2",
    target: "c_pretraining",
    type: "introduces",
    weight: 0.8,
    note: "대규모 양방향 사전학습 → 미세조정 패러다임 확립",
  },
  {
    id: "e_p2_uses_transfer",
    source: "p2",
    target: "c_transfer_learning",
    type: "uses",
    weight: 0.85,
  },
  {
    id: "e_p2_ext_p1",
    source: "p2",
    target: "p1",
    type: "extends",
    weight: 0.9,
    note: "Transformer 인코더를 사전학습 모델로 확장",
  },
  {
    id: "e_p2_app_mt",
    source: "p2",
    target: "app_machine_translation",
    type: "appliedIn",
    weight: 0.6,
  },

  // ==================== p3: GPT-3 ====================
  {
    id: "e_p3_uses_tf",
    source: "p3",
    target: "c_transformer_arch",
    type: "uses",
    weight: 0.9,
    note: "Transformer 디코더만 사용",
  },
  {
    id: "e_p3_int_fewshot",
    source: "p3",
    target: "c_few_shot",
    type: "introduces",
    weight: 0.95,
    note: "대규모 모델의 emergent few-shot 능력 입증",
  },
  {
    id: "e_p3_uses_pretrain",
    source: "p3",
    target: "c_pretraining",
    type: "uses",
    weight: 0.85,
  },
  {
    id: "e_p3_ext_p1",
    source: "p3",
    target: "p1",
    type: "extends",
    weight: 0.85,
    note: "Transformer 디코더를 175B 파라미터로 스케일업",
  },
  {
    id: "e_p3_app_chat",
    source: "p3",
    target: "app_chat_assistant",
    type: "appliedIn",
    weight: 0.95,
  },
  {
    id: "e_p3_app_code",
    source: "p3",
    target: "app_code_generation",
    type: "appliedIn",
    weight: 0.7,
  },

  // ==================== p4: ViT ====================
  {
    id: "e_p4_uses_sa",
    source: "p4",
    target: "c_self_attention",
    type: "uses",
    weight: 0.9,
    note: "이미지 패치에 Self-Attention 적용",
  },
  {
    id: "e_p4_uses_tf",
    source: "p4",
    target: "c_transformer_arch",
    type: "uses",
    weight: 0.85,
  },
  {
    id: "e_p4_int_patch",
    source: "p4",
    target: "t_patch_embedding",
    type: "introduces",
    weight: 0.95,
    note: "이미지를 16×16 패치로 분할해 토큰화",
  },
  {
    id: "e_p4_ext_p1",
    source: "p4",
    target: "p1",
    type: "extends",
    weight: 0.8,
    note: "Transformer를 비전 도메인으로 확장",
  },
  {
    id: "e_p4_app_class",
    source: "p4",
    target: "app_image_classification",
    type: "appliedIn",
    weight: 0.95,
    note: "ImageNet 등에서 CNN 이상 성능",
  },
  {
    id: "e_p4_raises_smalldata",
    source: "p4",
    target: "q_small_data_vit",
    type: "raises",
    weight: 0.85,
    note: "소규모 데이터에서 CNN 대비 취약성 제기",
  },

  // ==================== p5: ResNet ====================
  {
    id: "e_p5_int_res",
    source: "p5",
    target: "c_residual",
    type: "introduces",
    weight: 0.95,
    note: "Residual Connection으로 vanishing gradient 완화",
  },
  {
    id: "e_p5_app_class",
    source: "p5",
    target: "app_image_classification",
    type: "appliedIn",
    weight: 0.9,
  },

  // ==================== p6: DDPM ====================
  {
    id: "e_p6_int_denoise",
    source: "p6",
    target: "t_denoising",
    type: "introduces",
    weight: 0.95,
    note: "forward-reverse diffusion process 학습",
  },
  {
    id: "e_p6_app_imggen",
    source: "p6",
    target: "app_image_generation",
    type: "appliedIn",
    weight: 0.9,
  },
  {
    id: "e_p6_raises_speed",
    source: "p6",
    target: "q_diffusion_speed",
    type: "raises",
    weight: 0.9,
    note: "1000 step 샘플링의 속도 한계 제기",
  },

  // ==================== p6 → p7 cross-link ====================
  {
    id: "e_cite_p7_p6",
    source: "p7",
    target: "p6",
    type: "citation",
    label: "생성 모델 비교",
    weight: 0.4,
  },
  {
    id: "e_p6_uses_res",
    source: "p6",
    target: "c_residual",
    type: "uses",
    weight: 0.5,
    note: "U-Net backbone에 Residual block 활용",
  },

  // ==================== p7: CLIP ====================
  {
    id: "e_p7_int_multimodal",
    source: "p7",
    target: "c_multimodal",
    type: "introduces",
    weight: 0.9,
    note: "텍스트-이미지 공동 임베딩 공간 학습",
  },
  {
    id: "e_p7_uses_contrastive",
    source: "p7",
    target: "c_contrastive_learning",
    type: "uses",
    weight: 0.95,
    note: "400M 쌍에 contrastive objective 적용",
  },
  {
    id: "e_p7_uses_tf",
    source: "p7",
    target: "c_transformer_arch",
    type: "uses",
    weight: 0.7,
    note: "텍스트·이미지 인코더 모두 Transformer 기반",
  },
  {
    id: "e_p7_ext_p4",
    source: "p7",
    target: "p4",
    type: "extends",
    weight: 0.6,
    note: "비전 인코더로 ViT 계열 활용",
  },
  {
    id: "e_p7_app_class",
    source: "p7",
    target: "app_image_classification",
    type: "appliedIn",
    weight: 0.85,
    note: "zero-shot 이미지 분류",
  },

  // ==================== p8: Seq2Seq ====================
  {
    id: "e_p8_app_mt",
    source: "p8",
    target: "app_machine_translation",
    type: "appliedIn",
    weight: 0.85,
  },

  // ==================== p9: Chain-of-Thought ====================
  {
    id: "e_p9_int_cot",
    source: "p9",
    target: "t_cot_prompt",
    type: "introduces",
    weight: 0.95,
    note: "중간 추론 단계 생성을 유도하는 프롬프팅 기법",
  },
  {
    id: "e_p9_uses_fewshot",
    source: "p9",
    target: "c_few_shot",
    type: "uses",
    weight: 0.85,
  },
  {
    id: "e_p9_ext_p3",
    source: "p9",
    target: "p3",
    type: "extends",
    weight: 0.75,
    note: "GPT-3의 prompting 패러다임 확장",
  },
  {
    id: "e_p9_app_chat",
    source: "p9",
    target: "app_chat_assistant",
    type: "appliedIn",
    weight: 0.8,
  },

  // ==================== Citation edges (legacy, backward compat) ====================
  {
    id: "e_cite_p2_p1",
    source: "p2",
    target: "p1",
    type: "citation",
    label: "Transformer 활용",
    weight: 0.95,
  },
  {
    id: "e_cite_p3_p1",
    source: "p3",
    target: "p1",
    type: "citation",
    label: "Transformer 디코더 확장",
    weight: 0.9,
  },
  {
    id: "e_cite_p4_p1",
    source: "p4",
    target: "p1",
    type: "citation",
    label: "Self-Attention 비전 적용",
    weight: 0.85,
  },
  {
    id: "e_cite_p4_p5",
    source: "p4",
    target: "p5",
    type: "citation",
    label: "CNN 베이스라인",
    weight: 0.4,
  },
  {
    id: "e_cite_p7_p4",
    source: "p7",
    target: "p4",
    type: "citation",
    label: "비전 인코더",
    weight: 0.7,
  },
  {
    id: "e_cite_p1_p8",
    source: "p1",
    target: "p8",
    type: "citation",
    label: "선행 인코더-디코더",
    weight: 0.85,
  },
  {
    id: "e_cite_p9_p3",
    source: "p9",
    target: "p3",
    type: "citation",
    label: "기반 LLM",
    weight: 0.85,
  },

  // ==================== Concept 관련성 ====================
  {
    id: "e_rel_transfer_pretrain",
    source: "c_transfer_learning",
    target: "c_pretraining",
    type: "relatedTo",
    weight: 0.85,
  },
  {
    id: "e_rel_sa_tf",
    source: "c_self_attention",
    target: "c_transformer_arch",
    type: "relatedTo",
    weight: 0.95,
  },
  {
    id: "e_rel_contrastive_multimodal",
    source: "c_contrastive_learning",
    target: "c_multimodal",
    type: "relatedTo",
    weight: 0.7,
  },

  // ==================== User Memos (manual) ====================
  {
    id: "e_m1_p1",
    source: "m1",
    target: "p1",
    type: "manual",
    label: "핵심 참조",
    weight: 0.5,
  },
  {
    id: "e_m1_tf",
    source: "m1",
    target: "c_transformer_arch",
    type: "manual",
    label: "개념 정리",
    weight: 0.4,
  },
  {
    id: "e_m2_p4",
    source: "m2",
    target: "p4",
    type: "manual",
    label: "비교 분석",
    weight: 0.45,
  },
  {
    id: "e_m2_p5",
    source: "m2",
    target: "p5",
    type: "manual",
    label: "비교 분석",
    weight: 0.45,
  },
  {
    id: "e_m3_p6",
    source: "m3",
    target: "p6",
    type: "manual",
    label: "비교 대상",
    weight: 0.4,
  },

  // ==================== Documents ====================
  {
    id: "e_d1_p1",
    source: "d1",
    target: "p1",
    type: "manual",
    label: "발표 참조",
    weight: 0.35,
  },
  {
    id: "e_d1_p2",
    source: "d1",
    target: "p2",
    type: "manual",
    label: "발표 참조",
    weight: 0.35,
  },
  {
    id: "e_d1_p3",
    source: "d1",
    target: "p3",
    type: "manual",
    label: "발표 참조",
    weight: 0.3,
  },
  {
    id: "e_d2_p4",
    source: "d2",
    target: "p4",
    type: "manual",
    label: "프로젝트 참조",
    weight: 0.4,
  },
  {
    id: "e_d2_p5",
    source: "d2",
    target: "p5",
    type: "manual",
    label: "프로젝트 참조",
    weight: 0.4,
  },
];

export const sampleGraphData: GraphData = { nodes, edges };
