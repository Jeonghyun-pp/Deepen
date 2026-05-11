# 11 · iOS App (iPad 네이티브, 경로 B)

> 경로 B = "웹뷰 hero + 펜슬만 네이티브" 하이브리드. 자체 ink 엔진 만들지 않음 — PencilKit 위에 export/sync 파이프라인만 얹는다. 본 문서는 iPad 앱의 빌드 계약. 변경 시 03-api-contracts §13 (`/api/ios-bridge/*`)와 동시 PR.

## 0. 포지셔닝 결정

### 0.1 경로 C → B 전환 트리거

Q1·Q2는 **경로 C (웹 only + tldraw + Pointer Events)**로 운영한다. 경로 B로 전환하는 시점은 다음 트리거 중 **하나라도** 충족 시:

| ID | 트리거 | 측정 방법 |
|---|---|---|
| T-1 | 베타 학생 5~10명 1주 테스트에서 펜슬 latency 컴플레인 ≥ 3건 | `docs/research/pencil-latency-beta-*.md` 정성 인터뷰 |
| T-2 | 웹 PointerEvent 입력 latency p95 > 25ms 측정 | 클라 sentry 트레이스 |
| T-3 | Q3 유료 런칭 D-90 도달 | 로드맵 일정 강제 |
| T-4 | 학원 SaaS 베타 cohort에서 "iPad 앱 없는지" 질의 ≥ 2건 | CS 티켓 |

T-3는 **무조건 발동** — 즉 Q3 유료 런칭 = 경로 B 베타 시작이 default 일정. T-1·T-2가 먼저 와도 무방.

### 0.2 마일스톤 매핑

| 마일스톤 | 산출물 |
|---|---|
| M3.6 | iPad 베타 앱 (TestFlight). PencilKit 캔버스 + WKWebView wrapping + bridge 1차 lock. 5~10명 cohort 1주 latency 측정 |
| M4.5 | App Store 정식 출시. 결제(외부) + 인증 동기화 + 오프라인 큐 + 메타데이터 통과 |
| M4.6 | 학원 SaaS 화이트라벨 옵션 (테마·로고 교체) |

본 문서 §11·§12에서 M3.6 베타 KPI와 M4.5 정식 출시 조건을 lock한다.

### 0.3 무엇을 만들지 / 안 만들지

**만든다**:
- PencilKit 캔버스 (풀이 화면 hero, 좌측)
- WKWebView wrapping (메인 라우트 거의 전부)
- Native ↔ Web bridge (postMessage 프로토콜)
- Supabase iOS SDK 인증 + 웹뷰 쿠키 동기화
- 오프라인 attempt queue (네트워크 끊김 → 큐에 저장 → 복구 시 flush)
- 결제 진입 = SafariViewController 외부 (Toss Payments 정책 검토 후)

**안 만든다**:
- 자체 ink 엔진 (PencilKit이 hero, export만)
- 그래프·통계·코치 화면 네이티브 재구현 (전부 웹뷰)
- 안드로이드 앱 (별도 spec, 본 문서 범위 외)
- macOS·iPhone 빌드 (Phase 3 이후)

---

## 1. 앱 아키텍처

### 1.1 기술 결정 (lock)

| 영역 | 선택 | 비고 |
|---|---|---|
| 언어 | Swift | 5.9+ |
| UI | SwiftUI | UIKit fallback 금지 (PencilKit `UIViewRepresentable`만 예외) |
| 비동기 | async/await + Combine | URLSession·Bridge 이벤트 |
| 아키텍처 | TCA (The Composable Architecture) | `swift-composable-architecture` ≥ 1.10 |
| 펜슬 | PencilKit | `PKCanvasView`, `PKDrawing` |
| 웹뷰 | WKWebView | `WKWebViewConfiguration` 공유 process pool |
| 인증 | Supabase Swift SDK | `supabase-swift` ≥ 2.x |
| 빌드 | fastlane | `Fastfile`로 lane 정의 |
| 의존성 | Swift Package Manager (SPM) | CocoaPods 금지 |
| 최소 OS | iPadOS 17+ | iPhone·macOS 빌드 비활성 |
| 최대 OS | 항상 latest 지원 | OS 출시 후 30일 내 빌드 검증 |

