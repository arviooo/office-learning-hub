"use client";

import { useEffect, useState } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { Pause, Play } from "lucide-react";

const HERO_LOTTIE_URL =
  "https://lottie.host/d33e4207-d9b9-4886-9527-2ccd633ead25/Wil2pn9ntD.lottie";

export function LandingHubHero() {
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setIsPlaying(false);
    }
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsPlaying(false);
        dotLottie?.pause();
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [dotLottie]);

  function togglePlayback() {
    if (!dotLottie) return;
    if (isPlaying) {
      dotLottie.pause();
      setIsPlaying(false);
    } else {
      dotLottie.play();
      setIsPlaying(true);
    }
  }

  return (
    <div className="relative mx-auto flex flex-col items-center justify-center py-2 sm:py-6">
      {/* Glow lembut di belakang animasi tanpa garis/node percabangan */}
      <div
        className="pointer-events-none absolute h-56 w-56 rounded-full bg-gradient-to-tr from-sky-100/90 via-blue-50/80 to-orange-100/60 blur-3xl sm:h-72 sm:w-72"
        aria-hidden="true"
      />

      {/* Animasi Lottie bersih di tengah-tengah */}
      <div
        className="relative z-10 h-56 w-56 transition-transform duration-500 ease-out hover:scale-[1.03] sm:h-72 sm:w-72"
        role="img"
        aria-label="Animasi ilustrasi pembelajaran interaktif Office Learning Hub"
      >
        <DotLottieReact
          src={HERO_LOTTIE_URL}
          loop
          autoplay={isPlaying}
          dotLottieRefCallback={setDotLottie}
          className="h-full w-full"
        />
      </div>

      <button
        type="button"
        onClick={togglePlayback}
        className="relative z-20 mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-400 shadow-2xs transition hover:border-slate-300 hover:text-slate-700"
      >
        {isPlaying ? (
          <>
            <Pause className="h-3 w-3" aria-hidden="true" />
            <span>Jeda Animasi</span>
          </>
        ) : (
          <>
            <Play className="h-3 w-3" aria-hidden="true" />
            <span>Putar Animasi</span>
          </>
        )}
      </button>
    </div>
  );
}
