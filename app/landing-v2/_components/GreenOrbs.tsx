"use client";

/**
 * Two overlapping green gradient spheres forming a rounded-M shape,
 * matching the reference's "New Threats" panel artwork.
 */
export default function GreenOrbs() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-3xl">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 60%, #22C55E 0%, #15803D 30%, #050807 75%), radial-gradient(circle at 80% 60%, #22C55E 0%, #15803D 30%, #050807 75%)",
          backgroundBlendMode: "screen",
        }}
      />
      {/* highlight rim */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 22% 35%, rgba(255,255,255,0.45) 0%, transparent 20%), radial-gradient(circle at 78% 35%, rgba(255,255,255,0.45) 0%, transparent 20%)",
        }}
      />
      {/* dark valley between */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 22% 60% at 50% 50%, rgba(0,0,0,0.9) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