### 1.2 TCA Reducer 트리

```
AppFeature
├── AuthFeature                  // 로그인 / 토큰 갱신
├── WebShellFeature              // WKWebView wrapping (대부분 화면)
│   └── BridgeFeature            // postMessage in/out
├── SolveFeature                 // 풀이 화면 (3-pane 듀얼)
│   ├── CanvasFeature            // PencilKit 캔버스
│   ├── ProblemWebFeature        // 좌측 또는 우측 문제 표시 webview
│   └── BridgeFeature            // SolveFeature 전용 인스턴스
├── OfflineQueueFeature          // attempt 큐
└── BillingLinkFeature           // SafariViewController 진입
```

`BridgeFeature`는 두 곳(`WebShellFeature`, `SolveFeature`)에서 사용되므로 reducer 자체는 stateless하게 + `WKScriptMessageHandler` 인스턴스만 부모가 보유.

### 1.3 동시성 정책

- 모든 네트워크/디스크 IO는 `async throws` + `Task` 내부에서. `DispatchQueue` 직접 사용 금지.
- PencilKit 콜백(`canvasViewDrawingDidChange`)은 main actor. 거기서 export 트리거하지 않음 — 사용자가 "제출" 버튼 눌렀을 때만 export.
- TCA `Effect`는 `.run { send in ... }` 패턴. `.fireAndForget` 금지 (테스트 누수 위험).

---

## 2. 디렉터리 구조

`deepy-ios/` 는 **별도 git repo**로 시작 (Q3 베타). monorepo subdir 통합은 Q4 이후 검토 — 지금 통합하면 fastlane·TestFlight 자격 증명이 메인 repo에 섞여 secret 관리가 복잡해진다.

```
deepy-ios/
├── DeepyApp/
│   ├── DeepyApp.swift                      // @main App + scenePhase
│   ├── AppFeature.swift                    // 루트 Reducer
│   ├── Auth/
│   │   ├── AuthFeature.swift
│   │   ├── AuthClient.swift                // Supabase SDK wrapper
│   │   └── TokenStore.swift                // Keychain
│   ├── WebShell/
│   │   ├── WebShellFeature.swift
│   │   ├── WebShellView.swift              // SwiftUI 컨테이너
│   │   ├── DeepyWebView.swift              // WKWebView UIViewRepresentable
│   │   └── BridgeMessageHandler.swift      // WKScriptMessageHandler
│   ├── Solve/
│   │   ├── SolveFeature.swift
│   │   ├── SolveView.swift                 // 3-pane 듀얼 패널
│   │   ├── CanvasFeature.swift
│   │   ├── CanvasView.swift                // PKCanvasView wrapping
│   │   └── DrawingExporter.swift           // PKDrawing → PNG
│   ├── Bridge/
│   │   ├── BridgeProtocol.swift            // 메시지 enum (DTO)
│   │   ├── BridgeOutbound.swift            // Native → Web evaluateJavaScript
│   │   └── BridgeInbound.swift             // Web → Native dispatch
│   ├── Offline/
│   │   ├── OfflineQueueFeature.swift
│   │   ├── AttemptQueueStore.swift         // SQLite (GRDB)
│   │   └── Reachability.swift
│   ├── Billing/
│   │   └── BillingLinkFeature.swift        // SafariViewController
│   ├── Networking/
│   │   ├── DeepyAPIClient.swift            // /api/ios-bridge/* 직접 호출용
│   │   └── Endpoints.swift
│   ├── Models/
│   │   └── DTOs.swift                      // Bridge 메시지 DTO 정의
│   └── Resources/
│       ├── Assets.xcassets
│       ├── Localizable.strings             // ko, en
│       └── Info.plist
├── DeepyAppTests/                          // XCTest 단위
├── DeepyAppUITests/                        // XCUITest E2E
├── fastlane/
│   ├── Fastfile
│   ├── Appfile
│   └── Matchfile                           // 인증서 sync
├── .xcodeproj                               // 또는 Tuist 사용 검토
├── Package.swift                            // SPM root (의존성)
└── README.md
```

### 2.1 명명 규칙

