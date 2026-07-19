import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import React from "react";

export const metadata = {
  title: "Client Portal - SEO Delivery Platform",
  description: "View your campaign tasks, performance diagnostics, and monthly reports.",
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const portalSession = cookieStore.get("portal-session")?.value;

  if (!portalSession) {
    redirect("/login");
  }

  let sessionData;
  try {
    const decrypted = await decryptSecret(portalSession);
    sessionData = JSON.parse(decrypted);
  } catch (e) {
    redirect("/login");
  }

  if (!sessionData || sessionData.exp <= Date.now()) {
    redirect("/login");
  }

  // Fetch client details
  const client = await db.client.findUnique({
    where: { id: sessionData.clientId },
    select: {
      id: true,
      name: true,
      businessName: true,
      lifecycleState: true,
    },
  });

  if (!client) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4 max-w-5xl mx-auto">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">RankForge Portal</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm font-semibold">{client.businessName || client.name}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
              Campaign: {client.lifecycleState}
            </span>
            <a
              href="/api/auth/portal-logout"
              className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium"
            >
              Sign Out
            </a>
          </div>
        </div>
      </header>
      <main className="flex-1 container px-4 py-8 max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  );
}
