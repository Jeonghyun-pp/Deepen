# 모바일 노트앱·에듀테크 기술스택 심층 리서치 (iPad / Android Galaxy Tab 트랙)

> 리서치 일자: 2026-05-11
> 질문: iPad·Android(Galaxy Tab) 양 트랙에 대해, 노트앱과 에듀테크 앱이 어떤 개발/기술스택을 채택하는가
> 범위: 글로벌 + 한국, 노트/필기/PDF 앱 + 에듀테크 앱, 펜·OCR·동기화 포함
> 리서치 라운드: Phase 1 (5 스레드 병렬) + Phase 2 (4 deep-dive 병렬)
> 참조 소스: 90+ (★★★ 비중 약 60%)

---

## Executive Summary

iPad와 Android 양쪽에 펜·PDF·필기를 풀구현한 **참조 앱 자체가 극히 드물다**. Goodnotes는 Android를 SwiftWasm+PWA로 처리해 사용자 이탈을 겪고 있고, Notability는 2026-04에야 네이티브 Android 베타를 시작한다. Flexcil(한국, 16~18명·$38M)도 Play Store 3.2★에 머문다. 즉 **"네이티브 양쪽 + 펜 parity"는 업계 미해결 과제**이며, 신규 진입자에게는 차별화 여지가 그대로 남아 있다.

기술 선택의 분기점은 **펜·렌더링 latency를 양보할 수 있는가**다. 펜이 hero면 펜·캔버스 레이어는 네이티브가 사실상 강제된다 — Apple PencilKit(~9ms) / Android Ink API(~4ms, Wacom EMR S Pen 2.8ms)는 어느 크로스플랫폼 UI 프레임워크도 따라잡지 못하고 있다. KMP "로직 공유 + UI 네이티브" 패턴(Anki·Duolingo·Quizlet 검증)이 산업 표준 답이며, Compose Multiplatform은 캔버스 영역에 대한 production reference가 부재해 2026년 5월 현재는 캔버스 외 surface로만 안전하다.

비용은 PDF SDK가 가장 큰 변수다. PSPDFKit/Nutrient 중간값은 연 $24.5k (벤더 통합 데이터), 3년 lock-in 보고가 있다. **Apple PDFKit + PencilKit 직접 통합(iOS 무료, Goodnotes도 채택) + Android는 MuPDF App Kit($549/플랫폼) 또는 AndroidX pdf(API 35+) DIY** 조합이 Year-1 한국 에듀테크에게는 가장 합리적이다. 한국 시장 직접 모방 청사진은 **콴다의 3트랙 패턴** (네이티브 iOS + 네이티브 Android + RN+CodePush로 AI 코치/실험 surface OTA 업데이트)이며, 단 4명 미만 mobile 팀에는 오버헤드가 크다.

## Key Findings

| # | 발견 사항 | 신뢰도 | 출처 |
|---|----------|--------|------|
| 1 | "iPad + Android 모두 네이티브 + 펜 parity"를 달성한 메이저 앱은 사실상 없음 (MS Office, Concepts 정도가 부분 예외) | confirmed | [9][10][14] |
| 2 | Goodnotes Android는 SwiftWasm+PWA — Galaxy Tab S9에서 PDF 로딩 7-10초, 잉크 lag 누적 사용자 불만 | confirmed | [10][11] |
| 3 | Notability는 2026-04에야 네이티브 Android 베타 시작 — "포팅 아닌 풀 네이티브" 명시 | confirmed | [12][13] |
| 4 | Apple PencilKit ≈ 9ms / Android Ink API ≈ 4ms / Wacom EMR (S Pen) ≈ 2.8ms — 크로스플랫폼 UI는 미달성 | confirmed | [6][16] |
| 5 | Goodnotes iOS = Swift+SwiftUI + 자체 Metal 잉크 엔진 + CoreML + CRDT (PencilKit 미사용) | confirmed | [10] |
| 6 | KMP "로직 공유 + UI 네이티브" 패턴은 Duolingo·Quizlet·Anki(Rust 변형)에서 검증됨 | confirmed | [21][22][23] |
| 7 | Compose Multiplatform은 2025-05 iOS stable, 그러나 펜·캔버스 production reference 부재 | confirmed | [24] |
| 8 | 콴다(매스프레소)는 RN + 네이티브 iOS + 네이티브 Android 3트랙 동시 운영; OCR은 네이티브가 소유 | confirmed | [29][30][31] |
| 9 | PSPDFKit/Nutrient 중간 계약가 ≈ 연 $24,500 (Vendr 데이터), 3년 lock-in 보고 | confirmed | [17][18] |
| 10 | MuPDF App Kit ≈ $549/앱·플랫폼 일회성 — 상용 SDK 중 압도적 저가 | estimated | [19] |
| 11 | Apple PDFKit은 무료·Goodnotes도 사용; PKCanvasView를 PDFPageOverlayViewProvider로 오버레이하는 표준 패턴 존재 | confirmed | [20] |
| 12 | Android PdfRenderer는 API 34까지 annotation 미지원; API 35+ AndroidX pdf 도입 (잉크 미확정) | confirmed | [25][26] |
| 13 | 콴다는 OCR을 단일 Mobilenet FPN Faster RCNN (Caffe2, ~20MB float16) 모델로 iOS·Android 공유 — RN bridge 미경유 | confirmed | [32] |
| 14 | Khan Academy = 100% RN / Duolingo·Quizlet·Brilliant = 네이티브+KMP / BYJU'S = Flutter / Notion = 네이티브 셸 + 에디터만 webview | confirmed | [21][22][33][34][35] |
| 15 | Wrtn(뤼튼) = 풀 RN / Riiid(산타토익) = 풀 네이티브 (iOS TCA + Android Kotlin native) — 한국 에듀테크 양극단 사례 | confirmed | [36][37][38] |

