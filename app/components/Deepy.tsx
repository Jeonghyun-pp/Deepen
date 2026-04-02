"use client";

import { motion, AnimatePresence } from "framer-motion";

export type Emotion =
  | "sparkle" | "focus" | "celebrate" | "sad" | "fire"
  | "confused" | "sleepy" | "surprised" | "love" | "thinking";

export interface DeepyConfig {
  // Body
  bodyColor: string;
  lensGlow: string;
  lensInner: string;
  handleColor: string;
  // Face
  eyeColor: string;
  pupilColor: string;
  cheekColor: string;
  // Glow
  glowSpeed: number;
  glowIntensity: number;
  // Size
  scale: number;
}

export const defaultConfig: DeepyConfig = {
  bodyColor: "#1A1A40",
  lensGlow: "#00E5CC",
  lensInner: "#0D1B2A",
  handleColor: "#2A2A5A",
  eyeColor: "#FFFFFF",
  pupilColor: "#1A1A40",
  cheekColor: "#4A90FF",
  glowSpeed: 2.5,
  glowIntensity: 0.6,
  scale: 1,
};

export const presets: Record<string, { name: string; config: Partial<DeepyConfig> }> = {
  default: {
    name: "Deep Navy (기본)",
    config: { ...defaultConfig },
  },
  ocean: {
    name: "Ocean Blue",
    config: {
      bodyColor: "#0C2D48",
      lensGlow: "#4FC3F7",
      lensInner: "#071E31",
      handleColor: "#1A4A6A",
      eyeColor: "#E0F7FA",
      pupilColor: "#0C2D48",
      cheekColor: "#4FC3F7",
    },
  },
  sunset: {
    name: "Sunset Warm",
    config: {
      bodyColor: "#3D1C00",
      lensGlow: "#FF8A65",
      lensInner: "#2A1200",
      handleColor: "#5D3A1A",
      eyeColor: "#FFF3E0",
      pupilColor: "#3D1C00",
      cheekColor: "#FFB347",
    },
  },
  forest: {
    name: "Forest Green",
    config: {
      bodyColor: "#1B3A2D",
      lensGlow: "#66BB6A",
      lensInner: "#0F2318",
      handleColor: "#2D5A40",
      eyeColor: "#E8F5E9",
      pupilColor: "#1B3A2D",
      cheekColor: "#81C784",
    },
  },
  purple: {
    name: "Cosmic Purple",
    config: {
      bodyColor: "#2D1B4E",
      lensGlow: "#CE82FF",
      lensInner: "#1A0F30",
      handleColor: "#4A2D6E",
      eyeColor: "#F3E5F5",
      pupilColor: "#2D1B4E",
      cheekColor: "#CE82FF",
    },
  },
  light: {
    name: "Light Mode",
    config: {
      bodyColor: "#E8E8EC",
      lensGlow: "#4A90FF",
      lensInner: "#FFFFFF",
      handleColor: "#C8C8D0",
      eyeColor: "#1A1A40",
      pupilColor: "#FFFFFF",
      cheekColor: "#FFB3B3",
    },
  },
};

interface DeepyProps {
  emotion: Emotion;
  config: DeepyConfig;
}

