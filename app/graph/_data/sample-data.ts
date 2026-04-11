import type { GraphNode, GraphEdge, GraphData } from "./types";

// ============================================================
// v2 Unified Graph Dataset
// 3 cluster: NLP/LLM · Vision/Multimodal · RL/Decision
// typed relation 11종 전부 등장 (introduces/uses/extends/appliedIn/raises/relatedTo
//   + citation/shared_concept/contains/similarity/manual)
// ============================================================

const nodes: GraphNode[] = [
  // ============================================================
  // ===== Papers — NLP / LLM cluster =====
  // ============================================================
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
  {
    id: "p10",
    label: "T5",
    type: "paper",
    tldr: "모든 NLP 태스크를 text-to-text 형식으로 통일.",
    content:
      "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer. 분류·번역·요약을 모두 텍스트 생성으로 환원하는 통합 프레임워크.",
    meta: { authors: "Raffel et al.", year: 2019, citations: 14000 },
  },
  {
    id: "p11",
    label: "RoBERTa",
    type: "paper",
    tldr: "BERT 학습 레시피 재검토로 NSP 제거·동적 마스킹 등 개선.",
    content:
      "A Robustly Optimized BERT Pretraining Approach. 더 큰 배치·더 긴 학습·더 많은 데이터로 BERT 성능 한계 재정의.",
    meta: { authors: "Liu et al.", year: 2019, citations: 22000 },
  },
  {
    id: "p12",
    label: "LLaMA",
    type: "paper",
    tldr: "오픈소스 friendly한 효율적 디코더 LLM 패밀리.",
    content:
      "LLaMA: Open and Efficient Foundation Language Models. 7B~65B 모델을 공개 데이터만으로 학습하여 GPT-3급 성능 달성.",
    meta: { authors: "Touvron et al.", year: 2023, citations: 8000 },
  },
  {
    id: "p13",
    label: "InstructGPT",
    type: "paper",
    tldr: "인간 피드백 강화학습(RLHF)으로 LLM을 사용자 지시에 정렬.",
    content:
      "Training Language Models to Follow Instructions with Human Feedback. SFT + Reward Model + PPO 3단계 학습으로 toxicity·hallucination 감소.",
    meta: { authors: "Ouyang et al.", year: 2022, citations: 9000 },
  },
  {
    id: "p14",
    label: "FlashAttention",
    type: "paper",
    tldr: "GPU SRAM-aware tiling으로 attention 메모리 IO 최소화.",
    content:
      "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness. softmax를 블록 단위로 재계산하여 wall-clock 속도 2~4배 향상.",
    meta: { authors: "Dao et al.", year: 2022, citations: 4500 },
  },
  {
    id: "p15",
    label: "Longformer",
    type: "paper",
    tldr: "Sliding window + global attention으로 긴 문서 처리.",
    content:
      "The Long-Document Transformer. local + selective global attention으로 시퀀스 길이를 4k~16k로 확장하면서 O(n) 복잡도 유지.",
    meta: { authors: "Beltagy et al.", year: 2020, citations: 4000 },
  },
  {
    id: "p16",
    label: "RoPE",
    type: "paper",
    tldr: "회전 위치 인코딩으로 상대 위치 정보를 attention에 주입.",
    content:
      "RoFormer: Enhanced Transformer with Rotary Position Embedding. Q·K 벡터를 위치 의존 회전 행렬로 변환하여 길이 외삽 능력 향상.",
    meta: { authors: "Su et al.", year: 2021, citations: 3000 },
  },
  {
    id: "p17",
    label: "Switch Transformer",
    type: "paper",
    tldr: "Mixture-of-Experts로 1.6T 파라미터 모델 효율 학습.",
    content:
      "Scaling to Trillion Parameter Models with Simple and Efficient Sparsity. 토큰별로 한 expert만 라우팅하는 sparse MoE 도입.",
    meta: { authors: "Fedus et al.", year: 2021, citations: 2500 },
  },
  {
    id: "p18",
    label: "Retrieval-Augmented Generation",
    type: "paper",
    tldr: "외부 지식 검색을 LLM 생성에 결합한 RAG 패러다임.",
    content:
      "Retrieval-Augmented Generation for Knowledge-Intensive NLP. dense retriever + seq2seq generator를 end-to-end 학습.",
    meta: { authors: "Lewis et al.", year: 2020, citations: 5000 },
  },

  // ============================================================
  // ===== Papers — Vision / Multimodal cluster =====
  // ============================================================
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
    id: "p19",
    label: "Swin Transformer",
    type: "paper",
    tldr: "Shifted window로 계층적 비전 Transformer 구성.",
    content:
      "Hierarchical Vision Transformer using Shifted Windows. 윈도우 내 attention + 윈도우 shift로 O(n) 비용에 multi-scale 표현 학습.",
    meta: { authors: "Liu et al.", year: 2021, citations: 12000 },
  },
  {
    id: "p20",
    label: "DETR",
    type: "paper",
    tldr: "Transformer 디코더로 객체 검출을 set prediction 문제로 환원.",
    content:
      "End-to-End Object Detection with Transformers. anchor·NMS 없이 bipartite matching loss로 직접 객체 집합 예측.",
    meta: { authors: "Carion et al.", year: 2020, citations: 9000 },
  },
  {
    id: "p21",
    label: "MAE",
    type: "paper",
    tldr: "이미지의 75%를 마스킹하고 복원하는 self-supervised ViT 사전학습.",
    content:
      "Masked Autoencoders Are Scalable Vision Learners. encoder는 visible patch만 처리, lightweight decoder가 픽셀 복원.",
    meta: { authors: "He et al.", year: 2021, citations: 6000 },
  },
  {
    id: "p22",
    label: "Stable Diffusion",
    type: "paper",
    tldr: "VAE 잠재공간에서 diffusion을 수행해 고해상도 생성 비용 절감.",
    content:
      "High-Resolution Image Synthesis with Latent Diffusion Models. 픽셀 공간 대신 latent에서 diffusion하여 GPU 메모리·속도 개선.",
    meta: { authors: "Rombach et al.", year: 2022, citations: 8000 },
  },
  {
    id: "p23",
    label: "DALL-E 2",
    type: "paper",
    tldr: "CLIP 임베딩 + diffusion prior로 텍스트-이미지 생성.",
    content:
      "Hierarchical Text-Conditional Image Generation with CLIP Latents. CLIP 임베딩을 prior로 diffusion decoder가 고품질 이미지 생성.",
    meta: { authors: "Ramesh et al.", year: 2022, citations: 4500 },
  },
  {
    id: "p24",
    label: "Segment Anything",
    type: "paper",
    tldr: "프롬프트 기반 zero-shot 객체 분할 foundation model.",
    content:
      "Segment Anything (SAM). 1B+ 마스크로 학습된 promptable segmentation 모델로 zero-shot 분할 달성.",
    meta: { authors: "Kirillov et al.", year: 2023, citations: 3500 },
  },
  {
    id: "p25",
    label: "ConvNeXt",
    type: "paper",
    tldr: "ViT의 디자인 선택을 CNN에 역수입한 modern CNN.",
    content:
      "A ConvNet for the 2020s. ResNet에 ViT-style 설계(LN·GELU·larger kernel)를 점진적 적용해 ViT 동급 성능 달성.",
    meta: { authors: "Liu et al.", year: 2022, citations: 5000 },
  },

  // ============================================================
  // ===== Papers — RL / Decision cluster =====
  // ============================================================
  {
    id: "p26",
    label: "DQN",
    type: "paper",
    tldr: "CNN + Q-learning으로 Atari 게임을 픽셀에서 학습.",
    content:
      "Human-level control through deep reinforcement learning. Experience replay + target network로 Q-learning 안정화.",
    meta: { authors: "Mnih et al.", year: 2015, citations: 30000 },
  },
  {
    id: "p27",
    label: "AlphaGo",
    type: "paper",
    tldr: "Policy + Value network와 MCTS로 인간 챔피언급 바둑 달성.",
    content:
      "Mastering the game of Go with deep neural networks and tree search. 정책망·가치망 + Monte Carlo Tree Search 결합.",
    meta: { authors: "Silver et al.", year: 2016, citations: 18000 },
  },
  {
    id: "p28",
    label: "PPO",
    type: "paper",
    tldr: "Clipped surrogate objective로 안정적 policy gradient 학습.",
    content:
      "Proximal Policy Optimization Algorithms. policy 업데이트 폭을 ratio clipping으로 제한해 TRPO보다 단순·안정.",
    meta: { authors: "Schulman et al.", year: 2017, citations: 24000 },
  },
  {
    id: "p29",
    label: "SAC",
    type: "paper",
    tldr: "최대 엔트로피 RL로 탐험과 안정성을 동시에 확보.",
    content:
      "Soft Actor-Critic. 보상에 entropy 항을 추가하여 stochastic policy를 학습, 연속 제어 SOTA 달성.",
    meta: { authors: "Haarnoja et al.", year: 2018, citations: 12000 },
  },
  {
    id: "p30",
    label: "Decision Transformer",
    type: "paper",
    tldr: "RL을 시퀀스 모델링 문제로 환원해 GPT 구조로 정책 학습.",
    content:
      "Reinforcement Learning via Sequence Modeling. (return, state, action) 토큰 시퀀스를 GPT처럼 예측해 offline RL 수행.",
    meta: { authors: "Chen et al.", year: 2021, citations: 2500 },
  },
  {
    id: "p31",
    label: "Dreamer",
    type: "paper",
    tldr: "잠재 world model로 imagination 기반 정책 학습.",
    content:
      "Mastering Atari with Discrete World Models. learned latent dynamics에서 rollout한 가상 경험으로 actor-critic 학습.",
    meta: { authors: "Hafner et al.", year: 2020, citations: 1500 },
  },
  {
    id: "p32",
    label: "RT-2",
    type: "paper",
    tldr: "Vision-Language-Action 모델로 로봇 조작에 web knowledge 전이.",
    content:
      "RT-2: Vision-Language-Action Models Transfer Web Knowledge. PaLI-X / PaLM-E를 로봇 액션 토큰까지 fine-tune.",
    meta: { authors: "Brohan et al.", year: 2023, citations: 800 },
  },
  {
    id: "p33",
    label: "AlphaZero",
    type: "paper",
    tldr: "사람 기보 없이 self-play로 바둑·체스·쇼기 마스터.",
    content:
      "A general reinforcement learning algorithm that masters chess, shogi, and Go through self-play. tabula rasa learning + MCTS.",
    meta: { authors: "Silver et al.", year: 2017, citations: 8000 },
  },

  // ============================================================
  // ===== Concepts =====
  // ============================================================
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
  {
    id: "c_self_supervised",
    label: "Self-Supervised Learning",
    type: "concept",
    tldr: "데이터 자체에서 supervision signal을 만드는 학습 방식.",
    content:
      "마스킹·대조·예측 등 pretext task로 레이블 없이 표현 학습. MLM, MAE, contrastive 모두 SSL에 속함.",
  },
  {
    id: "c_scaling_law",
    label: "Scaling Laws",
    type: "concept",
    tldr: "모델·데이터·연산량과 성능의 멱법칙 관계.",
    content:
      "loss가 model size·dataset size·compute에 대해 power law로 감소한다는 경험적 관찰. Chinchilla compute-optimal 등.",
  },
  {
    id: "c_rlhf",
    label: "RLHF",
    type: "concept",
    tldr: "인간 선호 데이터로 학습한 reward model로 RL 미세조정.",
    content:
      "Reinforcement Learning from Human Feedback. SFT → reward model → PPO 3단계로 LLM을 인간 선호에 정렬.",
  },
  {
    id: "c_policy_gradient",
    label: "Policy Gradient",
    type: "concept",
    tldr: "정책 파라미터로 reward 기댓값을 직접 최적화.",
    content:
      "∇J(θ) = E[∇log π(a|s) · A] 형태의 gradient로 stochastic policy를 학습. REINFORCE, TRPO, PPO 등 계열.",
  },
  {
    id: "c_value_learning",
    label: "Value-based RL",
    type: "concept",
    tldr: "Q함수·V함수를 학습해 정책을 도출.",
    content:
      "Bellman equation 기반으로 가치 함수를 추정하고 greedy 또는 ε-greedy로 행동 선택. Q-learning, DQN 계열.",
  },
  {
    id: "c_world_model",
    label: "World Model",
    type: "concept",
    tldr: "환경의 dynamics를 학습한 내부 simulator.",
    content:
      "관측·액션으로부터 다음 상태/보상을 예측하는 학습된 모델. imagination rollout으로 sample efficiency 향상.",
  },
  {
    id: "c_mcts",
    label: "Monte Carlo Tree Search",
    type: "concept",
    tldr: "선택·확장·시뮬·역전파로 탐색 트리를 점진적으로 구축.",
    content:
      "UCB 기반 selection으로 promising 노드를 깊이 탐색. AlphaGo는 정책망·가치망으로 selection·rollout을 보강.",
  },
  {
    id: "c_attention_mechanism",
    label: "Attention",
    type: "concept",
    tldr: "Query에 따라 가변 가중치로 정보를 집계하는 메커니즘.",
    content:
      "Self-Attention의 상위 개념. 입력의 어떤 부분에 집중할지 학습하는 일반적 신경망 메커니즘.",
  },
  {
    id: "c_long_context",
    label: "Long Context Modeling",
    type: "concept",
    tldr: "긴 시퀀스를 효율적으로 처리하는 모델링 방향.",
    content:
      "수만~수십만 토큰 입력을 다루기 위한 sparse/linear attention, sliding window, recurrence 등 접근.",
  },

  // ============================================================
  // ===== Techniques (구체적 기법) =====
  // ============================================================
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
  {
    id: "t_lora",
    label: "LoRA",
    type: "technique",
    tldr: "low-rank 행렬만 학습하는 parameter-efficient fine-tuning.",
    content:
      "freeze된 weight에 low-rank 분해된 ΔW만 더해 학습. 메모리·디스크 비용을 100배 이상 절감.",
  },
  {
    id: "t_flash_attn",
    label: "FlashAttention Kernel",
    type: "technique",
    tldr: "tile-based softmax로 attention IO 최소화.",
    content:
      "Q·K·V를 SRAM에 로드해 블록 단위로 softmax 재계산, HBM 접근 최소화.",
  },
  {
    id: "t_sliding_window_attn",
    label: "Sliding Window Attention",
    type: "technique",
    tldr: "각 토큰이 인접 w개 토큰만 참조하는 local attention.",
    content:
      "O(n²) → O(n·w)로 복잡도 감소. global token 몇 개를 추가해 long-range 의존성 보강.",
  },
  {
    id: "t_rope_rotary",
    label: "Rotary Embedding",
    type: "technique",
    tldr: "Q·K에 위치 의존 회전 행렬을 곱해 상대 위치 정보 인코딩.",
    content:
      "복소 평면 회전으로 inner product가 자연스럽게 상대 위치에 의존하게 만들어 길이 외삽 능력 향상.",
  },
  {
    id: "t_ppo",
    label: "PPO Clip Objective",
    type: "technique",
    tldr: "policy ratio를 [1-ε, 1+ε]로 클리핑하여 큰 업데이트 방지.",
    content:
      "min(r·A, clip(r, 1-ε, 1+ε)·A)로 업데이트 폭을 제한, KL constraint 없이도 안정적 정책 학습.",
  },
  {
    id: "t_experience_replay",
    label: "Experience Replay",
    type: "technique",
    tldr: "과거 transition을 buffer에 저장하고 무작위 샘플링.",
    content:
      "online RL의 sample correlation을 깨고 데이터 재사용으로 sample efficiency 향상.",
  },
  {
    id: "t_target_network",
    label: "Target Network",
    type: "technique",
    tldr: "지연 업데이트되는 별도 Q-network로 학습 안정화.",
    content:
      "TD target 계산에 main network 대신 천천히 갱신되는 target network 사용해 발산 방지.",
  },
  {
    id: "t_self_play",
    label: "Self-Play",
    type: "technique",
    tldr: "에이전트가 자기 자신과 대국하며 정책 개선.",
    content:
      "현재 정책 vs 과거 정책을 반복해 점진적으로 강해지는 학습 방식. AlphaZero·OpenAI Five 등.",
  },
  {
    id: "t_image_masking",
    label: "Image Masking",
    type: "technique",
    tldr: "이미지의 큰 비율을 가리고 복원하는 self-supervised pretext.",
    content:
      "MAE는 75% 패치를 마스킹. 큰 마스킹 비율이 의미 있는 표현 학습을 유도.",
  },
  {
    id: "t_classifier_free_guidance",
    label: "Classifier-Free Guidance",
    type: "technique",
    tldr: "조건/무조건 점수의 외삽으로 conditional 생성을 강화.",
    content:
      "ε_cond + w·(ε_cond - ε_uncond) 형태로 guidance scale을 조절해 prompt 충실도 향상.",
  },

  // ============================================================
  // ===== Applications =====
  // ============================================================
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
  {
    id: "app_object_detection",
    label: "객체 검출",
    type: "application",
    tldr: "자율주행·CCTV·산업 검사 등.",
    content: "CNN/ViT 기반 검출 모델이 실시간 인지 시스템의 핵심.",
  },
  {
    id: "app_image_segmentation",
    label: "이미지 분할",
    type: "application",
    tldr: "의료 영상, 위성 영상, 사진 편집.",
    content: "픽셀 단위 분류로 객체 경계를 정확히 추출. SAM 등장 이후 zero-shot 가능.",
  },
  {
    id: "app_robotics",
    label: "로봇 제어",
    type: "application",
    tldr: "로봇 조작, 보행, 자율주행.",
    content: "정책망 기반 제어. 최근에는 VLA(Vision-Language-Action) 모델로 일반화 시도.",
  },
  {
    id: "app_game_ai",
    label: "게임 AI",
    type: "application",
    tldr: "Atari, Go, StarCraft, Dota 등.",
    content: "RL 알고리즘의 대표적 벤치마크이자 응용 분야.",
  },
  {
    id: "app_search_qa",
    label: "검색 / QA",
    type: "application",
    tldr: "RAG 기반 검색 증강 QA 시스템.",
    content: "외부 지식 retriever + LLM generator 결합으로 hallucination 완화.",
  },
  {
    id: "app_drug_discovery",
    label: "신약 개발",
    type: "application",
    tldr: "단백질·분자 생성 및 binding 예측.",
    content: "AlphaFold·생성 모델 등으로 단백질 구조·후보 분자 탐색 가속.",
  },

  // ============================================================
  // ===== Open Questions =====
  // ============================================================
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
  {
    id: "q_hallucination",
    label: "LLM Hallucination",
    type: "question",
    tldr: "사실과 다른 내용을 그럴듯하게 생성하는 문제.",
    content:
      "RAG·RLHF·factuality reward 등으로 완화 시도 중이나 근본적 해결은 미해결.",
  },
  {
    id: "q_alignment",
    label: "Alignment 문제",
    type: "question",
    tldr: "LLM을 인간 의도·가치에 정렬하는 일반적 어려움.",
    content:
      "RLHF는 임시방편. reward hacking, sycophancy 등 부작용 다수. constitutional AI, debate 등 대안 연구.",
  },
  {
    id: "q_sample_efficiency",
    label: "RL Sample Efficiency",
    type: "question",
    tldr: "RL은 수억~수십억 step의 환경 상호작용을 요구.",
    content:
      "Model-based RL, offline RL, world model 등으로 sample efficiency 개선 시도. 여전히 robotics에서 병목.",
  },
  {
    id: "q_reward_design",
    label: "보상 설계 문제",
    type: "question",
    tldr: "스칼라 reward 함수 설계가 어렵고 misspecification 발생.",
    content:
      "수동 reward는 reward hacking 유발. inverse RL, RLHF, preference learning 등 대안.",
  },
  {
    id: "q_sim_to_real",
    label: "Sim-to-Real Gap",
    type: "question",
    tldr: "시뮬에서 학습한 정책이 실제 환경에서 실패.",
    content:
      "domain randomization, system identification, fine-tuning 등으로 격차 축소 시도.",
  },

  // ============================================================
  // ===== Memos (사용자 노트) =====
  // ============================================================
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
  {
    id: "m4",
    label: "RLHF 워크플로 정리",
    type: "memo",
    content:
      "SFT → reward model → PPO 3단계. PPO가 RL 계열에서 default가 된 이유는 단순함과 안정성.",
  },
  {
    id: "m5",
    label: "Long context 옵션 정리",
    type: "memo",
    content:
      "FlashAttention(상수항), Sliding Window(O(n)), Sparse(데이터 의존), RoPE/ALiBi(위치 외삽). 조합 사용이 일반적.",
  },
  {
    id: "m6",
    label: "Decision Transformer 메모",
    type: "memo",
    content:
      "RL을 시퀀스 모델링으로 환원. offline RL에 적합. on-policy 효율은 여전히 PPO/SAC 우위.",
  },

  // ============================================================
  // ===== Documents =====
  // ============================================================
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
  {
    id: "d3",
    label: "RL 스터디 노트.pdf",
    type: "document",
    content:
      "PPO·SAC·Decision Transformer 비교 스터디. 각 알고리즘의 sample efficiency·안정성 표 포함.",
  },
  {
    id: "d4",
    label: "Long Context LLM 리포트.pdf",
    type: "document",
    content:
      "FlashAttention, Longformer, RoPE 등 long context 기법 비교 분석 리포트.",
  },
];