---

## 1. 시장 지형 — Pen+PDF 양플랫폼 reference 부재

iPad와 Android 양쪽에 펜+PDF 기능을 본격적으로 구현한 consumer app은 다음과 같이 정리된다:

| 앱 | iPad | Android | 양쪽 parity | 비고 |
|----|------|---------|------------|------|
| **Goodnotes** | 네이티브 Swift+SwiftUI+Metal | SwiftWasm+PWA+TWA | ❌ Android 사용자 이탈 [11] | iOS hero, Android 보조 |
| **Notability** | 네이티브 Swift | 네이티브 (2026-04 베타) | ⏳ 미검증 | "포팅 아님" 명시 [13] |
| **Apple Notes** | PencilKit + Smart Script ML | ❌ | ❌ | Apple 한정 |
| **Samsung Notes** | ❌ | 네이티브 + Wacom EMR 2.8ms | ❌ | Samsung 한정 |
| **Squid** | ❌ | 네이티브 + WILL SDK + 저지연 OpenGL | ❌ | Android 한정 |
| **Nebo (MyScript)** | 있음 | 있음 (MyScript iink SDK) | OS-agnostic 엔진 | 텍스트 변환 hero |
| **OneNote** | 네이티브 Obj-C + C++ 코어 | 네이티브 Java + C++ 코어 | △ feature 격차 인정 [9] | MS Office C++ Liblets |
| **Concepts (TopHatch)** | 네이티브 + 벡터 엔진 | 네이티브 Kotlin + Canvas/Animator | △ iOS 우선 출시 | 7개국 분산 팀, 13년 |
| **Flexcil (한국)** | 네이티브 iOS | 네이티브 Android | ❌ Play 3.2★, feature lag | 16-18명, $38M, 2015~ |
| **Noteshelf 3** | 네이티브 | 네이티브 | ❌ UI redesign 안됨, cross-eco 동기화 X | 가격 비대칭 ($30 vs $10) |
| **Drawboard PDF** | 네이티브 | 네이티브 | △ Windows-first | 10M Windows 사용자 후 모바일 |

**시사점:** "양쪽 네이티브 + 펜 parity"는 1조 원 규모 기업(MS) 또는 10년+ 헌신(Concepts) 외에는 미해결 과제. **신규 진입자가 차별화할 여지가 가장 큰 영역**.

---

## 2. 펜·잉크 레이어 비교

### iPad — PencilKit + Apple Pencil
- **PencilKit (iOS 13+)**: Apple 공식 잉크 프레임워크. 무료, on-device, 9ms 지연(ProMotion). `PKCanvasView` + `PKToolPicker` 기본 UI 제공.
- **iPadOS 18 추가**: Apple Pencil Pro (roll, squeeze, haptic), Smart Script ML (Notes 전용, 제3자 노출 X), 완전 커스텀 도구 picker.
- **Apple Vision (VNRecognizeTextRequest)**: 손글씨 OCR 무료, on-device, iOS 13+.
- **PencilKit 우회 사례**: Goodnotes, Procreate, Notability는 모두 **자체 Metal/OpenGL 엔진**을 보유 — 차별화 잉크 품질이 hero인 경우 PencilKit으로는 부족.

### Android — Ink API + 저지연 스택
- **Android Ink API (Jetpack, 2024-10 alpha)**: Google 공식 PencilKit 등가물. 4ms 지연(Galaxy Tab S8), Compose+View 호환, API 21+ 지원, 모듈러 (Strokes/Geometry/Brush/Rendering/Live Authoring). Google 자체 앱(Docs, Photos, Drive, Keep, Classroom)이 이미 채택.
- **GLFrontBufferedRenderer**: API 29+ 저지연 스타일러스 렌더링 표준. Kalman 필터 기반 모션 예측 라이브러리 페어. Concepts·Squid가 채택.
- **Samsung S Pen Hardware**: Wacom EMR 기술 라이센스, 2.8ms 지연 (Galaxy Tab S8 이후). 앱 레이어 SDK 아닌 하드웨어 통합.
- **Samsung S Pen Remote SDK**: BLE 버튼 + 자이로 이벤트만 (단/더블 클릭, 제스처). 캔버스 잉크 X. 카메라 셔터·미디어 컨트롤용.
- **Wacom WILL SDK for Ink (Android)**: Path/Rasterizer/Manipulation/Serialization. .will, InkML, SVG 포맷 지원. Squid가 채택.
- **MyScript iink SDK 4.3 (2026-01)**: 7개 라틴어 단일 18MB 모델 (이전 100MB+ per-language에서 압축). Nebo의 엔진.
- **Jetpack Compose 1.7+**: Android 14+에서 텍스트 필드 네이티브 손글씨 지원. 잉크 캔버스는 Ink API 사용.

### 잉크 레이어 권장 매트릭스

| 차원 | iPad | Android |
|------|------|---------|
| **기본 잉크 (저비용)** | PencilKit | Android Ink API (alpha 안정성 확인 필요) |
| **차별화 잉크 (커스텀)** | Metal + 자체 엔진 (Goodnotes·Procreate 모델) | OpenGL ES 3.1 + GLFrontBufferedRenderer (Concepts 모델) |
| **잉크 SDK 라이센스** | (없음, 자체 구현) | Wacom WILL SDK / MyScript iink |
| **OCR (잉크→텍스트)** | Apple Vision (무료, iOS) | MyScript iink / Google ML Kit Digital Ink |
| **하드웨어 통합** | Apple Pencil (iPad 한정) | S Pen (Wacom EMR, Galaxy Tab S6+) |

---

## 3. PDF SDK 가격·기능 매트릭스

### 비용 비교