export default function Deepy({ emotion, config }: DeepyProps) {
  const s = config.scale;

  const eyeVariants: Record<Emotion, React.ReactNode> = {
    sparkle: (
      <>
        <motion.ellipse
          cx={-18 * s} cy={-8 * s} rx={11 * s} ry={12 * s}
          fill={config.eyeColor}
          animate={{ ry: [12 * s, 13 * s, 12 * s] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.ellipse
          cx={18 * s} cy={-8 * s} rx={11 * s} ry={12 * s}
          fill={config.eyeColor}
          animate={{ ry: [12 * s, 13 * s, 12 * s] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
        />
        <motion.circle
          cx={-15 * s} cy={-6 * s} r={5 * s}
          fill={config.pupilColor}
          animate={{ cy: [-6 * s, -8 * s, -6 * s] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.circle
          cx={21 * s} cy={-6 * s} r={5 * s}
          fill={config.pupilColor}
          animate={{ cy: [-6 * s, -8 * s, -6 * s] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.text
          x={-30 * s} y={-20 * s} fontSize={10 * s} fill="#FFD700"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >✦</motion.text>
        <motion.text
          x={26 * s} y={-22 * s} fontSize={8 * s} fill="#FFD700"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        >✦</motion.text>
      </>
    ),

    focus: (
      <>
        <motion.ellipse
          cx={-18 * s} cy={-8 * s} rx={10 * s} ry={8 * s}
          fill={config.eyeColor}
        />
        <motion.ellipse
          cx={18 * s} cy={-8 * s} rx={10 * s} ry={8 * s}
          fill={config.eyeColor}
        />
        <circle cx={-16 * s} cy={-6 * s} r={5 * s} fill={config.pupilColor} />
        <circle cx={16 * s} cy={-6 * s} r={5 * s} fill={config.pupilColor} />
        <line
          x1={-28 * s} y1={-22 * s} x2={-8 * s} y2={-20 * s}
          stroke={config.eyeColor} strokeWidth={2 * s} strokeLinecap="round" opacity={0.5}
        />
        <line
          x1={28 * s} y1={-22 * s} x2={8 * s} y2={-20 * s}
          stroke={config.eyeColor} strokeWidth={2 * s} strokeLinecap="round" opacity={0.5}
        />
      </>
    ),

    celebrate: (
      <>
        <motion.path
          d={`M ${-28 * s} ${-8 * s} Q ${-18 * s} ${-18 * s} ${-8 * s} ${-8 * s}`}
          stroke={config.eyeColor} strokeWidth={3 * s} fill="none" strokeLinecap="round"
        />
        <motion.path
          d={`M ${8 * s} ${-8 * s} Q ${18 * s} ${-18 * s} ${28 * s} ${-8 * s}`}
          stroke={config.eyeColor} strokeWidth={3 * s} fill="none" strokeLinecap="round"
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.circle
            key={i}
            cx={0} cy={0} r={3 * s}
            fill={["#FFD700", "#FF6B6B", "#4A90FF", "#00E5CC", "#FFB347", "#CE82FF"][i]}
            animate={{
              cx: [0, (Math.cos((i * 60 * Math.PI) / 180) * 70) * s],
              cy: [0, (Math.sin((i * 60 * Math.PI) / 180) * 70 - 30) * s],
              opacity: [1, 0],
              scale: [1, 0.3],
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </>
    ),

    sad: (
      <>
        <ellipse cx={-18 * s} cy={-8 * s} rx={11 * s} ry={12 * s} fill={config.eyeColor} />
        <ellipse cx={18 * s} cy={-8 * s} rx={11 * s} ry={12 * s} fill={config.eyeColor} />
        <circle cx={-18 * s} cy={-3 * s} r={5 * s} fill={config.pupilColor} />
        <circle cx={18 * s} cy={-3 * s} r={5 * s} fill={config.pupilColor} />
        <line
          x1={-28 * s} y1={-24 * s} x2={-8 * s} y2={-20 * s}
          stroke={config.eyeColor} strokeWidth={2.5 * s} strokeLinecap="round" opacity={0.7}
        />
        <line
          x1={28 * s} y1={-24 * s} x2={8 * s} y2={-20 * s}
          stroke={config.eyeColor} strokeWidth={2.5 * s} strokeLinecap="round" opacity={0.7}
        />
        <motion.ellipse
          cx={-28 * s} cy={2 * s} rx={3 * s} ry={4 * s}
          fill="#4A90FF"
          animate={{ cy: [2 * s, 20 * s], opacity: [0.8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </>
    ),

    fire: (
      <>
        <ellipse cx={-18 * s} cy={-8 * s} rx={10 * s} ry={11 * s} fill={config.eyeColor} />
        <ellipse cx={18 * s} cy={-8 * s} rx={10 * s} ry={11 * s} fill={config.eyeColor} />
        <motion.circle
          cx={-18 * s} cy={-8 * s} r={6 * s}
          fill="#FF6B00"
          animate={{ fill: ["#FF6B00", "#FFD700", "#FF6B00"] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <motion.circle
          cx={18 * s} cy={-8 * s} r={6 * s}
          fill="#FF6B00"
          animate={{ fill: ["#FF6B00", "#FFD700", "#FF6B00"] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <motion.text
          x={-10 * s} y={-55 * s} fontSize={24 * s} fill="#FF6B00"
          animate={{ y: [-55 * s, -60 * s, -55 * s], scale: [1, 1.15, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >🔥</motion.text>
      </>
    ),

    // ===== NEW EMOTIONS =====

    confused: (
      <>
        {/* Uneven eyes — one big, one small */}
        <ellipse cx={-18 * s} cy={-8 * s} rx={12 * s} ry={13 * s} fill={config.eyeColor} />
        <ellipse cx={18 * s} cy={-8 * s} rx={8 * s} ry={9 * s} fill={config.eyeColor} />
        {/* Pupils looking different directions */}
        <motion.circle
          cx={-22 * s} cy={-8 * s} r={5 * s}
          fill={config.pupilColor}
          animate={{ cx: [-22 * s, -14 * s, -22 * s] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <motion.circle
          cx={20 * s} cy={-6 * s} r={4 * s}
          fill={config.pupilColor}
          animate={{ cx: [20 * s, 16 * s, 20 * s] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
        />
        {/* Tilted eyebrows */}
        <line
          x1={-28 * s} y1={-20 * s} x2={-8 * s} y2={-24 * s}
          stroke={config.eyeColor} strokeWidth={2.5 * s} strokeLinecap="round" opacity={0.6}
        />
        <line
          x1={10 * s} y1={-20 * s} x2={26 * s} y2={-22 * s}
          stroke={config.eyeColor} strokeWidth={2.5 * s} strokeLinecap="round" opacity={0.6}
        />
        {/* Question mark */}
        <motion.text
          x={28 * s} y={-28 * s} fontSize={16 * s} fill={config.lensGlow}
          animate={{ opacity: [0, 1, 1, 0], y: [-28 * s, -34 * s, -34 * s, -28 * s] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >?</motion.text>
      </>
    ),

    sleepy: (
      <>
        {/* Drooping half-closed eyes */}
        <motion.path
          d={`M ${-28 * s} ${-8 * s} Q ${-18 * s} ${-2 * s} ${-8 * s} ${-8 * s}`}
          stroke={config.eyeColor} strokeWidth={3 * s} fill="none" strokeLinecap="round"
        />
        <motion.path
          d={`M ${8 * s} ${-8 * s} Q ${18 * s} ${-2 * s} ${28 * s} ${-8 * s}`}
          stroke={config.eyeColor} strokeWidth={3 * s} fill="none" strokeLinecap="round"
        />
        {/* Z Z Z floating up */}
        <motion.text
          x={30 * s} y={-20 * s} fontSize={10 * s} fill={config.eyeColor} opacity={0.6}
          animate={{ y: [-20 * s, -35 * s], opacity: [0.6, 0], x: [30 * s, 36 * s] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >z</motion.text>
        <motion.text
          x={36 * s} y={-30 * s} fontSize={13 * s} fill={config.eyeColor} opacity={0.5}
          animate={{ y: [-30 * s, -48 * s], opacity: [0.5, 0], x: [36 * s, 42 * s] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.6 }}
        >z</motion.text>
        <motion.text
          x={42 * s} y={-42 * s} fontSize={16 * s} fill={config.eyeColor} opacity={0.4}
          animate={{ y: [-42 * s, -62 * s], opacity: [0.4, 0], x: [42 * s, 50 * s] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1.2 }}
        >Z</motion.text>
      </>
    ),

    surprised: (
      <>
        {/* Big round wide eyes */}
        <motion.ellipse
          cx={-18 * s} cy={-8 * s} rx={13 * s} ry={14 * s}
          fill={config.eyeColor}
          animate={{ ry: [14 * s, 15 * s, 14 * s] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <motion.ellipse
          cx={18 * s} cy={-8 * s} rx={13 * s} ry={14 * s}
          fill={config.eyeColor}
          animate={{ ry: [14 * s, 15 * s, 14 * s] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        {/* Tiny pupils (shock) */}
        <motion.circle
          cx={-18 * s} cy={-8 * s} r={3 * s}
          fill={config.pupilColor}
          animate={{ r: [3 * s, 4 * s, 3 * s] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <motion.circle
          cx={18 * s} cy={-8 * s} r={3 * s}
          fill={config.pupilColor}
          animate={{ r: [3 * s, 4 * s, 3 * s] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        {/* Highlight reflections */}
        <circle cx={-14 * s} cy={-12 * s} r={2 * s} fill={config.eyeColor} opacity={0.8} />
        <circle cx={22 * s} cy={-12 * s} r={2 * s} fill={config.eyeColor} opacity={0.8} />
        {/* Exclamation mark */}
        <motion.text
          x={-6 * s} y={-55 * s} fontSize={18 * s} fill="#FFD700" fontWeight="bold"
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >!</motion.text>
      </>
    ),

    love: (
      <>
        {/* Heart-shaped eyes */}
        <motion.text
          x={-28 * s} y={-0 * s} fontSize={22 * s} fill="#FF6B8A"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >♥</motion.text>
        <motion.text
          x={8 * s} y={-0 * s} fontSize={22 * s} fill="#FF6B8A"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        >♥</motion.text>
        {/* Floating hearts */}
        {[0, 1, 2].map((i) => (
          <motion.text
            key={i}
            x={(-20 + i * 20) * s} y={-40 * s}
            fontSize={8 * s} fill="#FF6B8A"
            animate={{
              y: [-40 * s, -70 * s],
              opacity: [0.7, 0],
              x: [(-20 + i * 20) * s, (-25 + i * 25) * s],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
          >♥</motion.text>
        ))}
      </>
    ),

    thinking: (
      <>
        {/* One eye normal, one eye looking up */}
        <ellipse cx={-18 * s} cy={-8 * s} rx={10 * s} ry={11 * s} fill={config.eyeColor} />
        <ellipse cx={18 * s} cy={-8 * s} rx={10 * s} ry={11 * s} fill={config.eyeColor} />
        {/* Pupils looking up-right */}
        <motion.circle
          cx={-14 * s} cy={-12 * s} r={5 * s}
          fill={config.pupilColor}
          animate={{ cx: [-14 * s, -13 * s, -14 * s], cy: [-12 * s, -13 * s, -12 * s] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.circle
          cx={22 * s} cy={-12 * s} r={5 * s}
          fill={config.pupilColor}
          animate={{ cx: [22 * s, 23 * s, 22 * s], cy: [-12 * s, -13 * s, -12 * s] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        {/* Thinking dots */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={(30 + i * 8) * s} cy={(-30 - i * 8) * s}
            r={(3 + i) * s}
            fill={config.lensGlow}
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </>
    ),
  };

  const mouthVariants: Record<Emotion, React.ReactNode> = {
    sparkle: (
      <motion.path
        d={`M ${-12 * s} ${12 * s} Q ${0} ${22 * s} ${12 * s} ${12 * s}`}
        stroke={config.eyeColor} strokeWidth={2.5 * s} fill="none" strokeLinecap="round"
        animate={{ d: [
          `M ${-12 * s} ${12 * s} Q ${0} ${22 * s} ${12 * s} ${12 * s}`,
          `M ${-14 * s} ${12 * s} Q ${0} ${25 * s} ${14 * s} ${12 * s}`,
          `M ${-12 * s} ${12 * s} Q ${0} ${22 * s} ${12 * s} ${12 * s}`,
        ]}}
        transition={{ duration: 2, repeat: Infinity }}
      />
    ),
    focus: (
      <line
        x1={-8 * s} y1={14 * s} x2={8 * s} y2={14 * s}
        stroke={config.eyeColor} strokeWidth={2.5 * s} strokeLinecap="round"
      />
    ),
    celebrate: (
      <motion.ellipse
        cx={0} cy={14 * s} rx={10 * s} ry={8 * s}
        fill={config.eyeColor}
        animate={{ ry: [8 * s, 10 * s, 8 * s] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    ),
    sad: (
      <path
        d={`M ${-10 * s} ${16 * s} Q ${0} ${10 * s} ${10 * s} ${16 * s}`}
        stroke={config.eyeColor} strokeWidth={2.5 * s} fill="none" strokeLinecap="round"
      />
    ),
    fire: (
      <motion.path
        d={`M ${-10 * s} ${12 * s} Q ${0} ${22 * s} ${10 * s} ${12 * s}`}
        stroke={config.eyeColor} strokeWidth={3 * s} fill="none" strokeLinecap="round"
        animate={{ strokeWidth: [3 * s, 3.5 * s, 3 * s] }}
        transition={{ duration: 0.4, repeat: Infinity }}
      />
    ),

    // ===== NEW MOUTHS =====

    confused: (
      <motion.path
        d={`M ${-10 * s} ${14 * s} Q ${-3 * s} ${10 * s} ${0} ${14 * s} Q ${3 * s} ${18 * s} ${10 * s} ${14 * s}`}
        stroke={config.eyeColor} strokeWidth={2.5 * s} fill="none" strokeLinecap="round"
        animate={{
          d: [
            `M ${-10 * s} ${14 * s} Q ${-3 * s} ${10 * s} ${0} ${14 * s} Q ${3 * s} ${18 * s} ${10 * s} ${14 * s}`,
            `M ${-10 * s} ${14 * s} Q ${-3 * s} ${18 * s} ${0} ${14 * s} Q ${3 * s} ${10 * s} ${10 * s} ${14 * s}`,
            `M ${-10 * s} ${14 * s} Q ${-3 * s} ${10 * s} ${0} ${14 * s} Q ${3 * s} ${18 * s} ${10 * s} ${14 * s}`,
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    ),
    sleepy: (
      <motion.path
        d={`M ${-8 * s} ${14 * s} Q ${0} ${18 * s} ${8 * s} ${14 * s}`}
        stroke={config.eyeColor} strokeWidth={2 * s} fill="none" strokeLinecap="round"
        opacity={0.5}
      />
    ),
    surprised: (
      <motion.ellipse
        cx={0} cy={16 * s} rx={8 * s} ry={10 * s}
        fill={config.eyeColor}
        animate={{ ry: [10 * s, 12 * s, 10 * s], rx: [8 * s, 9 * s, 8 * s] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    ),
    love: (
      <motion.path
        d={`M ${-12 * s} ${12 * s} Q ${0} ${26 * s} ${12 * s} ${12 * s}`}
        stroke="#FF6B8A" strokeWidth={2.5 * s} fill="none" strokeLinecap="round"
        animate={{ d: [
          `M ${-12 * s} ${12 * s} Q ${0} ${26 * s} ${12 * s} ${12 * s}`,
          `M ${-14 * s} ${12 * s} Q ${0} ${28 * s} ${14 * s} ${12 * s}`,
          `M ${-12 * s} ${12 * s} Q ${0} ${26 * s} ${12 * s} ${12 * s}`,
        ]}}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    ),
    thinking: (
      <motion.path
        d={`M ${-6 * s} ${14 * s} Q ${0} ${12 * s} ${6 * s} ${16 * s}`}
        stroke={config.eyeColor} strokeWidth={2.5 * s} fill="none" strokeLinecap="round"
      />
    ),
  };

  const bodyFloat = { y: [0, -6, 0] };

  // Emotion-specific glow overrides
  const emotionGlow: Partial<Record<Emotion, { speed: number; intensity: number }>> = {
    fire: { speed: 0.8, intensity: 0.9 },
    love: { speed: 1.2, intensity: 0.7 },
    sleepy: { speed: 4, intensity: 0.3 },
    surprised: { speed: 0.5, intensity: 0.8 },
  };

  const gSpeed = emotionGlow[emotion]?.speed ?? config.glowSpeed;
  const gIntensity = emotionGlow[emotion]?.intensity ?? config.glowIntensity;
  const glowPulse = {
    opacity: [gIntensity * 0.5, gIntensity, gIntensity * 0.5],
    scale: [1, 1 + gIntensity * 0.1, 1],
  };

  // Emotion-specific glow color override
  const glowColorOverride: Partial<Record<Emotion, string>> = {
    fire: "#FF6B00",
    love: "#FF6B8A",
    sad: "#4A90FF",
  };
  const currentGlow = glowColorOverride[emotion] ?? config.lensGlow;

  // Show cheeks for warm emotions
  const showCheeks = ["sparkle", "celebrate", "love", "surprised"].includes(emotion);

  return (
    <motion.svg
      viewBox={`${-100 * s} ${-100 * s} ${200 * s} ${220 * s}`}
      width={280 * s}
      height={300 * s}
      animate={bodyFloat}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <filter id="lens-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={8 * s} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={0} dy={4 * s} stdDeviation={6 * s} floodColor="#000" floodOpacity={0.3} />
        </filter>
      </defs>

      {/* Handle */}
      <motion.rect
        x={-8 * s} y={45 * s}
        width={16 * s} height={55 * s}
        rx={8 * s}
        fill={config.handleColor}
        filter="url(#shadow)"
      />
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1={-4 * s} y1={(68 + i * 8) * s}
          x2={4 * s} y2={(68 + i * 8) * s}
          stroke={config.bodyColor} strokeWidth={1.5 * s} strokeLinecap="round" opacity={0.4}
        />
      ))}

      {/* Glow ring */}
      <motion.circle
        cx={0} cy={-5 * s}
        r={52 * s}
        fill="none"
        stroke={currentGlow}
        strokeWidth={3 * s}
        opacity={0.4}
        filter="url(#lens-glow)"
        animate={glowPulse}
        transition={{ duration: gSpeed, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Body */}
      <circle
        cx={0} cy={-5 * s}
        r={48 * s}
        fill={config.bodyColor}
        filter="url(#shadow)"
      />

      {/* Lens inner */}
      <circle
        cx={0} cy={-5 * s}
        r={42 * s}
        fill={config.lensInner}
      />

      {/* Rim highlight */}
      <motion.path
        d={`M ${-40 * s} ${-25 * s} A ${42 * s} ${42 * s} 0 0 1 ${10 * s} ${-46 * s}`}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={2 * s}
        fill="none"
        strokeLinecap="round"
      />

      {/* Cheeks */}
      <AnimatePresence>
        {showCheeks && (
          <>
            <motion.ellipse
              cx={-32 * s} cy={6 * s} rx={8 * s} ry={5 * s}
              fill={emotion === "love" ? "#FF6B8A" : config.cheekColor}
              opacity={0}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
            />
            <motion.ellipse
              cx={32 * s} cy={6 * s} rx={8 * s} ry={5 * s}
              fill={emotion === "love" ? "#FF6B8A" : config.cheekColor}
              opacity={0}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Face */}
      <AnimatePresence mode="wait">
        <motion.g
          key={emotion}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          {eyeVariants[emotion]}
          {mouthVariants[emotion]}
        </motion.g>
      </AnimatePresence>
    </motion.svg>
  );
}
