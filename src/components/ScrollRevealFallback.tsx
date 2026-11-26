"use client";

import { useEffect } from "react";

export function ScrollRevealFallback() {
  useEffect(() => {
    const prefersMotion = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    if (!prefersMotion) return;

    const hasNativeScrollDriven =
      typeof CSS !== "undefined" &&
      CSS.supports("(animation-timeline: view()) and (animation-range: entry)");
    if (hasNativeScrollDriven) return;

    const elements = Array.from(document.querySelectorAll<HTMLElement>(".scroll-reveal"));
    if (elements.length === 0) return;

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.92) {
        el.classList.add("scroll-reveal-fallback-hidden");
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.remove("scroll-reveal-fallback-hidden");
            entry.target.classList.add("scroll-reveal-fallback-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
