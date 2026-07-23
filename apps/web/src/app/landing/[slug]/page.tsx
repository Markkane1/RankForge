import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LandingConversionElements } from "@/components/landing/landing-conversion-elements";

type LandingPageProps = {
  params: Promise<{ slug: string }>;
};

function phoneToHref(phone: string | null | undefined) {
  if (!phone) return null;
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

function whatsappToHref(phone: string | null | undefined) {
  if (!phone) return null;
  const normalized = phone.replace(/\D/g, "");
  return normalized ? `https://wa.me/${normalized}` : null;
}

export default async function HostedLandingPage({ params }: LandingPageProps) {
  const { slug } = await params;
  const client = await db.client.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      businessName: true,
      phone: true,
      website: true,
      city: true,
      state: true,
      address: true,
      gbpProfiles: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          primaryCategory: true,
          description: true,
          phone: true,
          websiteUrl: true,
          bookingUrl: true,
          address: true,
        },
      },
    },
  });

  if (!client) notFound();

  const profile = client.gbpProfiles[0];
  const phone = profile?.phone ?? client.phone;
  const websiteHref = profile?.websiteUrl ?? client.website ?? null;
  const bookingHref = profile?.bookingUrl ?? null;
  const phoneHref = phoneToHref(phone);
  const whatsappHref = whatsappToHref(phone);
  const businessName = client.businessName ?? client.name;
  const category = profile?.primaryCategory ?? "Local service";
  const serviceArea = [client.city, client.state].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-8">
        <div className="space-y-7">
          <Image
            src="/logo.svg"
            alt="RankForge"
            width={150}
            height={32}
            priority
          />
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {category}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
              {businessName}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700">
              {profile?.description ??
                `Request service from ${businessName}${serviceArea ? ` in ${serviceArea}` : ""}.`}
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {serviceArea && (
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-950">Service area</p>
                <p>{serviceArea}</p>
              </div>
            )}
            {(profile?.address ?? client.address) && (
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-950">Location</p>
                <p>{profile?.address ?? client.address}</p>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Start here</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose a contact option or send a quote request.
          </p>
          <div className="mt-5">
            <LandingConversionElements
              clientId={client.id}
              phoneHref={phoneHref}
              whatsappHref={whatsappHref}
              bookingHref={bookingHref}
              websiteHref={websiteHref}
            />
          </div>
        </aside>
      </section>
    </main>
  );
}
