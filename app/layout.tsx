import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
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
    <html lang="ko" className={`${nunito.className} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