- 파일: PascalCase Swift 파일, lowercase swift 확장자
- 모듈: 한 폴더 = 한 도메인. cross-domain import 시 protocol 추상화
- 한글 주석 OK. 식별자는 영문
- WebView 안의 라우트는 모두 `https://app.deepen.run/*` (Q3 도메인 lock 결정 가정)

---

## 3. WebView ↔ Native bridge 프로토콜 (lock)

### 3.1 채널 정의

웹 → 네이티브: `window.webkit.messageHandlers.deepen.postMessage(json)`
네이티브 → 웹: `webView.evaluateJavaScript("window.deepenBridge.<method>(payload)")`

`<method>`는 lock된 함수명만 사용. 임의 JS 실행 금지.

### 3.2 메시지 카탈로그 (lock)

#### 웹 → 네이티브

```typescript
type WebToNativeMessage =
  | { type: 'request_pencil_input'; itemId: string; expectedSize: { width: number; height: number } }
  | { type: 'request_auth_refresh' }
  | { type: 'open_external_url'; url: string }                  // SafariViewController
  | { type: 'request_billing_checkout'; tier: 'pro' | 'pro_plus' }
  | { type: 'haptic'; style: 'light' | 'medium' | 'heavy' | 'success' | 'error' }
  | { type: 'log_event'; name: string; payload?: Record<string, unknown> }
  | { type: 'ready' }                                            // 웹 SPA 부팅 완료
```

#### 네이티브 → 웹

```typescript
type NativeToWebMethod =
  | 'onPencilSubmit'        // 풀이 PNG 제출 완료
  | 'onPencilCancel'        // 캔버스 닫기
  | 'onAuthChanged'         // 토큰 갱신·로그아웃
  | 'onNetworkChanged'      // online/offline
  | 'onAppStateChanged'     // foreground/background
  | 'onBillingResult'       // 결제 외부 진입 후 복귀
  | 'onOfflineFlushed'      // 오프라인 큐 flush 완료
```

#### 페이로드 예시

웹 → 네이티브 (펜슬 입력 요청):
```json
{
  "type": "request_pencil_input",
  "itemId": "uuid",
  "expectedSize": { "width": 800, "height": 600 }
}
```

네이티브 → 웹 (펜슬 제출):
```javascript
window.deepenBridge.onPencilSubmit({
  itemId: "uuid",
  drawingId: "uuid",        // 서버 업로드 후 받은 ID
  pngBase64: "iVBORw0KG...", // 좌표 보존된 PNG
  uploadedAt: 1715200000000
})
```

### 3.3 검증 정책

- **모든 메시지에 `type` 또는 method name 필수**. 누락 시 native·web 양쪽 모두 무시.
- **DTO는 양쪽에서 동일 zod/Codable 정의 유지**. `lib/api/schemas/ios.ts` (웹) ↔ `Bridge/BridgeProtocol.swift` (앱) 1:1 mirror. PR 시 동시 변경 강제.
- **버전 핸드셰이크**: 앱은 부팅 시 `evaluateJavaScript("window.deepenBridge.__version")`로 웹 SPA의 bridge 버전 확인. 메이저 미스매치 → "앱 업데이트 필요" 화면.
- **메시지 origin 검증**: WKScriptMessageHandler에서 `message.frameInfo.request.url?.host == "app.deepen.run"` 확인. 외부 origin 메시지 drop.

### 3.4 라이프사이클

```
WebView 부팅 → window.deepenBridge 폴리필 주입 (네이티브 → 웹 'ready 리스너 등록')
            → 웹 SPA 로드 완료 → 'ready' 메시지 (웹 → 네이티브)
            → 네이티브가 onAuthChanged·onNetworkChanged 1회씩 push
            → 정상 운영
```

`window.deepenBridge` 객체는 네이티브가 페이지 로드 시 `WKUserScript`로 주입 (document start 타이밍).

---

## 4. PencilKit 통합

### 4.1 캔버스 컴포넌트