| SDK | 라이센스 | Year-1 (5k MAU) | 50k MAU | 500k MAU |
|-----|---------|----------------|---------|----------|
| **PSPDFKit/Nutrient** | quote, 3-yr lock 보고 | $6k~$25k (median $24.5k) | $25k~$60k | $100k~$220k |
| **Apryse/PDFTron** | quote, seat+server | $1.5k~$15k (median $26k) | $30k~$60k | $60k~$95k |
| **Foxit Mobile SDK** | quote, opaque | ~$10k~$20k (1소스) | ~$25k~$45k | ~$40k~$80k |
| **MuPDF App Kit (상용)** | $549/앱·플랫폼 일회성 | **~$1,100 (iOS+Android)** | ~$1,100 | ~$1,100 |
| **MuPDF (AGPL)** | 무료 (앱 AGPL 호환 필수) | $0 (상용 앱 불가능) | $0 | $0 |
| **ComPDF** | quote + Community License | ~$800~$3k | ~$10k~$25k | (불명) |
| **PDFium DIY** | 무료 | $0 + 엔지니어링 ~$60k~$150k | $0 + 유지비 ~$30k/yr | $0 + 플랫폼 팀 ~$200k/yr |
| **Apple PDFKit + PencilKit overlay** | 무료 (iOS만) | $0 + 1~3개월 iOS 엔지니어링 | $0 | $0 |
| **Android PdfRenderer (legacy)** | 무료 | $0 (annotation X) | $0 | $0 |
| **Android PdfRenderer API 35+** | 무료 | $0 (잉크 미확정, 설치 기반 작음) | $0 | $0 |
| **Syncfusion Flutter Community** | 매출 $1M↓ & 5명↓이면 무료 | $0 | $0 (조건 충족 시) | (조건 초과 시 상용 전환) |

### 기능 비교

| 기능 | PSPDFKit | Apryse | Foxit | PDFium DIY | Apple PDFKit | Android PdfRenderer | API 35+ |
|------|----------|--------|-------|-----------|--------------|---------------------|---------|
| Multi-page open | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (1페이지) | ✅ |
| Password PDF | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| 잉크 annotation **create** | ✅ | ✅ | ✅ | △ (타입만) | ✅ (PKCanvasView overlay) | ❌ | ? |
| 잉크 stroke path **set** | ✅ | ✅ | ✅ | **❌ (API gap)** | ✅ (manual quartz) | ❌ | ? |
| Free text annotation | ✅ | ✅ | ✅ | ✅ | △ (rendering 버그) | ❌ | △ |
| Form fill | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Pen pressure (PencilKit) | ✅ (iOS) | ✅ (iOS) | ✅ (iOS) | DIY | ✅ 네이티브 | N/A | N/A |
| 준비된 annotation UI | ✅ | ✅ | ✅ | ❌ | △ (PKToolPicker) | ❌ | △ |

### 핵심 시사점
- **Goodnotes(매출 $1B+)도 iOS에서 Apple PDFKit 사용** — PDFKit 한계는 "기능 부재"보다 "UX 통합 마찰"(터치 라우팅, 오버레이 관리). 1년차 스타트업이 PDFKit 기반으로 Goodnotes급 iOS 품질 출시 가능, 1~2개월 엔지니어링.
- **Android가 더 어려운 플랫폼**: PdfRenderer는 API 34까지 사실상 렌더링 전용. AndroidX pdf(API 35+)은 잉크 annotation 미확정. **상용 PDF SDK들이 팔리는 진짜 이유는 Android annotation parity**.
- **PDFium DIY는 잉크 annotation에 사실상 불가능** — `FPDFAnnot_SetInkList` API 부재. 렌더만 가능. Foxit은 내부 포크에 추가 API 보유.
- **MuPDF App Kit $549/앱·플랫폼은 압도적 저가** — Year-1 권장 POC.

---

## 4. 크로스플랫폼 패턴 5가지 비교

| # | 패턴 | 대표 사례 | 적합 시나리오 | 비적합 시나리오 |
|---|------|----------|--------------|----------------|
| **A** | 풀 네이티브 양쪽 (Swift + Kotlin) | Goodnotes iOS, Notability, Brilliant, Procreate, Riiid iOS, Flexcil | 펜·잉크 차별화 hero, 팀 자원 충분, 네이티브 시니어 채용 가능 | 팀 4명 미만, 빠른 RN OTA 배포 필요 |
| **B** | 네이티브 UI + 공유 로직 코어 | MS Office (C++), Anytype (Go), Anki (Rust), Duolingo·Quizlet (KMP) | 비즈 로직 복잡 (SRS, AI 코치, sync), 펜 latency 양보 X, 코어 correctness 중요 | 코어가 단순한 경우, 빠른 프로토타이핑 |
| **C** | 하이브리드 트랙 (RN + 네이티브) | **콴다 (3트랙)** | OCR/카메라/펜 hero가 네이티브, AI 코치·실험 surface는 OTA 필요, mobile 팀 6명↑ | 팀 4명 미만, OTA 배포 빈도 낮음 |
| **D** | 풀 RN 또는 풀 Flutter | Khan Academy (RN), Wrtn (RN), Elice (Flutter), BYJU'S (Flutter) | 텍스트·폼·차트 중심, 펜·고지연 그래픽 없음, 팀 1~3명 | 카메라·ML·펜 latency 중요 |
| **E** | WebView 포장 / SwiftWasm | Goodnotes Android (반례), Obsidian, Logseq, Notion 에디터 | 텍스트 전용 노트 (Obsidian), 기존 web 코드 막대 (Notion 에디터) | 펜·PDF hero (Goodnotes Android = 사용자 이탈 확인) |

### 패턴 B (KMP) 적용 사례 분석

