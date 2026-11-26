"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { ArrowLeft, Pause, Play } from "lucide-react";

const AUTH_LOTTIE_URL =
  "https://lottie.host/90cdf0ff-800b-46fc-a916-21d05c2e4cb1/H2LxYPxsf7.lottie";

export function AuthLottiePanel() {
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
    <aside className="relative hidden flex-col justify-between bg-gradient-to-b from-[#dff4ff] via-[#eef8ff] to-[#f6f8f5] p-8 lg:flex">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs ring-1 ring-slate-200/70 backdrop-blur-xs transition hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
        <div
          className="aspect-square w-full max-w-[400px]"
          role="img"
          aria-label="Ilustrasi animasi Office Learning Hub"
        >
          <DotLottieReact
            src={AUTH_LOTTIE_URL}
            loop
            autoplay={isPlaying}
            dotLottieRefCallback={setDotLottie}
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>OFFICE LEARNING HUB • SMK MPLB</span>
        <button
          type="button"
          onClick={togglePlayback}
          className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/70 transition hover:bg-white hover:text-slate-800"
        >
          {isPlaying ? (
            <>
              <Pause className="h-3 w-3" aria-hidden="true" />
              <span>Jeda</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3" aria-hidden="true" />
              <span>Putar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
