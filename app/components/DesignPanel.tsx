"use client";

import { DeepyConfig, defaultConfig, presets } from "./Deepy";

interface DesignPanelProps {
  config: DeepyConfig;
  onChange: (config: DeepyConfig) => void;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-[#6b7280] whitespace-nowrap">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[90px] text-xs font-mono bg-[#1a1a40] border border-[#2a2a5a] rounded px-2 py-1 text-[#f5f5f7] uppercase"
        />
      </div>
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderField({ label, value, min, max, step, unit, onChange }: SliderFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-[#6b7280]">{label}</label>
        <span className="text-xs text-[#6b7280] font-mono">{value}{unit ?? ""}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#4a90ff]"
      />
    </div>
  );
}

export default function DesignPanel({ config, onChange }: DesignPanelProps) {
  const update = (key: keyof DeepyConfig, value: string | number) => {
    onChange({ ...config, [key]: value });
  };

  const applyPreset = (presetKey: string) => {
    const preset = presets[presetKey];
    if (preset) {
      onChange({ ...defaultConfig, ...preset.config });
    }
  };

  const exportConfig = () => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json);
    alert("Config JSON copied to clipboard!");
  };

  const sections: { title: string; fields: { key: keyof DeepyConfig; label: string }[] }[] = [
    {
      title: "Body",
      fields: [
        { key: "bodyColor", label: "Body" },
        { key: "lensGlow", label: "Glow" },
        { key: "lensInner", label: "Lens Inner" },
        { key: "handleColor", label: "Handle" },
      ],
    },
    {
      title: "Face",
      fields: [
        { key: "eyeColor", label: "Eye" },
        { key: "pupilColor", label: "Pupil" },
        { key: "cheekColor", label: "Cheek" },
      ],
    },
  ];

  return (
    <div className="w-72 bg-[#12122a] p-5 flex flex-col gap-5">
      <h2 className="text-lg font-bold text-[#f5f5f7]">Design Editor</h2>

      {/* Presets */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-[#00e5cc] uppercase tracking-wider">Presets</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-[#f5f5f7] bg-[#1a1a40] border border-[#2a2a5a] hover:border-[#4a90ff] transition-colors cursor-pointer"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: preset.config.lensGlow ?? defaultConfig.lensGlow }}
              />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Color sections */}
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-[#00e5cc] uppercase tracking-wider">
            {section.title}
          </h3>
          {section.fields.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              value={config[field.key] as string}
              onChange={(v) => update(field.key, v)}
            />
          ))}
        </div>
      ))}

      {/* Animation */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-[#00e5cc] uppercase tracking-wider">Animation</h3>
        <SliderField
          label="Glow Speed"
          value={config.glowSpeed}
          min={0.3} max={5} step={0.1}
          unit="s"
          onChange={(v) => update("glowSpeed", v)}
        />
        <SliderField
          label="Glow Intensity"
          value={config.glowIntensity}
          min={0.1} max={1} step={0.05}
          onChange={(v) => update("glowIntensity", v)}
        />
      </div>

      {/* Size */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-[#00e5cc] uppercase tracking-wider">Size</h3>
        <SliderField
          label="Scale"
          value={config.scale}
          min={0.5} max={2} step={0.1}
          unit="x"
          onChange={(v) => update("scale", v)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-[#2a2a5a]">
        <button
          onClick={() => onChange({ ...defaultConfig })}
          className="flex-1 px-3 py-2 rounded-lg text-xs text-[#6b7280] bg-[#1a1a40] border border-[#2a2a5a] hover:text-[#f5f5f7] transition-colors cursor-pointer"
        >
          Reset
        </button>
        <button
          onClick={exportConfig}
          className="flex-1 px-3 py-2 rounded-lg text-xs text-[#00e5cc] bg-[#1a1a40] border border-[#2a2a5a] hover:bg-[#2a2a5a] transition-colors cursor-pointer"
        >
          Export JSON
        </button>
      </div>
    </div>
  );
}
