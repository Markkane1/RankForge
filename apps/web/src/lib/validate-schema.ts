import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Shared Zod Validator Middleware for API Route Handlers.
 * Ensures payloads conform to OWASP strict schemas before executing business logic.
 */
export async function validateSchema<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { response: NextResponse }> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      return {
        response: NextResponse.json(
          { error: "Malformed payload", details: parsed.error.format() },
          { status: 400 }
        )
      };
    }
    
    return { data: parsed.data };
  } catch (err) {
    return {
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    };
  }
}
