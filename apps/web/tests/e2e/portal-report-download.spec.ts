import { expect, test } from "@playwright/test";
import { prisma } from "@rankforge/database";

import { encryptSecret } from "../../src/lib/crypto";

test("portal report download uses the encrypted portal-session client id", async ({
  context,
  page,
}) => {
  const report = await prisma.monthlyReport.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { clientId: true, month: true, year: true },
  });

  test.skip(
    !report,
    "Seeded monthly report required for portal download smoke.",
  );

  const token = await encryptSecret(
    JSON.stringify({
      userId: "portal-e2e-user",
      clientId: report.clientId,
      email: "client@example.com",
      exp: Date.now() + 15 * 60 * 1000,
    }),
  );

  await context.addCookies([
    {
      name: "portal-session",
      value: token,
      domain: "localhost",
      path: "/",
    },
  ]);

  const expectedPath = `/api/reports/monthly?clientId=${report.clientId}&month=${report.month}&year=${report.year}`;
  let downloadUrl = "";

  await context.route("**/api/reports/monthly?**", async (route) => {
    downloadUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: "%PDF-1.4\n% portal report smoke\n",
    });
  });

  await page.goto("http://localhost:3000/portal");
  const reportLink = page.locator(`a[href="${expectedPath}"]`);
  await expect(reportLink).toBeVisible();

  await reportLink.evaluate((node) => node.removeAttribute("target"));
  await reportLink.click();

  await expect.poll(() => downloadUrl).toContain(`clientId=${report.clientId}`);
  expect(downloadUrl).toContain(`month=${report.month}`);
  expect(downloadUrl).toContain(`year=${report.year}`);
});
