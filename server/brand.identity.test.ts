import { describe, expect, it } from "vitest";

import {
  HOTEL_BRANDS,
  JMK_BRAND,
  PROPERTY_BRAND_ENTRIES,
  getPropertyBrand,
} from "../client/src/lib/brand";

const EXPECTED_PROPERTIES = [
  "Holiday Inn Express Dublin City Centre",
  "Moxy Cork",
  "Residence Inn Cork",
  "Aloft Belfast",
  "Residence Inn Belfast",
  "Hampton by Hilton Dublin City Centre",
  "Home2 Suites Dublin City Centre",
] as const;

describe("JMK property brand identities", () => {
  it("maps every seeded JMK property to a supplied hotel brand", () => {
    expect(PROPERTY_BRAND_ENTRIES.map(entry => entry.propertyName)).toEqual(EXPECTED_PROPERTIES);

    for (const propertyName of EXPECTED_PROPERTIES) {
      expect(getPropertyBrand(propertyName), propertyName).not.toBeNull();
    }
  });

  it("reuses Residence Inn identity for both Cork and Belfast properties", () => {
    expect(getPropertyBrand("Residence Inn Cork")).toBe(HOTEL_BRANDS.residenceInn);
    expect(getPropertyBrand("Residence Inn Belfast")).toBe(HOTEL_BRANDS.residenceInn);
  });

  it("supports safe name-based fallback and unknown-property fallback", () => {
    expect(getPropertyBrand("Aloft Belfast Hotel")).toBe(HOTEL_BRANDS.aloft);
    expect(getPropertyBrand("Unknown JMK property")).toBeNull();
    expect(getPropertyBrand(null)).toBeNull();
  });

  it("uses durable self-hosted asset paths for all supplied logos", () => {
    expect(JMK_BRAND.logoUrl).toMatch(/^\/brand\//);
    for (const brand of Object.values(HOTEL_BRANDS)) {
      expect(brand.logoUrl, brand.name).toMatch(/^\/brand\//);
    }
  });

  it("uses one distinct logo file for every hotel brand", () => {
    const hotelLogoUrls = Object.values(HOTEL_BRANDS).map(brand => brand.logoUrl);

    expect(new Set(hotelLogoUrls).size).toBe(hotelLogoUrls.length);
  });
});