const edges: GraphEdge[] = [
  // ============================================================
  // ==================== p1: Attention Is All You Need ====================
  // ============================================================
  { id: "e_p1_int_sa", source: "p1", target: "c_self_attention", type: "introduces", weight: 0.95, note: "RNN 없이 Self-Attention만으로 시퀀스 모델링 가능함을 최초 제안" },
  { id: "e_p1_int_tf", source: "p1", target: "c_transformer_arch", type: "introduces", weight: 0.95, note: "인코더-디코더 Transformer 아키텍처 최초 제안" },
  { id: "e_p1_int_mh", source: "p1", target: "t_multi_head", type: "introduces", weight: 0.9 },
  { id: "e_p1_int_pe", source: "p1", target: "t_positional_encoding", type: "introduces", weight: 0.85 },
  { id: "e_p1_uses_res", source: "p1", target: "c_residual", type: "uses", weight: 0.7, note: "각 서브레이어에 Residual Connection 적용" },
  { id: "e_p1_uses_attn", source: "p1", target: "c_attention_mechanism", type: "uses", weight: 0.9 },
  { id: "e_p1_ext_s2s", source: "p1", target: "p8", type: "extends", weight: 0.9, note: "Seq2Seq의 인코더-디코더 구조를 계승하되 RNN 제거" },
  { id: "e_p1_app_mt", source: "p1", target: "app_machine_translation", type: "appliedIn", weight: 0.9 },
  { id: "e_p1_raises_quad", source: "p1", target: "q_quadratic_attention", type: "raises", weight: 0.85 },
  { id: "e_p1_raises_posgen", source: "p1", target: "q_positional_generalization", type: "raises", weight: 0.7 },
  { id: "e_p1_raises_interp", source: "p1", target: "q_attention_interpretability", type: "raises", weight: 0.6 },

  // ==================== p2: BERT ====================
  { id: "e_p2_uses_tf", source: "p2", target: "c_transformer_arch", type: "uses", weight: 0.9, note: "Transformer 인코더만 사용" },
  { id: "e_p2_int_mlm", source: "p2", target: "t_mlm", type: "introduces", weight: 0.95 },
  { id: "e_p2_int_pretrain", source: "p2", target: "c_pretraining", type: "introduces", weight: 0.8 },
  { id: "e_p2_uses_transfer", source: "p2", target: "c_transfer_learning", type: "uses", weight: 0.85 },
  { id: "e_p2_uses_ssl", source: "p2", target: "c_self_supervised", type: "uses", weight: 0.85 },
  { id: "e_p2_ext_p1", source: "p2", target: "p1", type: "extends", weight: 0.9 },
  { id: "e_p2_app_mt", source: "p2", target: "app_machine_translation", type: "appliedIn", weight: 0.6 },

  // ==================== p3: GPT-3 ====================
  { id: "e_p3_uses_tf", source: "p3", target: "c_transformer_arch", type: "uses", weight: 0.9, note: "Transformer 디코더만 사용" },
  { id: "e_p3_int_fewshot", source: "p3", target: "c_few_shot", type: "introduces", weight: 0.95 },
  { id: "e_p3_uses_pretrain", source: "p3", target: "c_pretraining", type: "uses", weight: 0.85 },
  { id: "e_p3_uses_scaling", source: "p3", target: "c_scaling_law", type: "uses", weight: 0.8 },
  { id: "e_p3_ext_p1", source: "p3", target: "p1", type: "extends", weight: 0.85 },
  { id: "e_p3_app_chat", source: "p3", target: "app_chat_assistant", type: "appliedIn", weight: 0.95 },
  { id: "e_p3_app_code", source: "p3", target: "app_code_generation", type: "appliedIn", weight: 0.7 },

  // ==================== p4: ViT ====================
  { id: "e_p4_uses_sa", source: "p4", target: "c_self_attention", type: "uses", weight: 0.9 },
  { id: "e_p4_uses_tf", source: "p4", target: "c_transformer_arch", type: "uses", weight: 0.85 },
  { id: "e_p4_int_patch", source: "p4", target: "t_patch_embedding", type: "introduces", weight: 0.95 },
  { id: "e_p4_ext_p1", source: "p4", target: "p1", type: "extends", weight: 0.8, note: "Transformer를 비전 도메인으로 확장" },
  { id: "e_p4_app_class", source: "p4", target: "app_image_classification", type: "appliedIn", weight: 0.95 },
  { id: "e_p4_raises_smalldata", source: "p4", target: "q_small_data_vit", type: "raises", weight: 0.85 },

  // ==================== p5: ResNet ====================
  { id: "e_p5_int_res", source: "p5", target: "c_residual", type: "introduces", weight: 0.95 },
  { id: "e_p5_app_class", source: "p5", target: "app_image_classification", type: "appliedIn", weight: 0.9 },
  { id: "e_p5_app_det", source: "p5", target: "app_object_detection", type: "appliedIn", weight: 0.7, note: "검출 backbone으로 광범위 사용" },

  // ==================== p6: DDPM ====================
  { id: "e_p6_int_denoise", source: "p6", target: "t_denoising", type: "introduces", weight: 0.95 },
  { id: "e_p6_app_imggen", source: "p6", target: "app_image_generation", type: "appliedIn", weight: 0.9 },
  { id: "e_p6_raises_speed", source: "p6", target: "q_diffusion_speed", type: "raises", weight: 0.9 },
  { id: "e_p6_uses_res", source: "p6", target: "c_residual", type: "uses", weight: 0.5, note: "U-Net backbone에 Residual block 활용" },

  // ==================== p7: CLIP ====================
  { id: "e_p7_int_multimodal", source: "p7", target: "c_multimodal", type: "introduces", weight: 0.9 },
  { id: "e_p7_uses_contrastive", source: "p7", target: "c_contrastive_learning", type: "uses", weight: 0.95 },
  { id: "e_p7_uses_ssl", source: "p7", target: "c_self_supervised", type: "uses", weight: 0.8 },
  { id: "e_p7_uses_tf", source: "p7", target: "c_transformer_arch", type: "uses", weight: 0.7 },
  { id: "e_p7_ext_p4", source: "p7", target: "p4", type: "extends", weight: 0.6, note: "비전 인코더로 ViT 계열 활용" },
  { id: "e_p7_app_class", source: "p7", target: "app_image_classification", type: "appliedIn", weight: 0.85, note: "zero-shot 이미지 분류" },

  // ==================== p8: Seq2Seq ====================
  { id: "e_p8_app_mt", source: "p8", target: "app_machine_translation", type: "appliedIn", weight: 0.85 },
  { id: "e_p8_uses_attn", source: "p8", target: "c_attention_mechanism", type: "uses", weight: 0.6, note: "후속 연구에서 attention 도입" },

  // ==================== p9: Chain-of-Thought ====================
  { id: "e_p9_int_cot", source: "p9", target: "t_cot_prompt", type: "introduces", weight: 0.95 },
  { id: "e_p9_uses_fewshot", source: "p9", target: "c_few_shot", type: "uses", weight: 0.85 },
  { id: "e_p9_ext_p3", source: "p9", target: "p3", type: "extends", weight: 0.75 },
  { id: "e_p9_app_chat", source: "p9", target: "app_chat_assistant", type: "appliedIn", weight: 0.8 },

  // ==================== p10: T5 ====================
  { id: "e_p10_uses_tf", source: "p10", target: "c_transformer_arch", type: "uses", weight: 0.9 },
  { id: "e_p10_uses_transfer", source: "p10", target: "c_transfer_learning", type: "uses", weight: 0.9 },
  { id: "e_p10_ext_p1", source: "p10", target: "p1", type: "extends", weight: 0.85 },
  { id: "e_p10_app_mt", source: "p10", target: "app_machine_translation", type: "appliedIn", weight: 0.7 },

  // ==================== p11: RoBERTa ====================
  { id: "e_p11_ext_p2", source: "p11", target: "p2", type: "extends", weight: 0.95, note: "BERT 학습 레시피 재검토·개선" },
  { id: "e_p11_uses_mlm", source: "p11", target: "t_mlm", type: "uses", weight: 0.9 },
  { id: "e_p11_uses_pretrain", source: "p11", target: "c_pretraining", type: "uses", weight: 0.85 },

  // ==================== p12: LLaMA ====================
  { id: "e_p12_ext_p3", source: "p12", target: "p3", type: "extends", weight: 0.85 },
  { id: "e_p12_uses_tf", source: "p12", target: "c_transformer_arch", type: "uses", weight: 0.9 },
  { id: "e_p12_uses_rope", source: "p12", target: "t_rope_rotary", type: "uses", weight: 0.85 },
  { id: "e_p12_uses_scaling", source: "p12", target: "c_scaling_law", type: "uses", weight: 0.8 },
  { id: "e_p12_app_chat", source: "p12", target: "app_chat_assistant", type: "appliedIn", weight: 0.85 },

  // ==================== p13: InstructGPT ====================
  { id: "e_p13_int_rlhf", source: "p13", target: "c_rlhf", type: "introduces", weight: 0.95 },
  { id: "e_p13_uses_ppo", source: "p13", target: "t_ppo", type: "uses", weight: 0.9, note: "RLHF 단계에서 PPO로 정책 최적화" },
  { id: "e_p13_ext_p3", source: "p13", target: "p3", type: "extends", weight: 0.9 },
  { id: "e_p13_app_chat", source: "p13", target: "app_chat_assistant", type: "appliedIn", weight: 0.95 },
  { id: "e_p13_raises_align", source: "p13", target: "q_alignment", type: "raises", weight: 0.85 },
  { id: "e_p13_raises_hall", source: "p13", target: "q_hallucination", type: "raises", weight: 0.6 },

  // ==================== p14: FlashAttention ====================
  { id: "e_p14_int_flash", source: "p14", target: "t_flash_attn", type: "introduces", weight: 0.95 },
  { id: "e_p14_uses_sa", source: "p14", target: "c_self_attention", type: "uses", weight: 0.85 },
  { id: "e_p14_uses_long", source: "p14", target: "c_long_context", type: "uses", weight: 0.85 },

  // ==================== p15: Longformer ====================
  { id: "e_p15_int_swa", source: "p15", target: "t_sliding_window_attn", type: "introduces", weight: 0.9 },
  { id: "e_p15_uses_long", source: "p15", target: "c_long_context", type: "uses", weight: 0.9 },
  { id: "e_p15_ext_p2", source: "p15", target: "p2", type: "extends", weight: 0.7 },

  // ==================== p16: RoPE ====================
  { id: "e_p16_int_rope", source: "p16", target: "t_rope_rotary", type: "introduces", weight: 0.95 },
  { id: "e_p16_uses_pe", source: "p16", target: "t_positional_encoding", type: "uses", weight: 0.7, note: "기존 PE를 회전 행렬로 일반화" },
  { id: "e_p16_app_chat", source: "p16", target: "app_chat_assistant", type: "appliedIn", weight: 0.5 },

  // ==================== p17: Switch Transformer ====================
  { id: "e_p17_uses_tf", source: "p17", target: "c_transformer_arch", type: "uses", weight: 0.85 },
  { id: "e_p17_uses_scaling", source: "p17", target: "c_scaling_law", type: "uses", weight: 0.85 },
  { id: "e_p17_ext_p1", source: "p17", target: "p1", type: "extends", weight: 0.7 },

  // ==================== p18: RAG ====================
  { id: "e_p18_app_search", source: "p18", target: "app_search_qa", type: "appliedIn", weight: 0.95 },
  { id: "e_p18_uses_tf", source: "p18", target: "c_transformer_arch", type: "uses", weight: 0.7 },
  { id: "e_p18_raises_hall", source: "p18", target: "q_hallucination", type: "raises", weight: 0.85, note: "hallucination 완화 동기로 등장" },

  // ==================== p19: Swin Transformer ====================
  { id: "e_p19_uses_sa", source: "p19", target: "c_self_attention", type: "uses", weight: 0.85 },
  { id: "e_p19_uses_swa", source: "p19", target: "t_sliding_window_attn", type: "uses", weight: 0.9 },
  { id: "e_p19_ext_p4", source: "p19", target: "p4", type: "extends", weight: 0.85 },
  { id: "e_p19_app_class", source: "p19", target: "app_image_classification", type: "appliedIn", weight: 0.9 },
  { id: "e_p19_app_det", source: "p19", target: "app_object_detection", type: "appliedIn", weight: 0.85 },

  // ==================== p20: DETR ====================
  { id: "e_p20_uses_tf", source: "p20", target: "c_transformer_arch", type: "uses", weight: 0.9 },
  { id: "e_p20_app_det", source: "p20", target: "app_object_detection", type: "appliedIn", weight: 0.95 },
  { id: "e_p20_ext_p1", source: "p20", target: "p1", type: "extends", weight: 0.7 },

  // ==================== p21: MAE ====================
  { id: "e_p21_int_mask", source: "p21", target: "t_image_masking", type: "introduces", weight: 0.95 },
  { id: "e_p21_uses_ssl", source: "p21", target: "c_self_supervised", type: "uses", weight: 0.9 },
  { id: "e_p21_uses_pretrain", source: "p21", target: "c_pretraining", type: "uses", weight: 0.8 },
  { id: "e_p21_ext_p4", source: "p21", target: "p4", type: "extends", weight: 0.85 },

  // ==================== p22: Stable Diffusion ====================
  { id: "e_p22_uses_denoise", source: "p22", target: "t_denoising", type: "uses", weight: 0.9 },
  { id: "e_p22_uses_cfg", source: "p22", target: "t_classifier_free_guidance", type: "uses", weight: 0.9 },
  { id: "e_p22_ext_p6", source: "p22", target: "p6", type: "extends", weight: 0.9 },
  { id: "e_p22_app_imggen", source: "p22", target: "app_image_generation", type: "appliedIn", weight: 0.95 },

  // ==================== p23: DALL-E 2 ====================
  { id: "e_p23_uses_denoise", source: "p23", target: "t_denoising", type: "uses", weight: 0.85 },
  { id: "e_p23_uses_multimodal", source: "p23", target: "c_multimodal", type: "uses", weight: 0.85 },
  { id: "e_p23_ext_p7", source: "p23", target: "p7", type: "extends", weight: 0.85, note: "CLIP 임베딩을 prior로 활용" },
  { id: "e_p23_app_imggen", source: "p23", target: "app_image_generation", type: "appliedIn", weight: 0.95 },

  // ==================== p24: SAM ====================
  { id: "e_p24_uses_tf", source: "p24", target: "c_transformer_arch", type: "uses", weight: 0.85 },
  { id: "e_p24_uses_pretrain", source: "p24", target: "c_pretraining", type: "uses", weight: 0.8 },
  { id: "e_p24_app_seg", source: "p24", target: "app_image_segmentation", type: "appliedIn", weight: 0.95 },

  // ==================== p25: ConvNeXt ====================
  { id: "e_p25_ext_p5", source: "p25", target: "p5", type: "extends", weight: 0.95, note: "ResNet 설계를 modernize" },
  { id: "e_p25_uses_res", source: "p25", target: "c_residual", type: "uses", weight: 0.85 },
  { id: "e_p25_app_class", source: "p25", target: "app_image_classification", type: "appliedIn", weight: 0.9 },

  // ==================== p26: DQN ====================
  { id: "e_p26_int_replay", source: "p26", target: "t_experience_replay", type: "introduces", weight: 0.9 },
  { id: "e_p26_int_target", source: "p26", target: "t_target_network", type: "introduces", weight: 0.9 },
  { id: "e_p26_uses_value", source: "p26", target: "c_value_learning", type: "uses", weight: 0.95 },
  { id: "e_p26_app_game", source: "p26", target: "app_game_ai", type: "appliedIn", weight: 0.95 },
  { id: "e_p26_raises_sample", source: "p26", target: "q_sample_efficiency", type: "raises", weight: 0.8 },

  // ==================== p27: AlphaGo ====================
  { id: "e_p27_uses_mcts", source: "p27", target: "c_mcts", type: "uses", weight: 0.95 },
  { id: "e_p27_uses_value", source: "p27", target: "c_value_learning", type: "uses", weight: 0.7 },
  { id: "e_p27_uses_pg", source: "p27", target: "c_policy_gradient", type: "uses", weight: 0.7 },
  { id: "e_p27_app_game", source: "p27", target: "app_game_ai", type: "appliedIn", weight: 0.95 },

  // ==================== p28: PPO ====================
  { id: "e_p28_int_clip", source: "p28", target: "t_ppo", type: "introduces", weight: 0.95 },
  { id: "e_p28_uses_pg", source: "p28", target: "c_policy_gradient", type: "uses", weight: 0.95 },
  { id: "e_p28_app_game", source: "p28", target: "app_game_ai", type: "appliedIn", weight: 0.85 },
  { id: "e_p28_app_robot", source: "p28", target: "app_robotics", type: "appliedIn", weight: 0.85 },

  // ==================== p29: SAC ====================
  { id: "e_p29_uses_pg", source: "p29", target: "c_policy_gradient", type: "uses", weight: 0.9 },
  { id: "e_p29_app_robot", source: "p29", target: "app_robotics", type: "appliedIn", weight: 0.9 },
  { id: "e_p29_raises_sample", source: "p29", target: "q_sample_efficiency", type: "raises", weight: 0.7 },

  // ==================== p30: Decision Transformer ====================
  { id: "e_p30_uses_tf", source: "p30", target: "c_transformer_arch", type: "uses", weight: 0.9, note: "GPT 구조로 (R,s,a) 시퀀스 모델링" },
  { id: "e_p30_uses_sa", source: "p30", target: "c_self_attention", type: "uses", weight: 0.7 },
  { id: "e_p30_ext_p3", source: "p30", target: "p3", type: "extends", weight: 0.7 },
  { id: "e_p30_app_game", source: "p30", target: "app_game_ai", type: "appliedIn", weight: 0.7 },

  // ==================== p31: Dreamer ====================
  { id: "e_p31_uses_world", source: "p31", target: "c_world_model", type: "uses", weight: 0.95 },
  { id: "e_p31_uses_pg", source: "p31", target: "c_policy_gradient", type: "uses", weight: 0.7 },
  { id: "e_p31_app_game", source: "p31", target: "app_game_ai", type: "appliedIn", weight: 0.85 },
  { id: "e_p31_raises_sample", source: "p31", target: "q_sample_efficiency", type: "raises", weight: 0.85 },

  // ==================== p32: RT-2 ====================
  { id: "e_p32_uses_multimodal", source: "p32", target: "c_multimodal", type: "uses", weight: 0.9 },
  { id: "e_p32_uses_tf", source: "p32", target: "c_transformer_arch", type: "uses", weight: 0.85 },
  { id: "e_p32_app_robot", source: "p32", target: "app_robotics", type: "appliedIn", weight: 0.95 },
  { id: "e_p32_raises_sim2real", source: "p32", target: "q_sim_to_real", type: "raises", weight: 0.7 },

  // ==================== p33: AlphaZero ====================
  { id: "e_p33_int_selfplay", source: "p33", target: "t_self_play", type: "introduces", weight: 0.95 },
  { id: "e_p33_uses_mcts", source: "p33", target: "c_mcts", type: "uses", weight: 0.95 },
  { id: "e_p33_ext_p27", source: "p33", target: "p27", type: "extends", weight: 0.95, note: "AlphaGo의 일반화 — 사람 기보 없이 self-play만으로" },
  { id: "e_p33_app_game", source: "p33", target: "app_game_ai", type: "appliedIn", weight: 0.95 },

  // ============================================================
  // ==================== Citation edges ====================
  // ============================================================
  { id: "e_cite_p2_p1", source: "p2", target: "p1", type: "citation", label: "Transformer 활용", weight: 0.95 },
  { id: "e_cite_p3_p1", source: "p3", target: "p1", type: "citation", label: "Transformer 디코더 확장", weight: 0.9 },
  { id: "e_cite_p4_p1", source: "p4", target: "p1", type: "citation", label: "Self-Attention 비전 적용", weight: 0.85 },
  { id: "e_cite_p4_p5", source: "p4", target: "p5", type: "citation", label: "CNN 베이스라인", weight: 0.4 },
  { id: "e_cite_p7_p4", source: "p7", target: "p4", type: "citation", label: "비전 인코더", weight: 0.7 },
  { id: "e_cite_p1_p8", source: "p1", target: "p8", type: "citation", label: "선행 인코더-디코더", weight: 0.85 },
  { id: "e_cite_p9_p3", source: "p9", target: "p3", type: "citation", label: "기반 LLM", weight: 0.85 },
  { id: "e_cite_p7_p6", source: "p7", target: "p6", type: "citation", label: "생성 모델 비교", weight: 0.4 },
  { id: "e_cite_p11_p2", source: "p11", target: "p2", type: "citation", label: "BERT base", weight: 0.95 },
  { id: "e_cite_p12_p3", source: "p12", target: "p3", type: "citation", label: "GPT-3 비교", weight: 0.85 },
  { id: "e_cite_p13_p3", source: "p13", target: "p3", type: "citation", label: "GPT-3 base", weight: 0.9 },
  { id: "e_cite_p13_p28", source: "p13", target: "p28", type: "citation", label: "PPO 도입", weight: 0.85 },
  { id: "e_cite_p14_p1", source: "p14", target: "p1", type: "citation", label: "attention 가속", weight: 0.85 },
  { id: "e_cite_p15_p1", source: "p15", target: "p1", type: "citation", label: "long context 동기", weight: 0.7 },
  { id: "e_cite_p17_p1", source: "p17", target: "p1", type: "citation", label: "Transformer scaling", weight: 0.7 },
  { id: "e_cite_p19_p4", source: "p19", target: "p4", type: "citation", label: "ViT 후속", weight: 0.9 },
  { id: "e_cite_p20_p1", source: "p20", target: "p1", type: "citation", label: "Transformer 검출", weight: 0.85 },
  { id: "e_cite_p21_p4", source: "p21", target: "p4", type: "citation", label: "ViT 사전학습", weight: 0.9 },
  { id: "e_cite_p22_p6", source: "p22", target: "p6", type: "citation", label: "DDPM base", weight: 0.95 },
  { id: "e_cite_p23_p7", source: "p23", target: "p7", type: "citation", label: "CLIP latent 활용", weight: 0.85 },
  { id: "e_cite_p25_p5", source: "p25", target: "p5", type: "citation", label: "ResNet baseline", weight: 0.95 },
  { id: "e_cite_p27_p26", source: "p27", target: "p26", type: "citation", label: "Deep RL 토대", weight: 0.85 },
  { id: "e_cite_p28_p27", source: "p28", target: "p27", type: "citation", label: "policy gradient 계열", weight: 0.5 },
  { id: "e_cite_p30_p3", source: "p30", target: "p3", type: "citation", label: "GPT 구조 활용", weight: 0.85 },
  { id: "e_cite_p31_p26", source: "p31", target: "p26", type: "citation", label: "Atari 벤치마크", weight: 0.7 },
  { id: "e_cite_p32_p7", source: "p32", target: "p7", type: "citation", label: "VLM backbone", weight: 0.7 },
  { id: "e_cite_p33_p27", source: "p33", target: "p27", type: "citation", label: "AlphaGo 후속", weight: 0.95 },

  // ============================================================
  // ==================== Concept relatedTo ====================
  // ============================================================
  { id: "e_rel_transfer_pretrain", source: "c_transfer_learning", target: "c_pretraining", type: "relatedTo", weight: 0.85 },
  { id: "e_rel_sa_tf", source: "c_self_attention", target: "c_transformer_arch", type: "relatedTo", weight: 0.95 },
  { id: "e_rel_contrastive_multimodal", source: "c_contrastive_learning", target: "c_multimodal", type: "relatedTo", weight: 0.7 },
  { id: "e_rel_attn_sa", source: "c_attention_mechanism", target: "c_self_attention", type: "relatedTo", weight: 0.95 },
  { id: "e_rel_pretrain_ssl", source: "c_pretraining", target: "c_self_supervised", type: "relatedTo", weight: 0.85 },
  { id: "e_rel_ssl_contrastive", source: "c_self_supervised", target: "c_contrastive_learning", type: "relatedTo", weight: 0.85 },
  { id: "e_rel_pg_value", source: "c_policy_gradient", target: "c_value_learning", type: "relatedTo", weight: 0.6 },
  { id: "e_rel_world_value", source: "c_world_model", target: "c_value_learning", type: "relatedTo", weight: 0.5 },
  { id: "e_rel_rlhf_pg", source: "c_rlhf", target: "c_policy_gradient", type: "relatedTo", weight: 0.75 },
  { id: "e_rel_long_quad", source: "c_long_context", target: "c_attention_mechanism", type: "relatedTo", weight: 0.7 },
  { id: "e_rel_scaling_pretrain", source: "c_scaling_law", target: "c_pretraining", type: "relatedTo", weight: 0.7 },

  // ============================================================
  // ==================== shared_concept ====================
  // (서로 다른 paper가 같은 concept을 공유함을 명시)
  // ============================================================
  { id: "e_sc_p2_p3", source: "p2", target: "p3", type: "shared_concept", label: "Transformer", weight: 0.85 },
  { id: "e_sc_p4_p19", source: "p4", target: "p19", type: "shared_concept", label: "Vision Transformer", weight: 0.9 },
  { id: "e_sc_p6_p22", source: "p6", target: "p22", type: "shared_concept", label: "Diffusion process", weight: 0.9 },
  { id: "e_sc_p28_p29", source: "p28", target: "p29", type: "shared_concept", label: "Policy Gradient", weight: 0.8 },
  { id: "e_sc_p27_p33", source: "p27", target: "p33", type: "shared_concept", label: "MCTS + self-play", weight: 0.85 },
  { id: "e_sc_p7_p23", source: "p7", target: "p23", type: "shared_concept", label: "CLIP embedding", weight: 0.8 },

  // ============================================================
  // ==================== similarity ====================
  // (유사한 목표·접근. extends만큼 명확하지 않은 약한 연결)
  // ============================================================
  { id: "e_sim_p14_p15", source: "p14", target: "p15", type: "similarity", label: "long context 가속", weight: 0.7 },
  { id: "e_sim_p15_p16", source: "p15", target: "p16", type: "similarity", label: "긴 시퀀스 처리", weight: 0.6 },
  { id: "e_sim_p21_p2", source: "p21", target: "p2", type: "similarity", label: "마스킹 사전학습", weight: 0.75 },
  { id: "e_sim_p25_p4", source: "p25", target: "p4", type: "similarity", label: "modern image backbone", weight: 0.6 },
  { id: "e_sim_p31_p30", source: "p31", target: "p30", type: "similarity", label: "model-based vs sequence model", weight: 0.5 },

  // ============================================================
  // ==================== contains ====================
  // (concept ↔ technique 소속 관계)
  // ============================================================
  { id: "e_cont_attn_mh", source: "c_attention_mechanism", target: "t_multi_head", type: "contains", weight: 0.9 },
  { id: "e_cont_attn_sa", source: "c_attention_mechanism", target: "c_self_attention", type: "contains", weight: 0.95 },
  { id: "e_cont_sa_pe", source: "c_self_attention", target: "t_positional_encoding", type: "contains", weight: 0.7 },
  { id: "e_cont_long_swa", source: "c_long_context", target: "t_sliding_window_attn", type: "contains", weight: 0.85 },
  { id: "e_cont_long_flash", source: "c_long_context", target: "t_flash_attn", type: "contains", weight: 0.8 },
  { id: "e_cont_long_rope", source: "c_long_context", target: "t_rope_rotary", type: "contains", weight: 0.7 },
  { id: "e_cont_ssl_mlm", source: "c_self_supervised", target: "t_mlm", type: "contains", weight: 0.85 },
  { id: "e_cont_ssl_mae", source: "c_self_supervised", target: "t_image_masking", type: "contains", weight: 0.85 },
  { id: "e_cont_pg_ppo", source: "c_policy_gradient", target: "t_ppo", type: "contains", weight: 0.9 },
  { id: "e_cont_value_replay", source: "c_value_learning", target: "t_experience_replay", type: "contains", weight: 0.85 },
  { id: "e_cont_value_target", source: "c_value_learning", target: "t_target_network", type: "contains", weight: 0.85 },
  { id: "e_cont_mcts_selfplay", source: "c_mcts", target: "t_self_play", type: "contains", weight: 0.7 },

  // ============================================================
  // ==================== Open question linkage ====================
  // ============================================================
  { id: "e_p14_q_quad", source: "p14", target: "q_quadratic_attention", type: "raises", weight: 0.6, note: "wall-clock은 빨라졌으나 점근 복잡도는 여전" },
  { id: "e_p15_q_quad", source: "p15", target: "q_quadratic_attention", type: "raises", weight: 0.8 },
  { id: "e_p16_q_posgen", source: "p16", target: "q_positional_generalization", type: "raises", weight: 0.85 },
  { id: "e_p32_q_reward", source: "p32", target: "q_reward_design", type: "raises", weight: 0.6 },

  // ============================================================
  // ==================== User Memos (manual) ====================
  // ============================================================
  { id: "e_m1_p1", source: "m1", target: "p1", type: "manual", label: "핵심 참조", weight: 0.5 },
  { id: "e_m1_tf", source: "m1", target: "c_transformer_arch", type: "manual", label: "개념 정리", weight: 0.4 },
  { id: "e_m2_p4", source: "m2", target: "p4", type: "manual", label: "비교 분석", weight: 0.45 },
  { id: "e_m2_p5", source: "m2", target: "p5", type: "manual", label: "비교 분석", weight: 0.45 },
  { id: "e_m2_q_smalldata", source: "m2", target: "q_small_data_vit", type: "manual", weight: 0.4 },
  { id: "e_m3_p6", source: "m3", target: "p6", type: "manual", label: "비교 대상", weight: 0.4 },
  { id: "e_m3_p22", source: "m3", target: "p22", type: "manual", weight: 0.35 },
  { id: "e_m4_p13", source: "m4", target: "p13", type: "manual", label: "RLHF 정리", weight: 0.5 },
  { id: "e_m4_rlhf", source: "m4", target: "c_rlhf", type: "manual", weight: 0.5 },
  { id: "e_m5_p14", source: "m5", target: "p14", type: "manual", weight: 0.45 },
  { id: "e_m5_p15", source: "m5", target: "p15", type: "manual", weight: 0.45 },
  { id: "e_m5_p16", source: "m5", target: "p16", type: "manual", weight: 0.45 },
  { id: "e_m5_long", source: "m5", target: "c_long_context", type: "manual", weight: 0.5 },
  { id: "e_m6_p30", source: "m6", target: "p30", type: "manual", label: "DT 메모", weight: 0.5 },
  { id: "e_m6_p28", source: "m6", target: "p28", type: "manual", weight: 0.4 },
  { id: "e_m6_p29", source: "m6", target: "p29", type: "manual", weight: 0.4 },

  // ============================================================
  // ==================== Documents ====================
  // ============================================================
  { id: "e_d1_p1", source: "d1", target: "p1", type: "manual", label: "발표 참조", weight: 0.35 },
  { id: "e_d1_p2", source: "d1", target: "p2", type: "manual", label: "발표 참조", weight: 0.35 },
  { id: "e_d1_p3", source: "d1", target: "p3", type: "manual", label: "발표 참조", weight: 0.3 },
  { id: "e_d1_p10", source: "d1", target: "p10", type: "manual", weight: 0.3 },
  { id: "e_d2_p4", source: "d2", target: "p4", type: "manual", label: "프로젝트 참조", weight: 0.4 },
  { id: "e_d2_p5", source: "d2", target: "p5", type: "manual", label: "프로젝트 참조", weight: 0.4 },
  { id: "e_d2_p25", source: "d2", target: "p25", type: "manual", weight: 0.35 },
  { id: "e_d3_p28", source: "d3", target: "p28", type: "manual", label: "스터디 참조", weight: 0.4 },
  { id: "e_d3_p29", source: "d3", target: "p29", type: "manual", label: "스터디 참조", weight: 0.4 },
  { id: "e_d3_p30", source: "d3", target: "p30", type: "manual", label: "스터디 참조", weight: 0.4 },
  { id: "e_d4_p14", source: "d4", target: "p14", type: "manual", label: "리포트 참조", weight: 0.4 },
  { id: "e_d4_p15", source: "d4", target: "p15", type: "manual", label: "리포트 참조", weight: 0.4 },
  { id: "e_d4_p16", source: "d4", target: "p16", type: "manual", label: "리포트 참조", weight: 0.4 },
];

export const sampleGraphData: GraphData = { nodes, edges };