```swift
// Solve/CanvasView.swift (단축)
import PencilKit
import SwiftUI

struct CanvasView: UIViewRepresentable {
  @Binding var canvas: PKCanvasView
  let expectedSize: CGSize

  func makeUIView(context: Context) -> PKCanvasView {
    canvas.tool = PKInkingTool(.pen, color: .black, width: 2)
    canvas.drawingPolicy = .pencilOnly        // 손가락 입력 차단 (옵션 토글 가능)
    canvas.delegate = context.coordinator
    canvas.isOpaque = false
    canvas.bounds = CGRect(origin: .zero, size: expectedSize)
    return canvas
  }
  // ...
}
```

### 4.2 좌표 보존 PNG export

서버 OCR이 좌표 단위로 채점·하이라이트하므로 **PNG 해상도 = 캔버스 논리 크기**가 lock.

```swift
// Solve/DrawingExporter.swift
func exportPNG(_ drawing: PKDrawing, size: CGSize, scale: CGFloat = 2.0) -> Data? {
  let renderer = UIGraphicsImageRenderer(size: size)
  let image = renderer.image { ctx in
    UIColor.white.setFill()                   // 배경 흰색 (OCR 안정성)
    ctx.fill(CGRect(origin: .zero, size: size))
    drawing.image(from: CGRect(origin: .zero, size: size), scale: scale).draw(at: .zero)
  }
  return image.pngData()
}
```

원칙:
- `expectedSize`는 웹이 지정 (예: `800×600`). 앱은 그대로 따른다.
- `scale=2.0`이 default — Retina 보존 + OCR 정확도. 앱 측 임의 변경 금지.
- 배경 흰색 강제. 투명 PNG 금지 (Claude Vision OCR 안정성).

### 4.3 업로드 플로우

```
1. 학생이 SolveView에서 "제출" 탭
2. CanvasFeature → exportPNG() 호출
3. (선택) PKDrawing.dataRepresentation() base64 인코딩 — 보존용
4. POST /api/ios-bridge/upload-drawing { itemId, pkDrawingBase64, pngBase64 }
5. 응답 { drawingId } 수신
6. Bridge → window.deepenBridge.onPencilSubmit({ itemId, drawingId, pngBase64 })
7. 웹 SPA가 일반 attempt 제출 플로우 실행 (POST /api/attempts with ocrImageBase64)
```

⚠️ 6의 `pngBase64`는 **웹이 OCR 호출용으로 재사용**한다 (서버 두 번 업로드 방지). 큰 페이로드(>2MB)면 base64 대신 `drawingId`만 보내고 웹이 서버에서 재조회하는 fallback 필요. 임계치는 §11.2 KPI 측정 후 결정.

### 4.4 도구 / UX 디테일

- 도구 팔레트: PencilKit 기본 `PKToolPicker` 사용 (자체 UI 구축 X)
- 지우개: PencilKit 표준
- 색상: 기본 검정 + 빨강 1색만 노출 (입시 컨텍스트, 채색 도구 X)
- Undo: `PKCanvasView.undoManager` 활용
- 자동 저장: 5초 디바운스로 `OfflineQueueFeature`에 PKDrawing 저장 (앱 강제 종료 대비)

---

## 5. 메인 라우트 — 네이티브 vs 웹

### 5.1 화면 매트릭스 (lock)

| 화면 | 구현 | 비고 |
|---|---|---|
| Splash | 네이티브 | 앱 부팅 + 토큰 확인 |
| 로그인 | 네이티브 | Supabase Swift SDK (이메일/OAuth 트리거) |
| 홈 (단원 선택) | 웹뷰 (`/v2/home`) | |
| 그래프 | 웹뷰 (`/v2/study/[unitId]`) | reagraph/xyflow 그대로 |
| **풀이 화면** | **네이티브 SolveView (3-pane)** | 좌: 문제 webview / 중: PencilKit 캔버스 / 우: 코치 webview |
| 통계 | 웹뷰 (`/v2/stats`) | |
| 코치 단독 패널 | 웹뷰 (`/ai-coach/*`) | |
| 채점 결과 | 웹뷰 (네이티브 SolveView 안에 임베드) | |
| 결제·구독 관리 | SafariViewController 외부 | Apple IAP 정책 검토 (§10.3) |
| 설정 | 네이티브 | 알림·로그아웃·앱 정보 |
| 어드민·교사 대시보드 | 웹뷰 그대로 | iPad 사용 시나리오 적음, 별도 native 화면 없음 |

