import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

function parseAttributes(attributesJson: string | null) {
  if (!attributesJson) return [];
  try {
    const parsed = JSON.parse(attributesJson);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const auth = await requireRole('OWNER', 'COORDINATOR', 'VIEWER', 'APPROVER');
  if (!auth.ok) return auth.response;

  try {
    const includeMeta = new URL(request.url).searchParams.get("includeMeta") === "1";
    const categories = await db.gbpCategory.findMany({
      orderBy: { name: 'asc' }
    });

    // Group categories by their 'group' field
    const taxonomy: Record<string, string[]> = {};
    const attributes: Record<string, string[]> = {};
    let lastSyncedAt: string | null = null;

    for (const cat of categories) {
      const group = cat.group || "Uncategorized";
      if (!taxonomy[group]) {
        taxonomy[group] = [];
      }
      taxonomy[group].push(cat.name);
      attributes[cat.name] = parseAttributes(cat.attributesJson);
      if (cat.lastSyncedAt && (!lastSyncedAt || cat.lastSyncedAt > new Date(lastSyncedAt))) {
        lastSyncedAt = cat.lastSyncedAt.toISOString();
      }
    }

    // Fallback if DB is completely empty (i.e. sync worker hasn't run yet)
    if (categories.length === 0) {
      const fallbackTaxonomy = {
        "Home Services": ["Plumber", "Electrician", "HVAC Contractor", "Roofing Contractor", "Landscaper", "Pest Control"],
        "Legal": ["Personal Injury Lawyer", "Criminal Justice Attorney", "Family Law Attorney", "Immigration Attorney"],
        "Health & Medical": ["Dentist", "Chiropractor", "Dermatologist", "Pediatrician", "Optometrist"],
        "Automotive": ["Auto Repair Shop", "Car Dealer", "Auto Body Shop", "Tire Shop"],
        "Food & Dining": ["Restaurant", "Cafe", "Bakery", "Bar"]
      };
      return NextResponse.json(includeMeta ? { taxonomy: fallbackTaxonomy, attributes: {}, lastSyncedAt: null } : fallbackTaxonomy);
    }

    return NextResponse.json(includeMeta ? { taxonomy, attributes, lastSyncedAt } : taxonomy);
  } catch (error) {
    console.error("GBP Categories GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GBP categories" },
      { status: 500 }
    );
  }
}
