import { z } from "zod";
import { isValidTimeZone } from "@/lib/datetime";

export const LOCATION_TYPES = ["CITY", "COUNTRY_FALLBACK"] as const;

// Validates seed-file location records. Rules:
// - coordinates must be inside valid ranges
// - city locations must carry an IANA timezone
// - country fallbacks must never carry a timezone (a country has many)
// - country fallbacks are named after their country — a country is never a city
export const locationSeedSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(120),
    type: z.enum(LOCATION_TYPES),
    stateProvince: z.string().trim().max(120).default(""),
    country: z.string().trim().min(2, "Country is required").max(120),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Must be an ISO 3166-1 alpha-2 code (e.g. NG)"),
    region: z.string().trim().min(2, "Region is required").max(120),
    latitude: z
      .number()
      .min(-90, "Latitude must be >= -90")
      .max(90, "Latitude must be <= 90"),
    longitude: z
      .number()
      .min(-180, "Longitude must be >= -180")
      .max(180, "Longitude must be <= 180"),
    timezone: z
      .string()
      .trim()
      .max(64)
      .refine((t) => t === "" || isValidTimeZone(t), "Must be a valid IANA timezone")
      .default(""),
  })
  .superRefine((data, ctx) => {
    if (data.type === "CITY" && !data.timezone) {
      ctx.addIssue({
        code: "custom",
        path: ["timezone"],
        message: "City locations require an IANA timezone",
      });
    }
    if (data.type === "COUNTRY_FALLBACK") {
      if (data.timezone) {
        ctx.addIssue({
          code: "custom",
          path: ["timezone"],
          message: "Country fallback locations must not pin a single timezone",
        });
      }
      if (data.name !== data.country) {
        ctx.addIssue({
          code: "custom",
          path: ["name"],
          message: "Country fallback name must be the country name",
        });
      }
    }
  });

export type LocationSeed = z.infer<typeof locationSeedSchema>;
export type LocationSeedInput = z.input<typeof locationSeedSchema>;
