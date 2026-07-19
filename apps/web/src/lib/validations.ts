import { z } from "zod";

// Utility to mitigate SSRF by preventing requests to local or private IP blocks
export function isSafeExternalUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr) return true; // Optional fields can be empty
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    
    // Check against local/private network domains and IPs
    const forbiddenHostnames = [
      "localhost",
      "127.0.0.1",
      "::1",
      "169.254.169.254", // AWS Metadata
    ];
    
    if (forbiddenHostnames.includes(hostname)) return false;

    // Check for common private IP ranges (basic regex match)
    const ipMatcher = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
    const match = hostname.match(ipMatcher);
    if (match) {
      const [_, o1Str, o2Str] = match;
      const o1 = parseInt(o1Str, 10);
      const o2 = parseInt(o2Str, 10);
      if (o1 === 10) return false; // 10.x.x.x
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return false; // 172.16.x.x - 172.31.x.x
      if (o1 === 192 && o2 === 168) return false; // 192.168.x.x
    }
    
    return true;
  } catch (err) {
    // If it's not a valid URL, it can't be used for SSRF in a fetch call directly, 
    // but usually we want valid URLs anyway.
    return false;
  }
}

// Reusable safe URL string schema
export const safeUrlSchema = z.string().url().refine(isSafeExternalUrl, {
  message: "Invalid or forbidden URL",
});

export const safeUrlOptionalSchema = z.string().url().refine(isSafeExternalUrl, {
  message: "Invalid or forbidden URL",
}).optional().nullable().or(z.literal(""));

export const createClientSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  businessName: z.string().optional().nullable(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Phone must be in valid E.164 format (e.g., +1234567890)").optional().nullable().or(z.literal("")),
  email: z.string().email().optional().nullable().or(z.literal("")),
  website: safeUrlOptionalSchema,
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Must be a valid US zip code").optional().nullable().or(z.literal("")),
  type: z.enum(["SERVICE_AREA_BUSINESS", "STOREFRONT_BUSINESS"]).optional().nullable(),
  notes: z.string().optional().nullable(),
  primaryCategory: z.string().optional().nullable(),
  secondaryCategories: z.string().optional().nullable(),
  gbpDescription: z.string().max(750, "Google Business Profile descriptions are limited to 750 characters").optional().nullable(),
  businessHours: z.string().optional().nullable(),
  gbpMapUrl: z.string().url("Must be a valid Google Maps URL").regex(/google\.com\/maps/, "Must be a Google Maps link").optional().nullable().or(z.literal("")),
  serviceAreas: z.array(z.object({
    name: z.string(),
    city: z.string().optional().nullable(),
    radiusMiles: z.number().max(50, "SAB radius cannot typically exceed 50 miles on Google Maps").optional().nullable(),
    isPrimary: z.boolean().optional(),
  })).max(20, "Google Business Profile only allows up to 20 service areas").optional().nullable(),
}).superRefine((data, ctx) => {
  const hasAddress = !!data.address && data.address.trim() !== "";
  const hasServiceAreas = data.serviceAreas && data.serviceAreas.length > 0;

  if (!hasAddress && !hasServiceAreas) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Service areas are required when no physical address is provided (SAB).",
      path: ["serviceAreas"],
    });
  }
});

export const updateClientSettingsSchema = z.object({
  businessName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  website: safeUrlOptionalSchema,
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
});

export const createKeywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  targetRank: z.number().optional().nullable(),
  priority: z.number().optional().nullable(),
});

export const updateKeywordSchema = z.object({
  keywordId: z.string().min(1, "Keyword ID is required"),
  targetRank: z.number().optional().nullable(),
  priority: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
});

export const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  module: z.string().min(1, "Module is required"),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "PENDING_APPROVAL", "DONE", "FAILED", "BLOCKED", "DEFERRED"]).optional(),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  scheduledFor: z.string().datetime().optional().nullable(),
  sprint: z.number().optional().nullable(),
});

export const createLeadSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  source: z.enum(["GBP_CALL", "GBP_DIRECTIONS", "GBP_WEBSITE", "FORM_SUBMISSION", "PHONE_CALL", "WHATSAPP", "EMAIL", "ORGANIC_SEARCH", "REFERRAL", "OTHER"]),
  value: z.number().optional().nullable(),
  contactInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateGbpProfileSchema = z.object({
  isVerified: z.boolean().optional().nullable(),
  gbpAccountId: z.string().optional().nullable(),
  gbpLocationId: z.string().optional().nullable(),
  primaryCategory: z.string().optional().nullable(),
  secondaryCategories: z.string().optional().nullable().refine((val) => {
    if (!val) return true;
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr) ? arr.length <= 9 : true;
    } catch {
      return true; // Not JSON, skip this validation
    }
  }, { message: "Secondary categories limit exceeded (Max 9)." }),
  description: z.string().max(750, "Description exceeds 750 characters limit.")
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      const hasUrl = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i.test(val);
      const hasPhone = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(val);
      const letters = val.replace(/[^a-zA-Z]/g, '');
      const isAllCaps = letters.length > 10 && letters === letters.toUpperCase();
      return !hasUrl && !hasPhone && !isAllCaps;
    }, { message: "Description cannot contain URLs, phone numbers, or be strictly ALL-CAPS text." }),
  phone: z.string().optional().nullable(),
  websiteUrl: safeUrlOptionalSchema,
  bookingUrl: safeUrlOptionalSchema,
  bookingUrlOverrideNote: z.string().optional().nullable(),
});

export const gbpServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  isPriceConfirmed: z.boolean().optional().nullable(),
}).refine((data) => {
  if (data.price && data.price > 0) {
    return data.isPriceConfirmed === true;
  }
  return true;
}, { message: "Price confirmations must be strictly enforced before saving.", path: ["isPriceConfirmed"] });

export const gbpProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  url: safeUrlOptionalSchema,
});

export const updateClientNotesSchema = z.object({
  notes: z.string().min(1, "Notes must be a valid string").optional().nullable().or(z.literal("")),
});

export const updateClientStateSchema = z.object({
  state: z.string().min(1, "State is required"),
});