**Duolingo (KotlinConf 2025):** 선정 기준 명시 "**No UI**". 공유 모듈 = experiments-lib (A/B), Adventures 상태 엔진 (pathfinding/animation 상태), video-call WebSocket. 네이티브 유지 = 제스처, 렌더링, Rive 애니메이션, 오디오/비디오, 네트워크 stub. 성과: Adventures iOS 9개월 → 5개월, chess 라이브러리 iOS 20개월 → 1개월. "40% 빠른 새 기능".

**Quizlet (2019~):** "secret sauce"만 공유 = 분석, grading 규칙, cognitive 모델링. **명시 제외** = UI, 네트워킹, 영속성.

**Anki (Rust 변형):** 동일 패턴 — Rust `rslib` core (스케줄러, sync, storage SQLite, 카드 렌더 파이프) + JNI 브리지로 Android, C FFI로 iOS. AnkiDroid 코드 Kotlin 80.6% / Rust 16.5%.

**Anytype:** Go 미들웨어 (Protobuf) + Swift/SwiftUI (`anytype-swift`) + Kotlin/Compose (`anytype-kotlin`, 30+ Gradle 모듈) 완전 분리.

### 패턴 E의 반례 — Goodnotes Android

- **결정 이유**: Flutter rewrite는 "iOS 팀과의 development race"가 됨 → SwiftWasm + PWA + TWA로 100k+ Swift LOC 재사용
- **실측 영향**: 40MB Wasm 바이너리, Galaxy Tab S9에서 20페이지 PDF 로딩 7~10초, 잉크 lag 3초, 사용자가 Samsung Notes로 이탈 (피드백 포럼 다수 보고)
- **시사점**: 100k LOC 코드 자산이 없는 신규 진입자에게는 부적합. 펜 hero 앱에서 WebView 포장은 검증된 안티패턴.

---

## 5. KMP / Compose Multiplatform Production 적합성

### KMP (Kotlin Multiplatform, 로직 공유 + UI 네이티브)
- **Production-ready** — Duolingo, Quizlet, Cash App, McDonald's, Bolt, Forbes, Doist 등 검증.
- **공유 적합**: 네트워킹, 상태머신, A/B infra, SRS 스케줄러, sync 프로토콜, AI 코치 오케스트레이션, 분류 추론.
- **네이티브 유지**: UI, 펜·캔버스, 제스처, 오디오/비디오 렌더링.
- **JetBrains 생태계 설문**: KMP 사용률 7% (2024) → 18% (2025). 가속 중이나 여전히 로직-first.

### CMP (Compose Multiplatform, UI 공유)
- 2025-05 iOS Stable (CMP 1.8.0). Skiko (Skia for Kotlin) 기반 렌더. 앱 사이즈 +9MB. SwiftUI 대비 시작 시간·스크롤 parity 주장.
- **펜·캔버스 production 사례 부재**. Respawn Pro (96% UI 공유, 습관 트래커), Instabee, Mirego, Wrike — 모두 비-스타일러스.
- **알려진 캔버스 Rough Edge** (JetBrains/compose-multiplatform 이슈):
  - #4042: Canvas 비-repaint 시 프레임 드롭
  - Skia↔Metal interop "SwiftUI 네이티브 애니메이션 대비 약간의 지연 도입"
  - 복잡한 커스텀 Canvas 드로잉 시 구형 기기 프레임 드롭
  - 접근성·XCTest 노출 1.8에서 불완전
  - 큰 iOS 오브젝트 (UIImage, 실시간 카메라 프레임) 메모리 관리 엣지 케이스
- **펜 production reference 부재**: CMPCanvas (PencilKit 브리지 모드 + Skiko 모드), DoodleVerse, DrawBox 등 OSS 데모만. 지연 벤치마크·압력 곡선·팜 거부 검증 없음.

### CMP 캔버스의 구조적 문제
PencilKit·Ink API의 저지연은 OS-level 통합 (front-buffer 렌더링, 모션 예측, 하드웨어 ink path) — Skiko를 거치면 추가 렌더 hop이 발생. CMPCanvas의 iOS 모드는 사실상 UIKit-embedded PencilKit이라 "캔버스 자체는 네이티브 + 둘러싼 chrome만 CMP" 형태. 그렇다면 CMP의 이득은 chrome에 한정.

### 권고 프레임워크

| 사용 시점 | KMP (로직만) | 2 개별 네이티브 (Anytype/Notability 모델) | CMP 캔버스 | Goodnotes Wasm |
|----------|-------------|---------------------------------------|-----------|---------------|
| SRS·AI·sync 코어 큼 | ✅ | △ | ❌ | ❌ |
| 코어 작음, 클라우드 API 위주 | △ | ✅ | △ | ❌ |
| 네이티브 시니어 풍부 | ✅ | ✅ | △ | ❌ |
| 펜·캔버스가 hero | ✅ (UI는 네이티브) | ✅ | ❌ (production reference 부재) | ❌ (Galaxy Tab 이탈) |
| 기존 거대 코드베이스 (100k+ LOC) | △ | △ | △ | ✅ |
| Web도 1급 타겟 | △ | ❌ | △ | ✅ |

**Deepen 프로젝트에 권장 시밍:** KMP 모듈 = SRS/마스터리 스케줄러, AI 코치 상태머신, OCR 결과 normalization, sync 프로토콜, 분류·엣지 추론. 네이티브 UI = PencilKit + PDFKit (iOS), Ink API + AndroidX pdf (Android). Duolingo Adventures + AnkiDroid 모델을 도메인에 적용.

---

## 6. 콴다 3트랙 패턴 — 한국 직접 모방 청사진

### 트랙 구성

