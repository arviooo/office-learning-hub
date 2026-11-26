interface BrandLogoProps {
  compact?: boolean;
  light?: boolean;
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ compact = false, light = false, size = "md" }: BrandLogoProps) {
  const imgSize =
    size === "lg" ? "h-12 w-12" : size === "sm" ? "h-9 w-9" : "h-10 w-10";

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <img
        src="/logo.png"
        alt="Logo Office Learning Hub"
        className={`${imgSize} shrink-0 rounded-xl object-cover shadow-xs ring-1 ${
          light ? "ring-white/30" : "ring-slate-200"
        }`}
      />
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span
            className={`text-sm font-extrabold tracking-tight sm:text-base ${
              light ? "text-white" : "text-[#0b2559]"
            }`}
          >
            OFFICE LEARNING HUB
          </span>
          <span
            className={`text-[11px] font-medium ${
              light ? "text-blue-100" : "text-slate-500"
            }`}
          >
            Pelayanan Prima • SMK MPLB
          </span>
        </span>
      )}
    </span>
  );
}