### 5.2 SolveView 3-pane 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│ NavBar (네이티브) — 뒤로가기·문제번호·타이머             │
├──────────────┬─────────────────────────┬─────────────────┤
│              │                         │                 │
│  문제 webview │  PencilKit 캔버스        │  AI 코치 webview │
│  (좌 35%)    │  (중 40%)                │  (우 25%)       │
│              │                         │  (resizable)    │
│              │                         │                 │
│              │                         │                 │
└──────────────┴─────────────────────────┴─────────────────┘
```

- 좌·우 webview는 같은 WKWebView **process pool 공유** (메모리 절약 + 쿠키 공유)
- 우측 코치 패널은 사용자가 width 조절 (15%~40%) — 펜슬 풀이 시 좁게, 코치 대화 시 넓게
- 가로 모드 강제 (SolveView만). 다른 화면은 자유 회전.

---

## 6. 인증 + 토큰 동기화

### 6.1 흐름

```
1. 앱 로그인 → Supabase Swift SDK → access_token + refresh_token 받음
2. Keychain에 저장 (TokenStore)
3. WKWebView 진입 직전: WKWebsiteDataStore.httpCookieStore에 supabase 세션 쿠키 inject
4. 토큰 갱신 시 (Supabase auth state listener) → 쿠키 갱신 + onAuthChanged 메시지로 웹에 알림
5. 로그아웃: 네이티브가 Keychain·쿠키·WKWebsiteDataStore 모두 clear → onAuthChanged({ user: null })
```

### 6.2 쿠키 매핑

Supabase는 `sb-access-token`·`sb-refresh-token` 쿠키 사용. iOS SDK 토큰을 그대로 쿠키로 변환:

```swift
let cookies = [
  HTTPCookie(properties: [
    .name: "sb-access-token",
    .value: session.accessToken,
    .domain: "app.deepen.run",
    .path: "/",
    .secure: true,
    .expires: session.expiresAt
  ])!,
  // sb-refresh-token도 동일
]
for cookie in cookies {
  await webView.configuration.websiteDataStore.httpCookieStore.setCookie(cookie)
}
```

웹 라우트의 `withAuth` 헬퍼는 쿠키든 Authorization 헤더든 동일하게 처리하므로 추가 변경 없음.

### 6.3 디바이스 등록

`POST /api/me/devices` (`03-api-contracts §15` 추가 후보):
```typescript
{ platform: 'ios', model: 'iPad13,8', appVersion: '1.0.0', osVersion: '17.5' }
```
APNs 푸시는 Q4 retention 검토 결과 후 결정 (현재 미정).

### 6.4 보안

- TokenStore는 Keychain `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`
- access_token 만료 5분 전 silent refresh
- 백그라운드 진입 시 쿠키 그대로 유지 (재진입 시 재발급 X)
- 앱 삭제 시 Keychain 자동 정리됨

---

## 7. 오프라인 처리

### 7.1 정책

iPad 학습 컨텍스트(학원·도서관 Wi-Fi 불안정) 의식. 다음만 오프라인 지원:

| 기능 | 오프라인 지원 | 방법 |
|---|---|---|
| PencilKit 풀이 작성 | OK | 로컬 PKDrawing 보존 |
| 풀이 제출 (`/api/attempts`) | OK (큐) | 복구 시 자동 flush |
| OCR 호출 | NO | 네트워크 필수 — UI에서 명시 |
| AI 코치 chat | NO | "오프라인" 안내 |
| 그래프·통계 | NO (캐시는 brief) | webview HTTP 캐시 의존 |

### 7.2 attempt queue

```swift
// Offline/AttemptQueueStore.swift
struct QueuedAttempt: Codable {
  let id: UUID
  let itemId: String
  let pkDrawingData: Data           // PKDrawing.dataRepresentation()
  let pngData: Data
  let payload: AttemptPayload       // /api/attempts request body
  let createdAt: Date
  let attemptCount: Int             // 재시도 횟수
}
```

- 저장소: GRDB (SQLite). UserDefaults 금지 (페이로드 큼).
- Reachability: `NWPathMonitor` 사용 → online 전이 시 `OfflineQueueFeature.flush()` 호출
- flush 정책: 1건씩 sequential, 실패 시 exponential backoff (최대 3회), 그 후 dead-letter
- dead-letter: 사용자에게 "전송 실패한 풀이 N건" 알림 + 수동 재시도 버튼

### 7.3 충돌 처리

- 같은 itemId·같은 mode로 큐에 2건 이상 생기면 가장 최신 것만 보존, 이전 dedup
- 네이티브 큐 flush 후 웹에 `onOfflineFlushed({ flushedCount, failedCount })` 통지 → 웹 토스트로 안내

---

## 8. TestFlight 베타 (fastlane)

### 8.1 fastlane lanes

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "TestFlight 베타 업로드"
  lane :beta do
    setup_ci if ENV['CI']
    match(type: "appstore", readonly: is_ci)
    increment_build_number(xcodeproj: "DeepyApp.xcodeproj")
    build_app(scheme: "DeepyApp", configuration: "Release")
    upload_to_testflight(skip_waiting_for_build_processing: true)
  end

  desc "App Store 심사 제출"
  lane :release do
    match(type: "appstore", readonly: is_ci)
    increment_version_number(bump_type: "patch")
    build_app(scheme: "DeepyApp", configuration: "Release")
    upload_to_app_store(
      submit_for_review: true,
      automatic_release: false,
      force: true,
      skip_screenshots: false,
      skip_metadata: false
    )
  end
end
```

