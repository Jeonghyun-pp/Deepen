"use client";

import { useRef, useState } from "react";
import Header from "./landing/Header";
import HeroSection from "./landing/HeroSection";
import ProblemSection from "./landing/ProblemSection";
import StepsSection from "./landing/StepsSection";
import SolutionMapSection from "./landing/SolutionMapSection";
import LayerDetailSection from "./landing/LayerDetailSection";
import CardStackSection from "./landing/CardStackSection";
import PersonaSection from "./landing/PersonaSection";
import StatsSection from "./landing/StatsSection";
import BetaCtaSection from "./landing/BetaCtaSection";
import FaqSection from "./landing/FaqSection";
import PostSignupModal from "./landing/PostSignupModal";
import FooterSection from "./landing/FooterSection";
export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const problemRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLElement>(null);
  const solutionRef = useRef<HTMLElement>(null);
  const layerDetailRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLElement>(null);
  const personaRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  const [hasSignedUp, setHasSignedUp] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSignup = () => {
    setHasSignedUp(true);
    setShowModal(true);
  };

  return (
    <>
      <Header />

      <main>
        <HeroSection ref={heroRef} />
        <ProblemSection ref={problemRef} />
        <StepsSection ref={stepsRef} />
        <SolutionMapSection ref={solutionRef} />
        <LayerDetailSection ref={layerDetailRef} />
        <CardStackSection ref={cardsRef} />
        <PersonaSection ref={personaRef} />
        <StatsSection ref={statsRef} />
        <BetaCtaSection ref={ctaRef} onSignup={handleSignup} hasSignedUp={hasSignedUp} />
        <FaqSection ref={faqRef} />
        <FooterSection ref={footerRef} />
      </main>

      <PostSignupModal visible={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
