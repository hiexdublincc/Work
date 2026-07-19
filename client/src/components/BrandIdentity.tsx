import { cn } from "@/lib/utils";
import { useState } from "react";
import { HOTEL_BRANDS, JMK_BRAND, PROPERTY_BRAND_ENTRIES, getPropertyBrand, type BrandIdentity } from "@/lib/brand";

type LogoProps = {
  className?: string;
  imageClassName?: string;
};

export function GroupLogo({ className, imageClassName }: LogoProps) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("inline-flex items-center justify-center overflow-hidden", className)}>
      {failed ? (
        <span role="img" aria-label="JMK Group UK & Ireland logo unavailable" className="px-2 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#002460]">
          JMK Group
        </span>
      ) : (
        <img
          src={JMK_BRAND.logoUrl}
          alt="JMK Group UK & Ireland"
          onError={() => setFailed(true)}
          className={cn("block h-full w-full object-contain", imageClassName)}
        />
      )}
    </span>
  );
}

// Every tile is the same fixed size. The source logo files are pre-trimmed (see
// client/public/brand/) to remove the inconsistent blank padding each brand shipped with, so at
// this uniform box size every mark now fills a comparable share of its tile.
const HOTEL_LOGO_TILE = "h-9 w-24 shrink-0 rounded-xl border border-[#d9e3ed] bg-white shadow-[0_1px_2px_rgba(0,36,96,0.04)]";

export function BrandLogo({ brand, className, imageClassName }: LogoProps & { brand: BrandIdentity }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      title={brand.name}
      className={cn("inline-flex items-center justify-center overflow-hidden", HOTEL_LOGO_TILE, className)}
    >
      {failed ? (
        <span
          role="img"
          aria-label={`${brand.name} logo unavailable`}
          className="px-2 text-center text-[9px] font-bold leading-tight text-slate-700"
        >
          {brand.name}
        </span>
      ) : (
        <img
          src={brand.logoUrl}
          alt={`${brand.name} logo`}
          onError={() => setFailed(true)}
          className={cn("block h-full w-full object-contain", imageClassName)}
        />
      )}
    </span>
  );
}

export function PropertyLogo({ propertyName, className, imageClassName }: LogoProps & { propertyName?: string | null }) {
  const brand = getPropertyBrand(propertyName);
  if (!brand) return <GroupLogo className={className} imageClassName={imageClassName} />;
  return <BrandLogo brand={brand} className={className} imageClassName={imageClassName} />;
}

export function PropertyIdentity({
  propertyName,
  className,
  compact = false,
}: {
  propertyName?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const brand = getPropertyBrand(propertyName);
  if (!brand) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <GroupLogo className={compact ? "h-8 w-24" : "h-10 w-32"} />
        {!compact && <div><p className="text-sm font-semibold text-foreground">JMK Group</p><p className="text-xs text-muted-foreground">Group commercial view</p></div>}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <BrandLogo brand={brand} />
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{propertyName}</p>
          <p className="truncate text-xs text-muted-foreground">{brand.name}</p>
        </div>
      )}
    </div>
  );
}

export function PortfolioLogoStrip({ className }: { className?: string }) {
  const uniqueBrands = Array.from(new Map(PROPERTY_BRAND_ENTRIES.map(({ brand }) => [brand.key, brand])).values());
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} aria-label="JMK Group hotel brands">
      {uniqueBrands.map(brand => (
        <BrandLogo key={brand.key} brand={brand} />
      ))}
    </div>
  );
}

export const HOTEL_BRAND_OPTIONS = Object.values(HOTEL_BRANDS);