### 8.2 인증서 / 프로비저닝

- `fastlane match` (Git 기반 인증서 동기화) 사용
- `Matchfile` repo는 별도 private git (메인 repo와 분리)
- App Store Connect API key는 secret manager → CI env에 inject

### 8.3 베타 분배 절차

| 단계 | 액션 | 책임 |
|---|---|---|
| 1 | 베타 cohort 5~10명 모집 (학원 1곳 또는 개인 학생) | 운영 |
| 2 | TestFlight 외부 그룹 "Q3-beta" 생성 | iOS 담당 |
| 3 | `fastlane beta` 실행 (수동 트리거, CI도 가능) | iOS 담당 |
| 4 | Apple 처리 대기 (보통 30분~2시간) | — |
| 5 | 외부 그룹에 빌드 할당 + 이메일 초대 | 운영 |
| 6 | 1주 latency 측정 (§11) | iOS·운영 |

### 8.4 CI

- GitHub Actions self-hosted (macOS) 또는 Xcode Cloud
- main 브랜치 push 시 `beta` lane 자동 실행 (Q3 베타 기간만)
- secrets: `MATCH_PASSWORD`, `APP_STORE_CONNECT_API_KEY_*`

---

## 9. App Store 출시 (M4.5)

### 9.1 메타데이터 (lock)

| 항목 | 값 |
|---|---|
| 앱 이름 | Deepen — 수능 풀이 코치 |
| 부제 (Subtitle) | 유형별 약점 그래프 + AI 풀이 코치 |
| 카테고리 (Primary) | Education |
| 카테고리 (Secondary) | Reference |
| 연령 등급 | 4+ |
| 가격 | Free (앱 내부 구독: Toss 외부 결제 — §10.3 정책 주의) |
| 지원 디바이스 | iPad (iPadOS 17.0+) |
| 지원 언어 | 한국어 (1차), English (Q4 추가 검토) |
| 키워드 | 수능, 수학, 풀이, 펜슬, 학습, 그래프, AI 코치, 오답노트 |

### 9.2 스크린샷 요구사항

- iPad Pro 13" (12.9") 6장
- iPad Pro 11" 6장
- 시나리오: (1) 그래프 화면 (2) 풀이 화면 PencilKit (3) AI 코치 답변 (4) 리캡카드 (5) 통계 (6) 학원 SaaS 교사 화면 — 후자는 Q4 시점

### 9.3 앱 심사 대응

| 위험 | 대응 |
|---|---|
| 외부 결제 (Toss) → IAP 우회 거절 | §10.3 외부 결제 정책 검토 |
| WKWebView가 메인 → "리스킨" 거절 | 풀이 화면 PencilKit 네이티브 + 인증 네이티브 + 오프라인 큐 네이티브로 "추가 가치" 입증. App Review note에 명시 |
| 학습 데이터 수집 → ATT(App Tracking Transparency) | 수집은 자체 분석만 (광고 SDK 없음). NSUserTrackingUsageDescription 미사용 결정 |
| 미성년자 데이터 → COPPA 준수 | 4+ 등급 + 만 14세 미만 보호자 동의 절차 (웹 회원가입 단에서 처리) |
| 광고 | 도입 X (Q3 시점). 도입 시 별도 SDK + 정책 갱신 |

