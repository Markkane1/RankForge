import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireClientRole: vi.fn(),
  requireRole: vi.fn(),
  withClientTenant: vi.fn(),
  requireApproval: vi.fn(),
  findClient: vi.fn(),
  updateClient: vi.fn(),
  createChangeLog: vi.fn(),
}));

vi.mock("../../src/lib/auth-guard", () => ({
  requireClientRole: mocks.requireClientRole,
  requireRole: mocks.requireRole,
}));

vi.mock("../../src/lib/db", () => ({
  db: {},
  withClientTenant: mocks.withClientTenant,
}));

vi.mock("../../src/lib/approval-guard", () => ({
  requireApproval: mocks.requireApproval,
}));

vi.mock("../../src/lib/integrations/brightlocal", () => ({
  BrightLocalClient: vi.fn(),
}));

import { PATCH } from "../../src/app/api/clients/[id]/route";

const params = { params: Promise.resolve({ id: "client-1" }) };

describe("client profile approval gate route", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.requireClientRole.mockResolvedValue({
      ok: true,
      user: { id: "user-1", role: "OWNER" },
    });
    mocks.requireApproval.mockResolvedValue({ id: "approval-1" });
    mocks.findClient.mockResolvedValue({
      id: "client-1",
      name: "Acme Plumbing",
      businessName: "Acme Plumbing",
      phone: "555-0100",
      email: "old@example.com",
      website: "https://old.example",
      address: "1 Main St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
    });
    mocks.updateClient.mockResolvedValue({ id: "client-1", phone: "555-0101" });
    mocks.createChangeLog.mockResolvedValue({ id: "log-1" });
    mocks.withClientTenant.mockImplementation(
      (_clientId: string, fn: (db: unknown) => unknown) =>
        fn({
          client: {
            findUnique: mocks.findClient,
            update: mocks.updateClient,
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

  it("routes business identity changes to approval instead of updating directly", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/clients/client-1", {
        method: "PATCH",
        body: JSON.stringify({
          businessName: "Acme Plumbing LLC",
          address: "2 Main St",
        }),
      }),
      params,
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      message: "Sensitive mutation intercepted. Approval request created.",
    });
    expect(mocks.requireApproval).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: "client-1",
        requestType: "CLIENT_PROFILE_CHANGE",
        requestData: {
          businessName: "Acme Plumbing LLC",
          address: "2 Main St",
        },
        requestedById: "user-1",
      }),
    );
    expect(mocks.updateClient).not.toHaveBeenCalled();
  });

  it("allows non-sensitive contact updates without approval", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/clients/client-1", {
        method: "PATCH",
        body: JSON.stringify({ phone: "555-0101" }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(mocks.requireApproval).not.toHaveBeenCalled();
    expect(mocks.updateClient).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client-1" },
        data: { phone: "555-0101" },
      }),
    );
  });
});