| Surface | 트랙 | 신뢰도 |
|---------|------|--------|
| 카메라 캡처 + OCR detection | **네이티브 iOS (Swift) + 네이티브 Android (Kotlin)** | confirmed [32] |
| OCR ML 추론 (모델) | **공유 C++/Protobuffer (Caffe2) → 각 네이티브 런타임 로드** | confirmed [32] |
| 수식 solver 결과 UI / 검색 결과 | **WebView + RN 혼합** ("webview ↔ RN 일관 UX" 채용 공고 명시) | confirmed [29] |
| AI 튜터 채팅 (폴리) | **RN 추정** (OTA 필요한 AI 기능) | estimated |
| 인증·온보딩 | 네이티브 추정 | estimated |
| OTA 업데이트 surface | **RN + Code Push** | confirmed [29] |
| iPad 노트 (PencilKit) | **iOS 네이티브** (PencilKit iOS 한정) | estimated |

### 스택 세부

- **iOS**: Swift 5+ yrs. 자체 SDK `QANDAKits` + `QDSFrameworks`. iPad multitasking, SharePlay, Widgets 일급. SwiftUI/Combine/RxSwift 미지정 (아키텍처 agnostic).
- **Android**: Kotlin + **Jetpack Compose** + Dagger-Hilt + Coroutines+Flow + RxJava+RxAndroid (legacy 공존) + Retrofit + Coil. 5+ yrs.
- **RN**: React Native + TypeScript + react-navigation + **zustand** + **react-query** + **Code Push** (Microsoft archive 후에도 mathpresso GitHub에 활성 포크 유지). 네이티브 모듈 Kotlin/Swift 읽고 수정 능력 요구.

### 조직 신호
- 전체 ~130명 in-house (코리아 오피스), 244명 LinkedIn 글로벌
- "Client Development Team"(Android+iOS+QA) vs "Frontend Chapter"(React+RN) — 구조적 seam
- 2026-05 현재 오픈 엔지니어링 채용 5건: AI, Backend×2, **React Native**, Frontend — iOS·Android는 오픈 X (성숙·저-회전 트랙). RN·Frontend가 활성 채용 전선.
- 공개 GitHub: react-native-code-push fork (활성), krotoDC (Kotlin gRPC), milvus fork (벡터 DB) — Swift·Compose 라이브러리 없음 (private 유지)

### Origin Story (재구성)
1. 2016-01: 네이티브 iOS+Android Q&A 앱 출시
2. 2017-10: 서버사이드 OCR 검색 추가
3. 2018-11: 일본 진출
4. 2019-04: **on-device OCR** 출시 (Caffe2 + Faster RCNN, ~20MB float16) — 네이티브+공유 C++ ML 검증
5. 2020-2022 (추정): React Native 추가 — AI 검색결과·튜터 채팅 surface. **OTA 배포 cadence + QANDA Web 2.5M MAU 코드 공유** 동기.
6. 2023+: RN이 "AI 교육 지원" 기능 surface 담당, CodePush로 OTA

### 분기 결정 인자 (추론)
- **성능/지연**: 카메라+OCR은 5초 이내 응답 UX → RN bridge 거치면 프레임 지연 누적 → 네이티브 유지
- **채용**: 한국은 Toss/Coupang/Riiid 스케일로 시니어 Swift/Kotlin 풀 깊음 → 네이티브 채용 더 쉬움
- **AI 기능 OTA 민첩성**: LLM 프롬프트/UI 주간 반복 → App Store 심사 우회 필요 → RN+CodePush
- **Frontend 재사용**: QANDA Web 10M MAU와 React+TS+react-query+zustand 근육 공유

### 한국 에듀테크 양극단 비교

| 회사 | 패턴 | DAU/MAU | 모바일 팀 | 모방 조건 |
|------|------|---------|----------|----------|
| **콴다** | RN + 네이티브 iOS + 네이티브 Android | 8M MAU / 90M 등록 | ~10-15명 (추정 3-5/3-5/2-4) | mobile 6명↑, on-device ML, OTA 필요, web과 코드 공유 |
| **Wrtn (뤼튼)** | 풀 RN (Reanimated/Skia 네이티브 모듈) | 5M MAU | 1-2명 (추정) | 텍스트·채팅 hero, on-device ML 없음, 1-3명 팀 |
| **Riiid (산타토익)** | 풀 네이티브: Swift+TCA+SwiftUI / Kotlin native + RxJava+Coroutine | 5M+ 글로벌 | 미공개 (iOS Chapter + Android Chapter 분리 시그널) | 고위험 UX (시험 채점), 시니어 네이티브 채용, web↔mobile 공유 비우선 |
| **Notion** | 네이티브 셸 + WebView 에디터 1화면 | 10M+ 모바일 | 11명 | 1개 특정 복잡 surface 이미 web 성숙, 팀 5-11명 |

---

## 7. 한국 에듀테크 vs 글로벌 에듀테크 패턴 차이

### 한국 패턴 (확인된 사례)

| 회사 | 스택 |
|------|------|
| **콴다** | RN + 네이티브 iOS + 네이티브 Android (Compose) |
| **Riiid 산타토익** | 네이티브 iOS (Swift+TCA+SwiftUI) + 네이티브 Android (Kotlin+RxJava+Coroutine+MVVM+Clean+Dagger+gRPC+Bitrise) |
| **Wrtn 뤼튼** | 풀 React Native |
| **Class101** | 네이티브 Android Kotlin+RxJava+MVVM (Compose 미언급) |
| **Elice 엘리스** | Flutter (유일한 명시적 채택) |
| **Speak 스픽** | 네이티브 iOS (Staff iOS Engineer 채용) + Android + RN 부분 |
| **Flexcil** | 네이티브 추정, 16-18명, $38M, 채택 스택 비공개 |

### 글로벌 패턴 (확인된 사례)

