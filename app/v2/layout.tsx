export const metadata = {
  title: "Deepen — 입시 학습 코치",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        // var(--font-pretendard) 는 root layout 의 next/font/local 가 주입
        fontFamily:
          "var(--font-pretendard), 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', sans-serif",
        fontFeatureSettings: "'ss01', 'ss02', 'ss03'",
      }}
    >
      {children}
    </div>
  );
}
