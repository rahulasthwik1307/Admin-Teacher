import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // If accessing teacher portal, verify teacher is active
  if (path.startsWith("/teacher")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: teacherRecord } = await supabase
      .from("teachers")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();

    // Teacher record exists and is disabled — sign out and redirect to login with error
    if (teacherRecord && teacherRecord.is_active === false) {
      // Clear the session by redirecting to a signout endpoint
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "disabled");
      const response = NextResponse.redirect(redirectUrl);
      // Clear auth cookies so the session is invalidated
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.includes("sb-") || cookie.name.includes("supabase")) {
          response.cookies.delete(cookie.name);
        }
      });
      return response;
    }
  }

  // If accessing admin portal, verify user is admin
  if (path.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!userRecord || userRecord.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return supabaseResponse;
}
