export const metadata = {
  title: "Deepen — Knowledge Graph",
};

export default function GraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, #0F3B24 0%, #091B11 55%, #050807 100%)",
        }}
      />
      {children}
    </div>
  );
}
