import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireRole('OWNER', 'COORDINATOR', 'VIEWER', 'APPROVER');
  if (!auth.ok) return auth.response;

  try {
    const categories = await db.gbpCategory.findMany({
      orderBy: { name: 'asc' }
    });

    // Group categories by their 'group' field
    const taxonomy: Record<string, string[]> = {};

    for (const cat of categories) {
      const group = cat.group || "Uncategorized";
      if (!taxonomy[group]) {
        taxonomy[group] = [];
      }
      taxonomy[group].push(cat.name);
    }

    // Fallback if DB is completely empty (i.e. sync worker hasn't run yet)
    if (categories.length === 0) {
      return NextResponse.json({
        "Home Services": ["Plumber", "Electrician", "HVAC Contractor", "Roofing Contractor", "Landscaper", "Pest Control"],
        "Legal": ["Personal Injury Lawyer", "Criminal Justice Attorney", "Family Law Attorney", "Immigration Attorney"],
        "Health & Medical": ["Dentist", "Chiropractor", "Dermatologist", "Pediatrician", "Optometrist"],
        "Automotive": ["Auto Repair Shop", "Car Dealer", "Auto Body Shop", "Tire Shop"],
        "Food & Dining": ["Restaurant", "Cafe", "Bakery", "Bar"]
      });
    }

    return NextResponse.json(taxonomy);
  } catch (error) {
    console.error("GBP Categories GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GBP categories" },
      { status: 500 }
    );
  }
}
