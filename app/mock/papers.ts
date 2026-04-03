export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  citations: number;
  abstract: string;
  tags: string[];
  doi: string;
  venue: string;
  openAccess: boolean;
}

export interface PaperContent {
  coreContribution: string;
  methodology: string;
  keyResults: string;
  significance: string;
  limitations: string;
  plainLanguageSummary: string;
}

export interface LayerContent {
  type: "prior-work" | "key-concepts" | "pipeline" | "follow-ups" | "industry-use" | "open-questions";
  title: string;
  icon: string;
  content: string;
  relatedPapers: { id: string; title: string; reason: string }[];
}

export interface RoadmapStep {
  order: number;
  paperId: string;
  title: string;
  reason: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  completed: boolean;
}

export interface Roadmap {
  id: string;
  keyword: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  steps: RoadmapStep[];
  totalMinutes: number;
}

// ─── Papers ──────────────────────────────────────────────

export const papers: Paper[] = [
  {
    id: "attention",
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit", "Llion Jones", "Aidan N. Gomez", "Łukasz Kaiser", "Illia Polosukhin"],
    year: 2017,
    citations: 120000,
    abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    tags: ["NLP", "Transformer", "Attention"],
    doi: "10.48550/arXiv.1706.03762",
    venue: "NeurIPS 2017",
    openAccess: true,
  },
  {
    id: "bert",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"],
    year: 2019,
    citations: 85000,
    abstract: "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
    tags: ["NLP", "Pre-training", "Transformer"],
    doi: "10.48550/arXiv.1810.04805",
    venue: "NAACL 2019",
    openAccess: true,
  },
  {
    id: "gpt3",
    title: "Language Models are Few-Shot Learners",
    authors: ["Tom B. Brown", "Benjamin Mann", "Nick Ryder", "Melanie Subbiah", "Jared Kaplan", "Prafulla Dhariwal", "Arvind Neelakantan", "Pranav Shyam"],
    year: 2020,
    citations: 45000,
    abstract: "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. We show that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches.",
    tags: ["LLM", "Few-shot", "GPT"],
    doi: "10.48550/arXiv.2005.14165",
    venue: "NeurIPS 2020",
    openAccess: true,
  },
  {
    id: "diffusion",
    title: "Diffusion Models Beat GANs on Image Synthesis",
    authors: ["Prafulla Dhariwal", "Alex Nichol"],
    year: 2021,
    citations: 12000,
    abstract: "We show that diffusion models can achieve image sample quality superior to the current state-of-the-art generative models. We achieve this on unconditional image generation by finding a better architecture through a series of ablations, and on conditional image generation with classifier guidance.",
    tags: ["Computer Vision", "Generative Models", "Diffusion"],
    doi: "10.48550/arXiv.2105.05233",
    venue: "NeurIPS 2021",
    openAccess: true,
  },
  {
    id: "cot",
    title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    authors: ["Jason Wei", "Xuezhi Wang", "Dale Schuurmans", "Maarten Bosma", "Brian Ichter", "Fei Xia", "Ed Chi", "Quoc Le", "Denny Zhou"],
    year: 2022,
    citations: 8500,
    abstract: "We explore how generating a chain of thought — a series of intermediate reasoning steps — significantly improves the ability of large language models to perform complex reasoning. In particular, we show how such reasoning abilities emerge naturally in sufficiently large language models via a simple method called chain-of-thought prompting.",
    tags: ["LLM", "Reasoning", "Prompting"],
    doi: "10.48550/arXiv.2201.11903",
    venue: "NeurIPS 2022",
    openAccess: true,
  },
  {
    id: "resnet",
    title: "Deep Residual Learning for Image Recognition",
    authors: ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"],
    year: 2016,
    citations: 180000,
    abstract: "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.",
    tags: ["Computer Vision", "Deep Learning", "CNN"],
    doi: "10.1109/CVPR.2016.90",
    venue: "CVPR 2016",
    openAccess: true,
  },
  {
    id: "gan",
    title: "Generative Adversarial Nets",
    authors: ["Ian J. Goodfellow", "Jean Pouget-Abadie", "Mehdi Mirza", "Bing Xu", "David Warde-Farley", "Sherjil Ozair", "Aaron Courville", "Yoshua Bengio"],
    year: 2014,
    citations: 65000,
    abstract: "We propose a new framework for estimating generative models via an adversarial process, in which we simultaneously train two models: a generative model G that captures the data distribution, and a discriminative model D that estimates the probability that a sample came from the training data rather than G.",
    tags: ["Generative Models", "Deep Learning", "GAN"],
    doi: "10.48550/arXiv.1406.2661",
    venue: "NeurIPS 2014",
    openAccess: true,
  },
  {
    id: "rlhf",
    title: "Training language models to follow instructions with human feedback",
    authors: ["Long Ouyang", "Jeff Wu", "Xu Jiang", "Diogo Almeida", "Carroll L. Wainwright", "Pamela Mishkin", "Chong Zhang", "Sandhini Agarwal"],
    year: 2022,
    citations: 9500,
    abstract: "Making language models bigger does not inherently make them better at following a user's intent. We show an avenue for aligning language models with user intent on a wide range of tasks by fine-tuning with human feedback. Starting with a set of labeler-written prompts and prompts submitted through an API, we collect a dataset of labeler demonstrations of the desired model behavior.",
    tags: ["LLM", "RLHF", "Alignment"],
    doi: "10.48550/arXiv.2203.02155",
    venue: "NeurIPS 2022",
    openAccess: true,
  },
  {
    id: "vit",
    title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    authors: ["Alexey Dosovitskiy", "Lucas Beyer", "Alexander Kolesnikov", "Dirk Weissenborn", "Xiaohua Zhai", "Thomas Unterthiner"],
    year: 2021,
    citations: 35000,
    abstract: "While the Transformer architecture has become the de-facto standard for natural language processing tasks, its applications to computer vision remain limited. We show that a pure transformer applied directly to sequences of image patches can perform very well on image classification tasks.",
    tags: ["Computer Vision", "Transformer", "ViT"],
    doi: "10.48550/arXiv.2010.11929",
    venue: "ICLR 2021",
    openAccess: true,
  },
  {
    id: "adam",
    title: "Adam: A Method for Stochastic Optimization",
    authors: ["Diederik P. Kingma", "Jimmy Ba"],
    year: 2015,
    citations: 200000,
    abstract: "We introduce Adam, an algorithm for first-order gradient-based optimization of stochastic objective functions, based on adaptive estimates of lower-order moments. The method is straightforward to implement, is computationally efficient, has little memory requirements, is invariant to diagonal rescaling of the gradients, and is well suited for problems that are large in terms of data and/or parameters.",
    tags: ["Optimization", "Deep Learning"],
    doi: "10.48550/arXiv.1412.6980",
    venue: "ICLR 2015",
    openAccess: true,
  },
];

