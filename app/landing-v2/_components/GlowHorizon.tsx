"use client";

/**
 * Curved green glow arcs at the bottom of the hero, creating the
 * "horizon" feel from the reference. Pure SVG + CSS blur.
 */
export default function GlowHorizon() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none overflow-hidden">
      {/* far curved glow */}
      <svg
        viewBox="0 0 1600 600"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full"
        fill="none"
        aria-hidden
      >
        <defs>
          <radialGradient id="horizonFar" cx="50%" cy="100%" r="70%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#15803D" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#050807" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="horizonNear" cx="50%" cy="120%" r="60%">
            <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#22C55E" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <ellipse cx="800" cy="700" rx="900" ry="420" fill="url(#horizonFar)" />
        <ellipse cx="800" cy="780" rx="620" ry="260" fill="url(#horizonNear)" />
      </svg>

      {/* thin curved highlight lines */}
      <svg
        viewBox="0 0 1600 600"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full opacity-60"
        fill="none"
        aria-hidden
      >
        <path
          d="M -100 520 Q 800 340 1700 520"
          stroke="#22C55E"
          strokeOpacity="0.35"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M -100 560 Q 800 380 1700 560"
          stroke="#22C55E"
          strokeOpacity="0.22"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M -100 600 Q 800 430 1700 600"
          stroke="#22C55E"
          strokeOpacity="0.12"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}
