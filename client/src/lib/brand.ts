export type BrandIdentity = {
  key: string;
  name: string;
  logoUrl: string;
  accent: string;
  softAccent: string;
  ink: string;
};

export const JMK_BRAND = {
  name: "JMK Group",
  logoUrl: "/brand/jmklogo-1-1024x279.png",
  navy: "#002460",
  cyan: "#6cccd8",
  cyanStrong: "#0090b4",
  softCyan: "#e8f7f9",
  softNavy: "#e8edf5",
} as const;

export const HOTEL_BRANDS = {
  home2: {
    key: "home2",
    name: "Home2 Suites by Hilton",
    logoUrl: "/brand/Home2_Suites_by_Hilton_logo.svg.webp",
    accent: "#a9b500",
    softAccent: "#f6f7dc",
    ink: "#4c3729",
  },
  holidayInnExpress: {
    key: "holiday-inn-express",
    name: "Holiday Inn Express by IHG",
    logoUrl: "/brand/hiex-logo-banner-white.png",
    accent: "#003a78",
    softAccent: "#eaf1f8",
    ink: "#052f68",
  },
  residenceInn: {
    key: "residence-inn",
    name: "Residence Inn by Marriott",
    logoUrl: "/brand/Residence_Inn_logo.svg.webp",
    accent: "#5e2f3d",
    softAccent: "#f5ecef",
    ink: "#48222f",
  },
  aloft: {
    key: "aloft",
    name: "Aloft Hotels",
    logoUrl: "/brand/Aloft_Hotels_logo.svg.webp",
    accent: "#b01f64",
    softAccent: "#faedf3",
    ink: "#34383c",
  },
  hampton: {
    key: "hampton",
    name: "Hampton by Hilton",
    logoUrl: "/brand/Hampton-by-Hilton-Logo-Color.png",
    accent: "#0754b8",
    softAccent: "#eaf2fd",
    ink: "#063e8c",
  },
  moxy: {
    key: "moxy",
    name: "Moxy Hotels",
    logoUrl: "/brand/mxyDUBOXrgb.1434020.jpg",
    accent: "#b1127f",
    softAccent: "#f9eaf5",
    ink: "#24282b",
  },
} satisfies Record<string, BrandIdentity>;

const PROPERTY_BRAND_MAP: Record<string, BrandIdentity> = {
  "Holiday Inn Express Dublin City Centre": HOTEL_BRANDS.holidayInnExpress,
  "Moxy Cork": HOTEL_BRANDS.moxy,
  "Residence Inn Cork": HOTEL_BRANDS.residenceInn,
  "Aloft Belfast": HOTEL_BRANDS.aloft,
  "Residence Inn Belfast": HOTEL_BRANDS.residenceInn,
  "Hampton by Hilton Dublin City Centre": HOTEL_BRANDS.hampton,
  "Home2 Suites Dublin City Centre": HOTEL_BRANDS.home2,
};

export function getPropertyBrand(propertyName?: string | null): BrandIdentity | null {
  if (!propertyName) return null;
  const exact = PROPERTY_BRAND_MAP[propertyName];
  if (exact) return exact;
  const normalized = propertyName.toLowerCase();
  if (normalized.includes("holiday inn express")) return HOTEL_BRANDS.holidayInnExpress;
  if (normalized.includes("home2")) return HOTEL_BRANDS.home2;
  if (normalized.includes("hampton")) return HOTEL_BRANDS.hampton;
  if (normalized.includes("residence inn")) return HOTEL_BRANDS.residenceInn;
  if (normalized.includes("aloft")) return HOTEL_BRANDS.aloft;
  if (normalized.includes("moxy")) return HOTEL_BRANDS.moxy;
  return null;
}

export const PROPERTY_BRAND_ENTRIES = Object.entries(PROPERTY_BRAND_MAP).map(([propertyName, brand]) => ({
  propertyName,
  brand,
}));