| 회사 | 스택 |
|------|------|
| **Khan Academy** | 100% React Native (~6명이 iOS+Android 커버) |
| **Duolingo** | 네이티브 Swift + 100% Kotlin + KMP (2025) 비즈 로직 |
| **Quizlet** | 네이티브 UI + KMP (2019~) "secret sauce" |
| **BYJU'S** | Flutter 전환 (개발 40%·QA 50%·앱 30% 절감 주장) |
| **Brilliant** | 네이티브 Swift + Kotlin/Compose |
| **Notion** | 네이티브 셸 + WebView 에디터 |
| **Photomath** | Microblink BlinkInput on-device OCR SDK + 네이티브 셸 |
| **Anki** | Rust 코어 + FFI(JNI/C) + 네이티브 UI, KMP 통합 계획 |

### 패턴 차이
- **한국**: 펜·필기 영역 진출 부재 (Flexcil 외). 콴다 3트랙·Riiid 풀 네이티브가 큰 갈래.
- **글로벌**: KMP 채택 가속 (Duolingo·Quizlet 확정), 텍스트 중심은 RN/Flutter, 펜·필기는 자체 엔진.
- **공통**: 펜 hero 앱이 크로스플랫폼 UI 프레임워크 채택한 production reference 부재.

### 한국 시장에서 비어 있는 자리
- 네이티브 iPad PencilKit + 네이티브 Android Ink API 두 플랫폼 모두 풀구현한 한국 에듀테크 부재
- KMP/CMP production 채택한 한국 에듀테크 부재 (2026-05 현재)
- Flexcil이 직접 경쟁자지만 Play Store 3.2★ — Android parity 미달성

---

## 8. Deepen 프로젝트 권고 프레임워크

### Deepen의 좌표 (메모리 기반)
- PDF-centric 통합 워크스페이스 (Phase 1~4 진행 중, lock 13/13 완료)
- 펜 오버레이 + tldraw 사용 중 (web 기반, 워크스페이스 hero)
- AI 코치 + OCR + Concept 노드 + DAG 그래프
- 모바일 앱 결정: iPad + Android 동시 출시, WebView wrapping 반대 (메모리 명시)
- 1년차 한국 에듀테크 스타트업 가정

### 권장 아키텍처 (4안 비교)

| 안 | 구조 | Year-1 비용·인력 | 차별화 잠재력 | 권장도 |
|---|------|----------------|--------------|--------|
| **안 1: 풀 네이티브 2벌 + KMP 코어** | iOS Swift+PencilKit+PDFKit / Android Kotlin+Compose+Ink API+AndroidX pdf / KMP 모듈(SRS·AI 코치 상태·sync·OCR 후처리) | 시니어 iOS 1-2 + Android 1-2 + 백엔드 + KMP 셋업 → ~$200k+/yr | **최고** — Notability·Anki·Anytype 모델, 펜 hero parity 가능 | ⭐⭐⭐⭐⭐ |
| **안 2: 콴다 3트랙 클론** | RN + 네이티브 iOS + 네이티브 Android — pen·OCR·캔버스는 네이티브, AI 코치·실험 surface는 RN+CodePush | mobile 6명↑ 필요 — Year-1 부담 | 한국 시장 검증된 모델, OTA 민첩성 | ⭐⭐⭐⭐ (팀 6명 이상일 때) |
| **안 3: 네이티브 셸 + WebView 캔버스 (Notion 스타일)** | 네이티브 셸 (iOS Swift, Android Kotlin) + tldraw 캔버스 + PDF만 WebView, 나머지 surface 네이티브 | mobile 2-3명, 기존 web 코드 즉시 활용 | tldraw·web PDF 재사용, 단 펜 지연이 약점 | ⭐⭐⭐ (Goodnotes Android 반례 주의, "1 surface webview"는 메모리 룰 위반 X) |
| **안 4: Flutter 풀 크로스플랫폼** | Flutter UI + Syncfusion Flutter PDF (Community License) + native ink module | mobile 2명 가능 | Elice 한국 사례, BYJU'S 글로벌 사례 — 단 펜 production reference 없음 | ⭐⭐ (펜 hero 부적합) |

### Deepen 최적 조합 (Phase 0 권고안)

**핵심 결정**:
- **iOS**: 네이티브 Swift + **PencilKit + PDFKit** + Apple Vision OCR — Goodnotes 검증 경로, Year-1 무료
- **Android**: 네이티브 Kotlin + **Compose + Android Ink API (alpha→stable 추적) + MuPDF App Kit ($1,100 일회성) 또는 AndroidX pdf (API 35+)** + Google ML Kit Digital Ink
- **공유 코어 (KMP)**: SRS 스케줄러 + AI 코치 상태머신 + OCR 결과 normalization + sync (CRDT) + 분류·엣지 추론 — Anki·Duolingo 시밍
- **백엔드**: 기존 web 스택 (Next.js + AI APIs) 유지, 모바일 클라이언트는 동일 REST/gRPC 소비
- **tldraw 처리 옵션 A**: 워크스페이스 캔버스만 WebView island (Notion 모델) → web 코드 즉시 재사용, 펜 지연 양보 (Year-1 임시)
- **tldraw 처리 옵션 B**: 캔버스를 PencilKit + Ink API로 네이티브 재구현 (Year 2 이후) — Goodnotes-tier 펜 품질

### 단계적 로드맵 제안

| Phase | 목표 | 인력 | 기간 |
|-------|------|------|------|
| **Phase 0** | KMP 코어 + 네이티브 셸 prototype (PDF 뷰어 + 펜 overlay 기본) | iOS 1 + Android 1 + 백엔드 1 | 3개월 |
| **Phase 1** | iOS PencilKit 통합 + iPad MVP 출시 | iOS 1-2 + Android 1 | 3개월 |
| **Phase 2** | Android Ink API 안정화 + Galaxy Tab 베타 | Android 추가 1 | 3개월 |
| **Phase 3** | AI 코치·OCR·sync 코어 KMP로 추출, 양 플랫폼 parity 확인 | full team | 3개월 |
| **Phase 4** | tldraw 캔버스 네이티브 재구현 (선택), 펜 품질 hero 차별화 | 시니어 1 + 네이티브 그래픽스 컨설팅 | 6개월 |

