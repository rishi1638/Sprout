import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "@/lib/database.types";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  ece: "/dashboard/ece",
  parent: "/dashboard/parent",
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = ["/dashboard/admin", "/dashboard/ece", "/dashboard/parent"].some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!user) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  const role: UserRole = profile?.role ?? "parent";
  const home = ROLE_HOME[role];

  if (pathname === "/" || pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && pathname === "/register" && !request.nextUrl.searchParams.get("token")) {
    return response;
  }

  if (isProtected && !pathname.startsWith(home)) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/admin/:path*", "/dashboard/ece/:path*", "/dashboard/parent/:path*"],
};
