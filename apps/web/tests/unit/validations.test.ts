import { describe, it, expect } from "vitest";
import {
  containsListedName,
  createClientSchema,
  createTaskSchema,
  gbpProductSchema,
  gbpServiceSchema,
  hasKeywordStuffedBusinessName,
  isSafeExternalUrl,
  safeUrlSchema,
} from "../../src/lib/validations";

describe("Zod Validations & SSRF Prevention (REQ-03, REQ-06)", () => {
  describe("SSRF Protection (isSafeExternalUrl)", () => {
    it("should reject local/private IP addresses", () => {
      expect(isSafeExternalUrl("http://127.0.0.1/admin")).toBe(false);
      expect(isSafeExternalUrl("http://localhost:3000")).toBe(false);
      expect(isSafeExternalUrl("http://169.254.169.254/latest/meta-data")).toBe(
        false,
      ); // AWS Metadata
      expect(isSafeExternalUrl("http://192.168.1.1/router")).toBe(false);
      expect(isSafeExternalUrl("http://10.0.0.5")).toBe(false);
    });

    it("should allow valid public URLs", () => {
      expect(isSafeExternalUrl("https://google.com")).toBe(true);
      expect(isSafeExternalUrl("https://api.github.com/users")).toBe(true);
      expect(isSafeExternalUrl("http://some-startup.io")).toBe(true);
    });

    it("should allow empty/null values if permitted by schema context", () => {
      expect(isSafeExternalUrl(null)).toBe(true);
      expect(isSafeExternalUrl(undefined)).toBe(true);
      expect(isSafeExternalUrl("")).toBe(true);
    });

    it("should fail on invalid URL formats", () => {
      expect(isSafeExternalUrl("not-a-url")).toBe(false);
    });
  });

  describe("Zod Schemas", () => {
    it("safeUrlSchema should validate through Zod pipeline", () => {
      expect(safeUrlSchema.safeParse("https://google.com").success).toBe(true);
      expect(safeUrlSchema.safeParse("http://127.0.0.1").success).toBe(false);
      expect(safeUrlSchema.safeParse("not-a-url").success).toBe(false);
    });

    it("createTaskSchema should validate TaskStatus constraints (REQ-03)", () => {
      const validPayload = {
        title: "Fix the thing",
        module: "M1",
        status: "DONE",
      };

      const parsed = createTaskSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);

      const invalidPayload = {
        ...validPayload,
        status: "INVALID_STATUS",
      };

      const invalidParsed = createTaskSchema.safeParse(invalidPayload);
      expect(invalidParsed.success).toBe(false);
      if (!invalidParsed.success) {
        expect(invalidParsed.error.issues[0].path).toContain("status");
      }
    });

    it("createClientSchema requires structured intake fields and keeps SAB address validation (REQ-M1-02)", () => {
      const validPayload = {
        name: "Acme Plumbing",
        legalName: "Acme Plumbing LLC",
        serviceList: "Emergency plumbing, Drain cleaning",
        existingGbpLoginDetails: "Owner controls GBP and will invite agency",
        pastSuspensions: "NO",
        photoAvailability: "Exterior and team photos available",
        usps: "Licensed, same-day emergency service",
        bookingSystem: "Phone and website form",
        businessHours: "Mon-Fri 8-6",
        serviceAreas: [{ name: "Austin", city: "Austin", isPrimary: true }],
      };

      expect(createClientSchema.safeParse(validPayload).success).toBe(true);

      const missingIntake = createClientSchema.safeParse({
        ...validPayload,
        legalName: "",
      });
      expect(missingIntake.success).toBe(false);

      const missingSabCoverage = createClientSchema.safeParse({
        ...validPayload,
        serviceAreas: [],
      });
      expect(missingSabCoverage.success).toBe(false);
    });

    it("GBP service descriptions must fit Google limits", () => {
      expect(
        gbpServiceSchema.safeParse({
          name: "Emergency plumbing",
          description: "a".repeat(300),
        }).success,
      ).toBe(true);

      expect(
        gbpServiceSchema.safeParse({
          name: "Emergency plumbing",
          description: "a".repeat(301),
        }).success,
      ).toBe(false);
    });

    it("GBP products must be linked to a service category", () => {
      expect(
        gbpProductSchema.safeParse({
          name: "Drain inspection",
          category: "Plumbing",
          url: "https://example.com/drain-inspection",
        }).success,
      ).toBe(true);

      expect(
        gbpProductSchema.safeParse({
          name: "Drain inspection",
          url: "https://example.com/drain-inspection",
        }).success,
      ).toBe(false);
    });

    it("business and competitor name linters catch prohibited names", () => {
      expect(
        hasKeywordStuffedBusinessName("Acme Plumbing near Austin", "Acme LLC"),
      ).toBe(true);
      expect(hasKeywordStuffedBusinessName("Acme LLC", "Acme LLC")).toBe(false);
      expect(
        containsListedName("Trusted repairs, unlike Rival Roofing.", [
          "Rival Roofing",
        ]),
      ).toBe(true);
    });
  });
});
