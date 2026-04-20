"use client";

export default function FooterSection() {
  return (
    <footer className="relative px-6 py-12 text-white/70 text-xs">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-[0.18em] text-sm text-white">
            DEEPEN<span className="opacity-50">.LAB</span>
          </span>
          <span className="opacity-50">© 2026</span>
        </div>
        <div className="flex gap-5">
          <a href="#" className="hover:text-white">
            Privacy
          </a>
          <a href="#" className="hover:text-white">
            Terms
          </a>
          <a href="mailto:hello@deepen.lab" className="hover:text-white">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
