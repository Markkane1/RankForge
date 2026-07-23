import type { ConversionEventSource } from "@/lib/conversion-events";

type PageConversionSource = Extract<
  ConversionEventSource,
  "PHONE_CALL" | "WHATSAPP" | "FORM_SUBMISSION" | "BOOKING" | "GBP_WEBSITE"
>;

type PageConversionEvent = {
  clientId: string;
  source: PageConversionSource;
  value?: number | null;
  contactInfo?: string | null;
  metadata?: Record<string, unknown>;
};

const BROWSER_CONVERSION_ENDPOINT = "/api/events/conversion/browser";

export function trackPageConversionEvent(event: PageConversionEvent) {
  const payload = JSON.stringify(event);

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(BROWSER_CONVERSION_ENDPOINT, blob);
    return;
  }

  void fetch(BROWSER_CONVERSION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

export function trackClickToCall(clientId: string, phoneHref: string) {
  trackPageConversionEvent({ clientId, source: "PHONE_CALL", metadata: { href: phoneHref } });
}

export function trackWhatsAppClick(clientId: string, whatsappHref: string) {
  trackPageConversionEvent({ clientId, source: "WHATSAPP", metadata: { href: whatsappHref } });
}

export function trackBookingClick(clientId: string, bookingHref: string) {
  trackPageConversionEvent({ clientId, source: "BOOKING", metadata: { href: bookingHref } });
}

export function trackWebsiteClick(clientId: string, websiteHref: string) {
  trackPageConversionEvent({ clientId, source: "GBP_WEBSITE", metadata: { href: websiteHref } });
}

export function trackQuoteFormSubmission(
  clientId: string,
  form: { value?: number | null; contactInfo?: string | null; metadata?: Record<string, unknown> } = {},
) {
  trackPageConversionEvent({ clientId, source: "FORM_SUBMISSION", ...form });
}
