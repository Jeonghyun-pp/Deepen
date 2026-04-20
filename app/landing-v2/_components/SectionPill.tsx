export default function SectionPill({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={
        "inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold border " +
        (tone === "light"
          ? "border-[color:var(--v2-mint-deep)]/20 text-[color:var(--v2-mint-deep)]"
          : "border-white/20 text-white/80")
      }
    >
      {children}
    </span>
  );
}