### 11-ios-app.md 재작성 시 반영할 5가지
1. **iPad 단독 가정 제거** → Android 트랙 1급 동시 기술
2. **"경로 B" (PencilKit + WebView 전 화면) 폐기** → 네이티브 셸 + KMP 코어 + (선택적) 1-surface WebView island
3. **PDF SDK 의사결정** → PSPDFKit Year-1 도입 반대, Apple PDFKit + MuPDF App Kit 또는 AndroidX pdf (API 35+) 채택
4. **잉크 레이어 별도 명시**: iOS PencilKit / Android Ink API + GLFrontBufferedRenderer, 차별화 시 Metal/OpenGL 자체 엔진 (Year 2+)
5. **공유 코어 KMP 모듈 정의**: SRS·AI 코치·sync·OCR normalization·분류 추론

---

## Limitations & Caveats

- **Notability Android 베타 (2026-04)는 본 리서치 시점 미공개** — 곧 가장 결정적인 reference data point. 본 보고서 결론은 4월 이후 재검토 권장.
- **Flexcil 실제 코드 공유 메커니즘은 비공개** — "새 코드베이스" 마케팅 문구만 존재. KMP·C++ 코어·독립 네이티브 여부 미확인.
- **PSPDFKit/Apryse 실가격은 quote-기반** — Vendr 중간값은 통계, 실제 협상가는 분포 폭 큼. 직접 sales 협의 필요.
- **MuPDF App Kit 2026년 가격 직접 확인 X** — Artifex 공식 페이지 404, 집계 사이트 ($549) 기반. 채택 전 Artifex sales 직접 확인 필수.
- **Compose Multiplatform 캔버스 펜 latency 정량 벤치마크 부재** — JetBrains·커뮤니티 누구도 PencilKit/Ink API 대비 측정치 미공개. 채택 검토 시 1일 spike 권장.
- **콴다 OCR 파이프라인 2019 이후 업데이트 미공개** — Caffe2 2018년 deprecation 후 PyTorch Mobile/ExecuTorch/ONNX Runtime 등으로 이전 추정되나 미확인.
- **OneNote가 Office C++ Liblets 코어 공유하는지** primary source 미확정 (Word/Excel/PowerPoint만 명시).
- **글로벌 에듀테크 Coursera·Kahoot·Symbolab·Mathway 모바일 스택** 미확인.

---

## Sources