// ─── Paper Content (Engine 1) ────────────────────────────

export const paperContents: Record<string, PaperContent> = {
  attention: {
    coreContribution: "기존 RNN/CNN 기반의 시퀀스 변환 모델을 완전히 대체하는 새로운 아키텍처인 Transformer를 제안했습니다. Self-Attention 메커니즘만으로 입력 시퀀스의 모든 위치 간 관계를 직접 모델링하여, 병렬 처리가 가능하고 장거리 의존성을 효과적으로 포착합니다.",
    methodology: "1. **Multi-Head Attention**: Query, Key, Value 행렬로 입력을 변환한 뒤, Scaled Dot-Product Attention을 여러 헤드로 병렬 수행\n2. **Positional Encoding**: 순서 정보를 사인/코사인 함수로 인코딩하여 입력에 추가\n3. **Encoder-Decoder 구조**: 6개 인코더 레이어 + 6개 디코더 레이어, 각 레이어는 Multi-Head Attention + Feed-Forward Network\n4. **Residual Connection + Layer Normalization**: 각 서브레이어에 잔차 연결과 정규화 적용",
    keyResults: "영어→독일어 번역(WMT 2014)에서 BLEU 28.4로 기존 최고 성능을 2.0 이상 초과. 영어→프랑스어에서는 BLEU 41.0으로 단일 모델 기준 SOTA 달성. 학습 시간은 기존 모델 대비 크게 단축.",
    significance: "Transformer는 NLP를 넘어 컴퓨터 비전, 음성, 생물학 등 거의 모든 딥러닝 분야의 기반 아키텍처가 되었습니다. BERT, GPT, ViT 등 이후 모든 대형 모델의 근간이 되는 '게임 체인저' 논문입니다.",
    limitations: "Self-Attention의 계산 복잡도가 시퀀스 길이의 제곱에 비례(O(n²))하여 매우 긴 시퀀스 처리에 제약이 있습니다. 위치 인코딩 방식의 일반화 가능성에 대한 검증이 부족합니다.",
    plainLanguageSummary: "컴퓨터가 문장을 이해하고 번역할 때, 기존에는 단어를 하나씩 순서대로 처리했습니다. 이 논문은 '어텐션'이라는 기술로 문장의 모든 단어를 한꺼번에 살펴볼 수 있는 새로운 방법을 만들었습니다. 덕분에 더 빠르고 정확하게 언어를 처리할 수 있게 되었고, 오늘날 ChatGPT 같은 AI의 기초가 되었습니다.",
  },
  bert: {
    coreContribution: "양방향(Bidirectional) 사전학습을 통해 문맥을 양쪽에서 동시에 이해하는 언어 표현 모델 BERT를 제안했습니다. Masked Language Model(MLM)과 Next Sentence Prediction(NSP)이라는 두 가지 사전학습 과제를 도입하여, 레이블 없는 텍스트로부터 깊은 언어 이해를 학습합니다.",
    methodology: "1. **Masked Language Model (MLM)**: 입력 토큰의 15%를 무작위로 마스킹하고, 문맥을 통해 원래 토큰을 예측\n2. **Next Sentence Prediction (NSP)**: 두 문장이 연속인지 아닌지를 예측하여 문장 간 관계 학습\n3. **Pre-train then Fine-tune**: 대규모 코퍼스로 사전학습 후, 태스크별로 간단한 출력 레이어만 추가하여 미세조정\n4. **WordPiece 토크나이저**: 30,000개 어휘로 서브워드 단위 토큰화",
    keyResults: "11개 NLP 벤치마크에서 당시 SOTA 달성. GLUE 벤치마크 80.5%(기존 대비 +7.7%), SQuAD v2.0에서 F1 83.1. 사전학습의 양방향성이 핵심임을 실험으로 입증.",
    significance: "NLP의 '사전학습 후 미세조정' 패러다임을 확립한 기념비적 논문입니다. 이후 RoBERTa, ALBERT, ELECTRA 등 수많은 후속 모델의 출발점이 되었으며, NLP 연구와 산업 적용의 표준 접근법을 바꿨습니다.",
    limitations: "MLM의 [MASK] 토큰은 실제 추론 시에는 사용되지 않아 사전학습-미세조정 간 불일치가 존재합니다. NSP 과제의 실제 기여도에 대한 의문이 후속 연구에서 제기되었습니다.",
    plainLanguageSummary: "기존 AI는 문장을 왼쪽에서 오른쪽으로만 읽었는데, BERT는 양쪽 방향에서 동시에 읽을 수 있게 만들었습니다. 빈칸 채우기(마스킹)를 통해 문맥을 깊이 이해하도록 학습하고, 이 지식을 다양한 언어 과제에 활용할 수 있습니다. 구글 검색 엔진에도 적용되어 검색 품질을 크게 향상시켰습니다.",
  },
  gpt3: {
    coreContribution: "1,750억 개 파라미터의 초대형 언어 모델 GPT-3를 통해, 별도의 미세조정 없이도 과제 설명과 몇 가지 예시만으로 다양한 NLP 과제를 수행할 수 있는 '퓨샷 학습(Few-shot Learning)' 능력을 입증했습니다.",
    methodology: "1. **Autoregressive 언어 모델**: 다음 토큰 예측으로 대규모 학습\n2. **Scaling**: 1,750억 파라미터, 45TB 텍스트 데이터 학습\n3. **In-context Learning**: Zero/One/Few-shot으로 과제 수행\n4. **Sparse Transformer 변형**: 효율적인 어텐션 패턴 활용",
    keyResults: "Few-shot 설정에서 번역, QA, 문장 완성 등 다양한 과제에서 미세조정 모델에 근접하거나 능가하는 성능 달성. 특히 모델 크기가 커질수록 in-context learning 능력이 급격히 향상되는 scaling law 발견.",
    significance: "AI의 '스케일링 시대'를 본격적으로 열었으며, 이후 ChatGPT, Claude 등 대화형 AI의 기반이 되었습니다. '하나의 모델로 모든 과제를 해결할 수 있다'는 가능성을 실증적으로 보여준 전환점입니다.",
    limitations: "막대한 학습 비용(수백만 달러 추정)과 편향(bias) 문제. 생성된 텍스트의 사실 정확성을 보장하지 못하는 '환각(hallucination)' 현상이 보고되었습니다.",
    plainLanguageSummary: "아주 큰 AI 모델을 만들면 특별한 추가 학습 없이도 다양한 일을 할 수 있다는 것을 보여준 논문입니다. 예를 들어 '이 문장을 번역해줘'라고 말하고 예시 몇 개만 보여주면 번역을 해냅니다. 이것이 바로 ChatGPT의 기초가 된 기술입니다.",
  },
  diffusion: {
    coreContribution: "디퓨전 모델이 이미지 생성 품질에서 GAN을 능가할 수 있음을 최초로 입증했습니다. 아키텍처 개선과 분류기 가이던스(Classifier Guidance)를 통해 이전 디퓨전 모델의 한계를 극복했습니다.",
    methodology: "1. **U-Net 아키텍처 개선**: Adaptive Group Normalization, 더 많은 어텐션 헤드, 다양한 해상도에서의 어텐션 적용\n2. **Classifier Guidance**: 사전학습된 분류기의 그래디언트로 생성 과정을 조건부로 유도\n3. **DDPM 기반 노이즈 스케줄 최적화**: 분산 스케줄을 코사인 함수로 개선\n4. **FID/sFID 기반 체계적 ablation**: 아키텍처 결정을 정량적으로 검증",
    keyResults: "ImageNet 256×256에서 FID 4.59 달성, 당시 GAN SOTA(BigGAN-deep)의 6.95를 크게 능가. 512×512에서도 최고 성능 기록. 특히 다양성(diversity) 측면에서 GAN 대비 압도적 우위.",
    significance: "GAN 중심이던 이미지 생성 연구의 패러다임을 디퓨전 모델로 전환시킨 논문입니다. DALL-E 2, Stable Diffusion, Midjourney 등 현재 이미지 생성 AI의 기반이 되었습니다.",
    limitations: "생성 속도가 GAN 대비 수십~수백 배 느립니다(수천 스텝 필요). Classifier Guidance는 별도의 분류기 학습이 필요하다는 추가 비용이 있습니다.",
    plainLanguageSummary: "이미지에 노이즈를 점점 더해서 완전히 흐릿하게 만든 다음, 그 과정을 거꾸로 학습하면 '노이즈에서 이미지를 만들어내는' AI를 학습시킬 수 있습니다. 이 논문은 이 방법이 기존 최고 기술(GAN)보다 더 좋은 이미지를 만든다는 것을 증명했고, Stable Diffusion이나 Midjourney 같은 AI 그림 도구의 기초가 되었습니다.",
  },
  cot: {
    coreContribution: "대규모 언어 모델에 '사고 과정을 단계별로 보여달라'고 요청하는 간단한 프롬프트 기법(Chain-of-Thought)만으로 복잡한 추론 능력을 크게 향상시킬 수 있음을 발견했습니다.",
    methodology: "1. **Chain-of-Thought 프롬프팅**: Few-shot 예시에 중간 추론 단계를 포함시켜 모델이 단계별로 사고하도록 유도\n2. **다양한 추론 벤치마크 테스트**: 산술, 상식, 기호 추론 등\n3. **모델 크기별 비교**: 다양한 크기의 모델에서 효과 측정\n4. **Ablation 연구**: 사고 과정의 어떤 요소가 중요한지 분석",
    keyResults: "GSM8K(수학 문제)에서 PaLM 540B + CoT가 정확도 56.6% → 74.4%로 대폭 향상. 특히 모델이 충분히 클 때(100B+ 파라미터) CoT의 효과가 극적으로 발현되는 'emergent ability' 확인.",
    significance: "프롬프트 엔지니어링이라는 새로운 연구 분야를 본격적으로 개척했습니다. 모델 자체를 수정하지 않고도 추론 능력을 크게 향상시킬 수 있다는 점에서 실용적 가치가 매우 큽니다.",
    limitations: "모델이 충분히 크지 않으면(~100B 미만) 효과가 제한적입니다. 올바른 추론 과정을 생성하더라도 최종 답이 틀릴 수 있으며, 추론 과정 자체의 정확성을 검증하기 어렵습니다.",
    plainLanguageSummary: "수학 문제를 풀 때 답만 쓰지 말고 풀이 과정을 써보라고 하면 정답률이 올라가는 것처럼, AI에게도 '생각하는 과정을 보여줘'라고 하면 복잡한 문제를 훨씬 잘 풉니다. 이것이 바로 Chain-of-Thought이며, 오늘날 AI와 대화할 때 더 좋은 답을 얻는 핵심 기법입니다.",
  },
};