### 9.4 출시 체크리스트

- [ ] App Store Connect 메타데이터 6개 항목 입력
- [ ] 스크린샷 12장 (Pro 13" 6 + Pro 11" 6)
- [ ] 개인정보처리방침 URL (`https://deepen.run/legal/privacy`)
- [ ] 약관 URL
- [ ] 지원 URL
- [ ] App Privacy 양식 (수집 데이터 항목 선언)
- [ ] App Review note (외부 결제·웹뷰 hero 설명)
- [ ] 빌드 1개 업로드 + Export Compliance 응답
- [ ] 심사 제출 → 평균 24~48시간 대기
- [ ] 거절 시 §9.3 위험표 매핑 후 재제출

---

## 10. 결제 (외부 / SafariViewController)

### 10.1 흐름

```
1. 웹 SPA 가격 페이지에서 "구독" 버튼 탭
2. 웹 → 네이티브 메시지: { type: 'request_billing_checkout', tier: 'pro' }
3. 네이티브 BillingLinkFeature → POST /api/billing/checkout 호출
4. 응답 { tossPaymentUrl } 수신
5. SafariViewController로 tossPaymentUrl 오픈
6. 결제 완료 후 deeplink (deepy://billing/result?orderId=...) 수신
7. 네이티브가 SafariViewController dismiss + onBillingResult 메시지 push
8. 웹 SPA가 /api/billing/me 재조회 → 구독 상태 갱신
```

### 10.2 deeplink 등록

- Universal Links: `https://app.deepen.run/billing/result` (apple-app-site-association 등록)
- Custom scheme fallback: `deepy://billing/*`
- Toss webhook은 별도 (`POST /api/billing/webhook`) — 네이티브 무관

### 10.3 외부 결제 vs Apple IAP 정책 (★ 거절 risk)

**현 상태 (2026-05 기준 가정)**:
- 디지털 콘텐츠 구독 → Apple IAP 강제가 default
- 한국은 외부 결제 의무 허용국 (전기통신사업법 개정)
- 단, 앱 심사는 여전히 case-by-case로 거절 가능

**전략 (lock)**:
1. **1차 제출**: Toss Payments 외부 + Apple IAP 둘 다 노출 (한국 사용자 default Toss, 그 외 IAP). App Review note에 한국 법 근거 첨부
2. **거절 시 fallback**:
   - Plan A: Toss 단독 + 한국 외 사용자에게 "한국 거주자만" 안내 (IAP 비활성)
   - Plan B: Apple IAP 단독 (Toss 진입 제거) — 수수료 30% → 가격 재설계 필요
3. **결정자**: PM + 법무. iOS 담당은 빌드 토글만 제공 (`Config.billingMode = .external | .iap | .both`)

리스크가 크므로 **M4.5 출시 D-30에 Apple App Review 사전 문의 (Resolution Center)** 필수.

### 10.4 "구독 관리" 진입

- iPad에서 "구독 관리" 탭 시 `https://app.deepen.run/billing/manage` SafariViewController로 (외부 결제 사용자)
- IAP 사용자는 `itms-apps://apps.apple.com/account/subscriptions` 시스템 URL

---

## 11. Phase 1 베타 KPI (M3.6, 5~10명 1주)

### 11.1 측정 항목 (lock)

