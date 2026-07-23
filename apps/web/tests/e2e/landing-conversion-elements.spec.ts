import { expect, test } from "@playwright/test";

type ConversionPayload = {
  clientId: string;
  source: string;
  contactInfo?: string | null;
  metadata?: Record<string, unknown>;
};

test.describe("Hosted landing page conversion elements", () => {
  test("tracks call, WhatsApp, quote form, booking, and website interactions", async ({
    page,
  }) => {
    const events: ConversionPayload[] = [];

    await page.route("**/api/events/conversion/browser", async (route) => {
      events.push(route.request().postDataJSON() as ConversionPayload);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: `lead-${events.length}`,
          source: events.at(-1)?.source,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto("http://localhost:3000/landing/sparkleclean-pro");
    await expect(page.getByTestId("landing-quote-form")).toBeVisible();

    await page.getByTestId("landing-call").dispatchEvent("click");
    await page.getByTestId("landing-whatsapp").dispatchEvent("click");
    await page.getByTestId("landing-booking").dispatchEvent("click");
    await page.getByTestId("landing-website").dispatchEvent("click");
    await page
      .getByTestId("landing-quote-form")
      .locator('input[name="contactInfo"]')
      .fill("lead@example.com");
    await page
      .getByTestId("landing-quote-form")
      .locator('input[name="service"]')
      .fill("Deep clean");
    await page.getByTestId("landing-quote-submit").click();

    await expect
      .poll(() => events.map((event) => event.source))
      .toEqual([
        "PHONE_CALL",
        "WHATSAPP",
        "BOOKING",
        "GBP_WEBSITE",
        "FORM_SUBMISSION",
      ]);
    expect(events[4]).toMatchObject({
      source: "FORM_SUBMISSION",
      contactInfo: "lead@example.com",
      metadata: {
        form: "hosted-landing-page-quote",
        service: "Deep clean",
      },
    });
  });
});
