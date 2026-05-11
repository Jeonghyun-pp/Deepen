import type { Metadata } from "next";
import localFont from "next/font/local";
import { Nunito } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

/**
 * Pretendard Variable — self-host (Phase 3).
 * 이전: cdn.jsdelivr.net 의 pretendardvariable.min.css 를 <link> 로 로드 (render-blocking + CDN dep).
 * 변경: public/fonts/PretendardVariable.woff2 단일 가변 폰트 + next/font/local 의 swap 전략.
 * display: 'swap' 으로 FOUT 허용 (시스템 폰트로 먼저 paint → Pretendard 로 swap).
 */
const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
  // KS X 1001 한글 + 라틴 + 기호 — 단일 가변 파일이라 unicode-range subsetting 은 불필요
});

export const metadata: Metadata = {
  title: "Deepen — 입시 AI 학습 코치",
  description:
    "유형 단위로 약점을 추적하고, 이전 학년의 숨은 결손까지 역추적하는 입시 AI 학습 코치.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${nunito.variable} ${pretendard.variable} ${nunito.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
