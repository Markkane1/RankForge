import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Ping DB
    await db.$executeRawUnsafe("SELECT 1");

    return NextResponse.json({
      status: "UP",
      timestamp: new Date().toISOString(),
      database: "CONNECTED",
      service: "web-portal",
    });
  } catch (error) {
    console.error("Health check failure:", error);
    return NextResponse.json(
      {
        status: "DOWN",
        timestamp: new Date().toISOString(),
        database: "DISCONNECTED",
        error: String(error),
      },
      { status: 500 }
    );
  }
}
