export type ConversionEventSource =
  | "GBP_CALL"
  | "GBP_DIRECTIONS"
  | "GBP_WEBSITE"
  | "FORM_SUBMISSION"
  | "BOOKING"
  | "PHONE_CALL"
  | "WHATSAPP";

export async function trackConversionEvent(
  event: {
    clientId: string;
    source: ConversionEventSource;
    value?: number | null;
    contactInfo?: string | null;
    metadata?: Record<string, unknown>;
  },
  secret: string,
) {
  const response = await fetch("/api/events/conversion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rankforge-event-secret": secret,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error(`Conversion event failed: ${response.status}`);
  return response.json();
}
