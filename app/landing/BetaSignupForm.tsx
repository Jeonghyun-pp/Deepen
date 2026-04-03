"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";

interface BetaSignupFormProps {
  onSubmit: (data: { email: string; interests: string[] }) => void;
}

export default function BetaSignupForm({ onSubmit }: BetaSignupFormProps) {
  const { t, tArray } = useTranslation();
  const interestOptions = tArray("cta.interests") as string[];

  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || interests.length === 0) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit({ email, interests });
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Email */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("cta.emailPlaceholder")}
        required
        className="w-full px-5 py-3.5 rounded-xl border-2 border-border bg-white text-text-primary text-base outline-none focus:border-coral transition-colors"
      />

      {/* Interests */}
      <div>
        <p className="text-sm font-semibold text-text-secondary mb-3">{t("cta.interestLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                interests.includes(interest)
                  ? "bg-coral text-white"
                  : "bg-coral-light text-text-secondary hover:bg-coral hover:text-white"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={!email || interests.length === 0 || isSubmitting}
        whileTap={{ scale: 0.97 }}
        className="w-full px-8 py-4 rounded-xl bg-coral text-white font-bold text-lg transition-all hover:bg-coral-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={{ boxShadow: "0 4px 0 #E85555" }}
      >
        {isSubmitting ? "..." : t("cta.submit")}
      </motion.button>
    </form>
  );
}
