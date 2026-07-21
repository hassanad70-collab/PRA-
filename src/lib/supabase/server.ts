import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getRequiredEnv } from "@/lib/env";

/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * Must be created fresh per-request (relies on the request's cookie store).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component with no write access — safe to
            // ignore because middleware refreshes the session on every request.
          }
        },
      },
    }
  );
}
