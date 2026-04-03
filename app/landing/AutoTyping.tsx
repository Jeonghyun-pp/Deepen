"use client";

import { useState, useEffect } from "react";

interface AutoTypingProps {
  words: string[];
  typingSpeed?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
}

export default function AutoTyping({
  words,
  typingSpeed = 100,
  pauseDuration = 2000,
  deletingSpeed = 50,
}: AutoTypingProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];

    if (!isDeleting && displayed === currentWord) {
      const timer = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(timer);
    }

    if (isDeleting && displayed === "") {
      const timer = setTimeout(() => {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
      }, 0);
      return () => clearTimeout(timer);
    }

    const speed = isDeleting ? deletingSpeed : typingSpeed;
    const timer = setTimeout(() => {
      setDisplayed(
        isDeleting
          ? currentWord.slice(0, displayed.length - 1)
          : currentWord.slice(0, displayed.length + 1)
      );
    }, speed);

    return () => clearTimeout(timer);
  }, [displayed, isDeleting, wordIndex, words, typingSpeed, pauseDuration, deletingSpeed]);

  return (
    <span className="text-coral">
      {displayed}
      <span className="inline-block w-[3px] h-[1em] bg-coral ml-0.5 animate-pulse" />
    </span>
  );
}
