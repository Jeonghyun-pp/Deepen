export const metadata = {
  title: "Deepen — Knowledge Graph",
};

export default function GraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      {children}
    </div>
  );
}
