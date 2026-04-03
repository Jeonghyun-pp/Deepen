import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { LanguageProvider } from "./i18n/context";
import { ThemeProvider } from "./theme/context";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Deepen — 논문, 이제 깊이 있게",
  description: "키워드 하나로 시작하는 논문 탐험. 베타 테스터 모집 중.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider><LanguageProvider>{children}</LanguageProvider></ThemeProvider>
      </body>
    </html>
  );
}