| KPI | 목표 | 측정 방법 |
|---|---|---|
| **PencilKit 입력 latency p50** | ≤ 12ms | `PKCanvasViewDelegate` 콜백 시간차 |
| **PencilKit 입력 latency p95** | ≤ 25ms | 동상 |
| **WebView 첫 로드 시간 (cold)** | ≤ 2.5s (p50) / ≤ 4.0s (p95) | `WKNavigationDelegate.didFinish` − `loadRequest()` |
| **WebView 첫 로드 시간 (warm)** | ≤ 1.0s (p50) | 동상 |
| **PNG 업로드 시간 (`/api/ios-bridge/upload-drawing`)** | ≤ 1.5s (p50) / ≤ 3.0s (p95) | URLSession metric |
| **Bridge 메시지 RTT (web→native→web)** | ≤ 50ms (p95) | 양쪽 timestamp diff |
| **앱 크래시율 (1주)** | ≤ 0.5% (세션 기준) | Sentry iOS SDK |
| **오프라인 큐 flush 성공률** | ≥ 98% | `OfflineQueueFeature` 자체 로깅 |
| **TestFlight 설치 완료율** | ≥ 80% (초대 대비) | TestFlight 통계 |
| **베타 사용자 정성 NPS** | ≥ +20 | 1주 후 인터뷰 5문항 |

### 11.2 측정 인프라

- Sentry iOS SDK 통합 (`SENTRY_DSN_IOS` env)
- 자체 분석 이벤트: `log_event` 메시지로 웹 분석에 통합 (별도 분석 SDK 도입 X)
- 1주 종료 시 `docs/phase1-ios-beta.md`에 결과 정리

### 11.3 KPI 미달 시 액션

| 미달 항목 | 액션 |
|---|---|
| 펜슬 latency > 25ms | PencilKit 설정 점검 (`drawingPolicy`, `isOpaque`, layer 최적화). 그래도 안 되면 디바이스 호환성 issue로 분류 |
| WebView cold > 4s | 웹 SPA 번들 분석 → critical CSS 인라인 + bridge 폴리필 dynamic import |
| PNG 업로드 > 3s | 압축률 조정 (PNG → WebP 검토) + multipart 청크 업로드 |
| 크래시율 > 0.5% | 핫픽스 빌드 → fastlane beta 재배포 |

---

## 12. Phase 2 정식 출시 조건 (M4.5)

다음을 **모두** 충족해야 App Store 정식 출시:

1. **베타 KPI 전부 통과** (§11.1 모든 행이 목표 달성)
2. **App Review 1회 이상 통과** (사전 문의 또는 베타 빌드 외부 그룹 review)
3. **외부 결제 정책 결정 완료** (§10.3 — 1차 / 2차 / fallback 중 어느 모드)
4. **법무 산출물**: 개인정보처리방침·약관·앱 내 표시 (`Settings > 법적 정보`)
5. **오프라인 큐 dead-letter 0% 도달** 1주 (TestFlight 외부 그룹)
6. **단위 테스트 커버리지** ≥ 60% (Bridge·Auth·OfflineQueue 위주)
7. **UI 테스트 시나리오** ≥ 5개 통과 (로그인 → 풀이 → 제출 happy path 포함)
8. **fastlane release lane** 1회 이상 dry-run 성공
9. **Sentry 1주 무사고 (severity ≥ error 0건)**
10. **운영 런북** 작성 (`docs/runbook-ios.md` — 인증서 갱신, 빌드 실패 대응, App Review 거절 대응)

10개 중 **1개라도 미달**이면 출시 보류 + 보류 사유 docs/phase2-ios-blockers.md 기록.

---

## 13. 변경 관리

- 본 spec 변경 시 (1) iOS 담당 PR (2) `lib/api/schemas/ios.ts` 동기 (3) 03-api-contracts §13 동기 (4) 영향 마일스톤(M3.6, M4.5, M4.6) 재검토 필요
- Bridge 메시지 추가 = breaking change. 메이저 버전 +1 + 앱 강제 업데이트 화면 활성화
- PencilKit·WKWebView·Supabase SDK 메이저 업그레이드 시 베타 cohort 재측정 (§11.1)

---

## 14. 본 spec이 다루지 않는 것

- iPhone·macOS 빌드 (Phase 3 이후)
- Android (별도 spec, 본 분기 없음)
- Apple Watch / Vision Pro 빌드
- 자체 ink 엔진 / 자체 OCR 모델 (PencilKit + Claude Vision로 위임)
- APNs 푸시 시스템 (Q4 retention 결정 후 별도 spec)
- App Clips / Widgets (Phase 3 검토)
- 학원 SaaS 화이트라벨 상세 (M4.6 별도 spec)