// ─── 6-Layer Analysis (Engine 2) ─────────────────────────

export const paperLayers: Record<string, LayerContent[]> = {
  attention: [
    {
      type: "prior-work",
      title: "선행연구",
      icon: "book-open",
      content: "Transformer는 기존 시퀀스-투-시퀀스 모델의 한계를 극복하기 위해 탄생했습니다.\n\n**Seq2Seq + Attention (Bahdanau et al., 2015)**: RNN 기반 인코더-디코더에 어텐션을 처음 도입. 긴 문장에서의 정보 손실을 완화했지만, 여전히 순차 처리의 제약이 있었습니다.\n\n**Convolutional Seq2Seq (Gehring et al., 2017)**: CNN으로 병렬 처리를 시도했으나, 장거리 의존성 포착에 한계가 있었습니다.\n\n**Scaled Dot-Product Attention (Luong et al., 2015)**: 어텐션 메커니즘의 여러 변형을 체계적으로 비교 분석한 연구로, Transformer의 어텐션 설계에 직접적 영향을 주었습니다.",
      relatedPapers: [
        { id: "bert", title: "BERT", reason: "Transformer 인코더를 활용한 양방향 사전학습" },
        { id: "resnet", title: "ResNet", reason: "Residual Connection 개념의 원조" },
      ],
    },
    {
      type: "key-concepts",
      title: "핵심 개념",
      icon: "lightbulb",
      content: "**Self-Attention**: 시퀀스 내 모든 위치 쌍 간의 관계를 직접 계산합니다. 각 토큰이 Query, Key, Value로 변환되어 가중합을 계산합니다.\n\n**Multi-Head Attention**: Self-Attention을 여러 개(8개)의 '헤드'로 분리하여 서로 다른 표현 공간에서 동시에 어텐션을 수행합니다.\n\n**Positional Encoding**: Transformer는 순서 정보가 없으므로, 사인/코사인 함수로 위치 정보를 입력에 추가합니다.\n\n**Layer Normalization**: 각 레이어의 출력을 정규화하여 학습을 안정화합니다.\n\n**Residual Connection**: 입력을 출력에 직접 더해주어 그래디언트 흐름을 원활하게 합니다.",
      relatedPapers: [
        { id: "adam", title: "Adam Optimizer", reason: "Transformer 학습에 사용된 최적화 알고리즘" },
      ],
    },
    {
      type: "pipeline",
      title: "기술 파이프라인",
      icon: "settings",
      content: "```\n입력 토큰 → Embedding + Positional Encoding\n     ↓\n[Encoder × 6]\n  ├─ Multi-Head Self-Attention\n  ├─ Add & Norm (Residual)\n  ├─ Feed-Forward Network\n  └─ Add & Norm (Residual)\n     ↓\n[Decoder × 6]\n  ├─ Masked Multi-Head Self-Attention\n  ├─ Add & Norm\n  ├─ Multi-Head Cross-Attention (Encoder 출력 참조)\n  ├─ Add & Norm\n  ├─ Feed-Forward Network\n  └─ Add & Norm\n     ↓\nLinear → Softmax → 출력 토큰\n```\n\n핵심은 모든 연산이 **병렬 처리** 가능하다는 점입니다. RNN과 달리 이전 스텝의 출력을 기다릴 필요가 없어, GPU 활용이 극대화됩니다.",
      relatedPapers: [],
    },
    {
      type: "follow-ups",
      title: "후속 연구",
      icon: "git-branch",
      content: "Transformer는 현대 AI의 거의 모든 분야로 확장되었습니다.\n\n**BERT (2019)**: Transformer 인코더만 사용하여 양방향 사전학습 → NLP 태스크 통합\n\n**GPT 시리즈 (2018~)**: Transformer 디코더만 사용하여 오토리그레시브 생성 → 대화형 AI\n\n**Vision Transformer (2021)**: 이미지를 패치로 나눠 Transformer에 입력 → 컴퓨터 비전\n\n**AlphaFold 2 (2021)**: 단백질 구조 예측에 어텐션 메커니즘 활용\n\n**Efficient Transformers**: Linformer, Performer 등 O(n²) 복잡도를 줄이려는 연구들",
      relatedPapers: [
        { id: "bert", title: "BERT", reason: "인코더 기반 양방향 사전학습" },
        { id: "gpt3", title: "GPT-3", reason: "디코더 기반 초대형 언어 모델" },
        { id: "vit", title: "Vision Transformer", reason: "비전 분야로의 확장" },
      ],
    },
    {
      type: "industry-use",
      title: "산업 적용",
      icon: "building-2",
      content: "**Google 검색**: BERT를 검색 랭킹에 적용하여 검색 품질 크게 향상\n\n**OpenAI ChatGPT/GPT-4**: GPT 시리즈의 근간, 전 세계 가장 많이 사용되는 AI 서비스\n\n**Anthropic Claude**: Transformer 기반 대화형 AI\n\n**GitHub Copilot**: 코드 자동 완성에 Transformer 활용\n\n**DeepL**: Transformer 기반 번역 서비스, Google 번역 품질 능가\n\n**Midjourney/DALL-E**: 이미지 생성에서도 Transformer 구조 활용\n\n사실상 2024년 이후 출시된 거의 모든 AI 제품은 Transformer를 기반으로 합니다.",
      relatedPapers: [
        { id: "rlhf", title: "RLHF (InstructGPT)", reason: "Transformer 모델의 정렬 기술" },
      ],
    },
    {
      type: "open-questions",
      title: "오픈 퀘스천",
      icon: "help-circle",
      content: "**Attention의 진정한 작동 원리**: Self-Attention이 왜 이렇게 잘 작동하는지에 대한 이론적 이해는 아직 부족합니다.\n\n**O(n²) 복잡도 해결**: 긴 시퀀스(100K+ 토큰)를 효율적으로 처리하는 방법은 여전히 활발한 연구 영역입니다.\n\n**위치 인코딩의 한계**: 현재의 위치 인코딩 방식이 최적인지, 더 나은 방법이 있는지 연구 중입니다.\n\n**Transformer 이후(Post-Transformer)**: State Space Models(Mamba 등)이 Transformer를 대체할 수 있을지 주목받고 있습니다.\n\n**에너지 효율성**: 대형 Transformer 모델의 학습/추론 비용을 줄이는 것은 중요한 과제입니다.",
      relatedPapers: [],
    },
  ],
};

