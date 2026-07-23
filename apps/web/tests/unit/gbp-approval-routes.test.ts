import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireClientRole: vi.fn(),
  requireOwner: vi.fn(),
  withClientTenant: vi.fn(),
  requireApproval: vi.fn(),
  findProfile: vi.fn(),
  updateProfile: vi.fn(),
  createChangeLog: vi.fn(),
  findClient: vi.fn(),
  findCompetitors: vi.fn(),
}));

vi.mock("../../src/lib/auth-guard", () => ({
  requireClientRole: mocks.requireClientRole,
  requireOwner: mocks.requireOwner,
}));

vi.mock("../../src/lib/db", () => ({
  withClientTenant: mocks.withClientTenant,
}));

vi.mock("../../src/lib/approval-guard", () => ({
  requireApproval: mocks.requireApproval,
}));

vi.mock("googleapis", () => ({
  google: { auth: { OAuth2: vi.fn() }, mybusinessverifications: vi.fn() },
}));
vi.mock("../../src/lib/crypto", () => ({ decryptSecret: vi.fn() }));

import { PATCH } from "../../src/app/api/clients/[id]/gbp/[gbpId]/route";
import { POST as postVerification } from "../../src/app/api/clients/[id]/gbp/[gbpId]/verification/route";

const params = { params: Promise.resolve({ id: "client-1", gbpId: "gbp-1" }) };

describe("GBP approval-gated routes", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    vi.unstubAllGlobals();
    mocks.requireClientRole.mockResolvedValue({
      ok: true,
      user: { id: "user-1", role: "OWNER" },
    });
    mocks.requireOwner.mockResolvedValue({
      ok: true,
      user: { id: "owner-1", role: "OWNER" },
    });
    mocks.requireApproval.mockResolvedValue({ id: "approval-1" });
    mocks.findProfile.mockResolvedValue({
      id: "gbp-1",
      clientId: "client-1",
      isVerified: false,
      primaryCategory: "Plumber",
      bookingUrl: null,
    });
    mocks.updateProfile.mockResolvedValue({ id: "gbp-1", reviews: [] });
    mocks.createChangeLog.mockResolvedValue({ id: "log-1" });
    mocks.findClient.mockResolvedValue({
      id: "client-1",
      gbpProfiles: [
        { id: "gbp-1", gbpAccountId: "acct-1", gbpLocationId: "loc-1" },
      ],
    });
    mocks.findCompetitors.mockResolvedValue([]);
    mocks.withClientTenant.mockImplementation(
      (_clientId: string, fn: (db: unknown) => unknown) =>
        fn({
          gbpProfile: {
            findUnique: mocks.findProfile,
            update: mocks.updateProfile,
          },
          competitorBenchmark: {
            findMany: mocks.findCompetitors,
          },
          client: {
            findUnique: mocks.findClient,
          },
          approvalRequest: {
            create: vi.fn(),
          },
          changeLogEntry: {
            create: mocks.createChangeLog,
          },
        }),
    );
  });

  it("routes GBP verification status changes to approval instead of updating directly", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/clients/client-1/gbp/gbp-1", {
        method: "PATCH",
        body: JSON.stringify({ isVerified: true }),
      }),
      params,
    );

    expect(response.status).toBe(202);
    expect(mocks.requireApproval).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: "client-1",
        requestType: "GBP_VERIFICATION",
        requestData: { gbpId: "gbp-1", isVerified: true },
        requestedById: "user-1",
      }),
    );
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("routes primary category changes to approval instead of updating directly", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/clients/client-1/gbp/gbp-1", {
        method: "PATCH",
        body: JSON.stringify({ primaryCategory: "Emergency Plumber" }),
      }),
      params,
    );

    expect(response.status).toBe(202);
    expect(mocks.requireApproval).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: "client-1",
        requestType: "CATEGORY_CHANGE",
        requestData: { gbpId: "gbp-1", primaryCategory: "Emergency Plumber" },
        requestedById: "user-1",
      }),
    );
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("routes verification wizard POST actions to approval without Google API calls", async () => {
    const response = await postVerification(
      new Request(
        "http://localhost/api/clients/client-1/gbp/gbp-1/verification",
        {
          method: "POST",
          body: JSON.stringify({ method: "SMS", phoneNumber: "+15550100" }),
        },
      ),
      params,
    );

    expect(response.status).toBe(202);
    expect(mocks.requireApproval).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: "client-1",
        requestType: "GBP_VERIFICATION",
        requestData: {
          gbpId: "gbp-1",
          method: "SMS",
          phoneNumber: "+15550100",
          verificationId: null,
        },
        requestedById: "user-1",
      }),
    );
  });

  it("returns a booking URL warning before saving unreachable links", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const response = await PATCH(
      new Request("http://localhost/api/clients/client-1/gbp/gbp-1", {
        method: "PATCH",
        body: JSON.stringify({ bookingUrl: "https://booking.example.com" }),
      }),
      params,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: "BOOKING_URL_UNREACHABLE",
      requiresOverrideNote: true,
      warning: { details: "URL returned status 503" },
    });
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("saves unreachable booking URLs with an override note and audit log", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    mocks.updateProfile.mockResolvedValue({
      id: "gbp-1",
      reviews: [],
      bookingUrl: "https://booking.example.com",
      bookingUrlOverrideNote: "Vendor maintenance window confirmed.",
    });

    const response = await PATCH(
      new Request("http://localhost/api/clients/client-1/gbp/gbp-1", {
        method: "PATCH",
        body: JSON.stringify({
          bookingUrl: "https://booking.example.com",
          bookingUrlOverrideNote: "Vendor maintenance window confirmed.",
        }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      warnings: [{ code: "BOOKING_URL_UNREACHABLE" }],
    });
    expect(mocks.updateProfile).toHaveBeenCalled();
    expect(mocks.createChangeLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        field: "booking_url_reachability_override",
        oldValue: "URL returned status 503",
        newValue: "Vendor maintenance window confirmed.",
      }),
    });
  });
});
