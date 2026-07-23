"use client";

import { FormEvent, useState } from "react";
import {
  trackBookingClick,
  trackClickToCall,
  trackQuoteFormSubmission,
  trackWebsiteClick,
  trackWhatsAppClick,
} from "@/lib/conversion-elements";

type LandingConversionElementsProps = {
  clientId: string;
  phoneHref: string | null;
  whatsappHref: string | null;
  bookingHref: string | null;
  websiteHref: string | null;
};

export function LandingConversionElements({
  clientId,
  phoneHref,
  whatsappHref,
  bookingHref,
  websiteHref,
}: LandingConversionElementsProps) {
  const [submitted, setSubmitted] = useState(false);

  function handleQuoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const contactInfo = String(formData.get("contactInfo") ?? "").trim();
    const service = String(formData.get("service") ?? "").trim();

    trackQuoteFormSubmission(clientId, {
      contactInfo: contactInfo || null,
      metadata: {
        service,
        form: "hosted-landing-page-quote",
      },
    });
    setSubmitted(true);
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {phoneHref && (
          <a
            data-testid="landing-call"
            href={phoneHref}
            onClick={() => trackClickToCall(clientId, phoneHref)}
            className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Call now
          </a>
        )}
        {whatsappHref && (
          <a
            data-testid="landing-whatsapp"
            href={whatsappHref}
            onClick={() => trackWhatsAppClick(clientId, whatsappHref)}
            className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-600 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            WhatsApp
          </a>
        )}
        {bookingHref && (
          <a
            data-testid="landing-booking"
            href={bookingHref}
            onClick={() => trackBookingClick(clientId, bookingHref)}
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            Book online
          </a>
        )}
        {websiteHref && (
          <a
            data-testid="landing-website"
            href={websiteHref}
            onClick={() => trackWebsiteClick(clientId, websiteHref)}
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            Visit website
          </a>
        )}
      </div>

      <form
        data-testid="landing-quote-form"
        onSubmit={handleQuoteSubmit}
        className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Contact
          <input
            name="contactInfo"
            required
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
            placeholder="Phone or email"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Service needed
          <input
            name="service"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
            placeholder="What should we help with?"
          />
        </label>
        <button
          data-testid="landing-quote-submit"
          type="submit"
          className="h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Request quote
        </button>
        {submitted && (
          <p className="text-sm font-medium text-emerald-700">
            Quote request received.
          </p>
        )}
      </form>
    </div>
  );
}