// ─── Roadmaps ────────────────────────────────────────────

export const roadmaps: Roadmap[] = [
  {
    id: "transformer-beginner",
    keyword: "Transformer",
    difficulty: "beginner",
    totalMinutes: 70,
    steps: [
      {
        order: 1,
        paperId: "adam",
        title: "Adam: A Method for Stochastic Optimization",
        reason: "딥러닝 학습의 기초인 옵티마이저를 먼저 이해합니다. 이후 모든 논문에서 사용되는 핵심 개념입니다.",
        difficulty: "beginner",
        estimatedMinutes: 10,
        completed: false,
      },
      {
        order: 2,
        paperId: "resnet",
        title: "Deep Residual Learning for Image Recognition",
        reason: "Residual Connection은 Transformer의 핵심 구성 요소입니다. CNN에서 먼저 이 개념을 이해하면 Transformer 학습이 수월합니다.",
        difficulty: "beginner",
        estimatedMinutes: 10,
        completed: false,
      },
      {
        order: 3,
        paperId: "attention",
        title: "Attention Is All You Need",
        reason: "Transformer의 원본 논문. Self-Attention, Multi-Head Attention, Encoder-Decoder 구조의 모든 것이 여기에 있습니다.",
        difficulty: "intermediate",
        estimatedMinutes: 15,
        completed: false,
      },
      {
        order: 4,
        paperId: "bert",
        title: "BERT: Pre-training of Deep Bidirectional Transformers",
        reason: "Transformer 인코더를 활용한 사전학습의 첫 성공 사례. 'Pre-train & Fine-tune' 패러다임을 확립했습니다.",
        difficulty: "intermediate",
        estimatedMinutes: 10,
        completed: false,
      },
      {
        order: 5,
        paperId: "gpt3",
        title: "Language Models are Few-Shot Learners",
        reason: "Transformer 디코더의 스케일링이 가져온 변화. In-context Learning이라는 새로운 패러다임을 열었습니다.",
        difficulty: "intermediate",
        estimatedMinutes: 10,
        completed: false,
      },
      {
        order: 6,
        paperId: "vit",
        title: "An Image is Worth 16x16 Words",
        reason: "Transformer가 NLP를 넘어 비전으로 확장된 이정표. Transformer의 범용성을 확인할 수 있습니다.",
        difficulty: "intermediate",
        estimatedMinutes: 10,
        completed: false,
      },
      {
        order: 7,
        paperId: "cot",
        title: "Chain-of-Thought Prompting",
        reason: "대형 Transformer 모델의 추론 능력을 극대화하는 기법. 현재 AI 활용의 핵심 전략입니다.",
        difficulty: "beginner",
        estimatedMinutes: 5,
        completed: false,
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────

export function getPaper(id: string): Paper | undefined {
  return papers.find((p) => p.id === id);
}

export function searchPapers(query: string): Paper[] {
  const q = query.toLowerCase();
  if (!q) return papers;
  return papers.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.abstract.toLowerCase().includes(q) ||
      p.authors.some((a) => a.toLowerCase().includes(q))
  );
}

export function getPaperContent(id: string): PaperContent | undefined {
  return paperContents[id];
}

export function getPaperLayers(id: string): LayerContent[] {
  return paperLayers[id] || [];
}

export function getRoadmap(id: string): Roadmap | undefined {
  return roadmaps.find((r) => r.id === id);
}