| # | 소스 | URL | 신뢰도 |
|---|------|-----|--------|
| 1 | Goodnotes web.dev 케이스 스터디 — SwiftWasm+PWA+TWA | https://web.dev/case-studies/goodnotes | ★★★ |
| 2 | Goodnotes iOS 엔지니어 블로그 — Swift+SwiftUI+CRDT+Metal | https://www.goodnotes.com/blog/behind-the-scenes-life-as-an-ios-engineer | ★★★ |
| 3 | Goodnotes 크로스플랫폼 블로그 | https://www.goodnotes.com/blog/behind-the-scenes-cross-platform | ★★★ |
| 4 | PWABuilder Goodnotes — Web Ink API, Device Haptics | https://blog.pwabuilder.com/posts/how-goodnotes-uses-web-apis-to-create-a-great-pwa-for-windows/ | ★★★ |
| 5 | Apple PencilKit 공식 문서 | https://developer.apple.com/documentation/pencilkit | ★★★ |
| 6 | Android Ink API 공식 발표 (2024-10) | https://android-developers.googleblog.com/2024/10/introducing-ink-api-jetpack-library.html | ★★★ |
| 7 | Android Stylus Low Latency — GLFrontBufferedRenderer | https://medium.com/androiddevelopers/stylus-low-latency-d4a140a9c982 | ★★★ |
| 8 | Concepts 케이스 스터디 — OpenGL ES + 5 렌더러 변종 | https://developer.android.com/stories/apps/concepts | ★★★ |
| 9 | Microsoft Office 통합 C++ 코드베이스 | https://techcommunity.microsoft.com/blog/microsoft_365blog/shared-office-codebase-for-windows-mac-ios-and-android-means-more-features-for-m/150291 | ★★★ |
| 10 | Goodnotes 피드백 — 잉크 latency (Android) | https://feedback.goodnotes.com/forums/950440-improve-goodnotes-for-android-windows-and-web/suggestions/46089739-ink-latency | ★★☆ |
| 11 | Goodnotes 피드백 — 렉 보고 | https://feedback.goodnotes.com/forums/950440-improve-goodnotes-for-android-windows-and-web/suggestions/46064671-make-it-less-laggy | ★★☆ |
| 12 | Notability Android 베타 발표 (2026-04) | https://9to5google.com/2026/01/12/notability-android-app-2026/ | ★★★ |
| 13 | Notability Android PRNewswire | https://www.prnewswire.com/news-releases/notability-officially-coming-to-android-bringing-high-performance-note-taking-to-a-new-platform-302684706.html | ★★★ |
| 14 | Tim Anderson — Office 단일 코드베이스 | https://www.itwriting.com/blog/10174-office-2016-now-built-out-of-one-codebase-for-all-platforms-says-microsoft-engineer.html | ★★★ |
| 15 | Pragmatic Engineer — Notion going native | https://newsletter.pragmaticengineer.com/p/notion-going-native-on-ios-and-android | ★★★ |
| 16 | Wacom-Samsung S Pen EMR 파트너십 | https://www.wacom.com/en-jp/about-wacom/news-and-events/2022/1469 | ★★★ |
| 17 | Nutrient/PSPDFKit Vendr 구매자 가이드 | https://www.vendr.com/buyer-guides/pspdfkit | ★★☆ |
| 18 | Nutrient/PSPDFKit Vendr 마켓플레이스 | https://www.vendr.com/marketplace/pspdfkit | ★★☆ |
| 19 | Artifex MuPDF App Kit — PDF Association | https://pdfa.org/new-mupdf-app-kits-deliver-fast-easy-and-affordable-pdf-functionality-to-android-and-ios-developers/ | ★★☆ |
| 20 | PencilKit + PDFKit — Apple Developer Forums | https://developer.apple.com/forums/thread/698105 | ★★★ |
| 21 | Duolingo + KMP — KotlinConf 2025 슬라이드 | https://speakerdeck.com/jrodbx/duolingo-plus-kmp-a-case-study-in-developer-productivity-kotlinconf-2025 | ★★★ |
| 22 | Quizlet KMP — Shared Code | https://quizlet.com/blog/shared-code-kotlin-multiplatform | ★★★ |
| 23 | AnkiDroid Anki-Android-Backend (Rust JNI) | https://github.com/ankidroid/Anki-Android-Backend | ★★★ |
| 24 | Compose Multiplatform 1.8.0 iOS Stable | https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/ | ★★★ |
| 25 | Android PdfRenderer API reference | https://developer.android.com/reference/android/graphics/pdf/PdfRenderer | ★★★ |
| 26 | AndroidX pdf 모듈 | https://developer.android.com/jetpack/androidx/releases/pdf | ★★★ |
| 27 | Anytype Kotlin — Setup_For_Middleware | https://github.com/anyproto/anytype-kotlin/blob/main/docs/Setup_For_Middleware.md | ★★★ |
| 28 | Khan Academy — RN 전환기 | https://blog.khanacademy.org/our-transition-to-react-native/ | ★★★ |
| 29 | QANDA RN Engineer 채용 | https://recruit.mathpresso.com/ko/o/179690 | ★★★ |
| 30 | QANDA Android Developer 채용 (Wanted) | https://www.wanted.co.kr/wd/30864 | ★★★ |
| 31 | QANDA iOS Developer 채용 (Wanted) | https://www.wanted.co.kr/wd/10952 | ★★★ |
| 32 | 수식인식 딥러닝 모델 스마트폰에 (Team QANDA 2019) | https://blog.mathpresso.com/%EC%88%98%EC%8B%9D%EC%9D%B8%EC%8B%9D-%EB%94%A5%EB%9F%AC%EB%8B%9D-%EB%AA%A8%EB%8D%B8-%EC%8A%A4%EB%A7%88%ED%8A%B8%ED%8F%B0%EC%97%90-%EC%A7%91%EC%96%B4%EB%84%A3%EA%B8%B0-663cfd232b8 | ★★★ |
| 33 | Duolingo Kotlin 마이그레이션 | https://blog.duolingo.com/migrating-duolingos-android-app-to-100-kotlin/ | ★★★ |
| 34 | BYJU'S Flutter 전환 | https://btla-tech.medium.com/fluttering-forward-transitioning-tech-stacks-8b8722207f5c | ★★☆ |
| 35 | JetBrains Quizlet KMP 케이스 스터디 | https://kotlinlang.org/lp/server-side/case-studies/quizlet | ★★★ |
| 36 | Riiid Swift Composable Architecture | https://medium.com/riiid-teamblog-kr/riiid%EC%9D%98-swift-composable-architecture-231a665e5f47 | ★★★ |
| 37 | Riiid Android 스택 (velog) | https://velog.io/@haehyunlee/20230527 | ★★☆ |
| 38 | Wrtn Mobile App Engineer 채용 | https://wrtn.career.greetinghr.com/o/119610 | ★★★ |
| 39 | Elice Flutter 채용 | https://www.wanted.co.kr/wd/262121 | ★★★ |
| 40 | Apryse PDFTron Vendr | https://www.vendr.com/marketplace/apryse | ★★☆ |
| 41 | Cash App Redwood 블로그 | https://code.cash.app/native-ui-and-multiplatform-compose-with-redwood | ★★★ |
| 42 | Microblink BlinkInput (Photomath OCR) | https://microblink.com/technology/ | ★★★ |
| 43 | Saber (OSS Flutter 펜 노트 앱) | https://github.com/saber-notes/saber | ★★★ |
| 44 | Notesnook RN-Skia 드로잉 | https://blog.notesnook.com/drawing-app-with-react-native-skia | ★★☆ |
| 45 | Wacom WILL SDK for Ink (Android) | https://developer-docs.wacom.com/docs/overview/sdks/sdk-for-ink/ | ★★★ |
| 46 | MyScript iink SDK | https://www.myscript.com/sdk/ | ★★★ |
| 47 | Nutrient SDK 공식 가격 | https://www.nutrient.io/sdk/pricing/ | ★★★ |
| 48 | PDFium 잉크 annotation 한계 (Google Group) | https://groups.google.com/g/pdfium/c/QAgH0jLWupY/m/vNBijjy3FAAJ | ★★★ |
| 49 | Syncfusion Community License | https://www.syncfusion.com/products/communitylicense | ★★★ |
| 50 | CRM.org Noteshelf 3 리뷰 | https://crm.org/news/noteshelf-review | ★★☆ |
| 51 | Flexcil Play Store | https://play.google.com/store/apps/details?id=com.flexcil.flexcilnote | ★★★ |
| 52 | CBInsights Flexcil 프로필 | https://www.cbinsights.com/company/flexcil | ★★★ |
| 53 | Apple Vision (VNRecognizeTextRequest) | https://developer.apple.com/documentation/vision/vnrecognizetextrequest | ★★★ |
