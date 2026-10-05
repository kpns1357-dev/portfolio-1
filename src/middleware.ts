import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET =
  process.env.JWT_SECRET || "civicos_development_super_secure_jwt_access_secret_2026_key_!@#$";
const ACCESS_SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((o) => o.trim().toLowerCase());

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  departmentId?: string | null;
  teamId?: string | null;
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: (payload.role as string) || "CITIZEN",
      departmentId: (payload.departmentId as string) || null,
      teamId: (payload.teamId as string) || null,
    };
  } catch {
    return null;
  }
}

function verifyCsrf(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host")?.toLowerCase();

  if (!origin) {
    // If no origin, check referer
    const referer = req.headers.get("referer");
    if (!referer) {
      // In development or non-browser API client, allow if no cookie is being abused
      return true;
    }
    try {
      const refUrl = new URL(referer);
      const refHost = refUrl.host.toLowerCase();
      if (host && refHost === host) return true;
      return ALLOWED_ORIGINS.some((allowed) => {
        try {
          return new URL(allowed).host.toLowerCase() === refHost;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();
    if (host && originHost === host) return true;
    return ALLOWED_ORIGINS.some((allowed) => {
      try {
        return new URL(allowed).host.toLowerCase() === originHost;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function isSuperOrAdmin(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = crypto.randomUUID();

  // 1. Exclude public static assets and excluded API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico" ||
    pathname === "/api/health" ||
    pathname === "/api/ready" ||
    pathname.startsWith("/api/files")
  ) {
    return NextResponse.next();
  }

  // 2. CSRF Verification for state-changing requests
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (pathname.startsWith("/api/") && isStateChanging) {
    // Do not enforce CSRF on public auth endpoints
    const isPublicAuth =
      pathname === "/api/auth/login" ||
      pathname === "/api/auth/register" ||
      pathname === "/api/auth/refresh";

    if (!isPublicAuth && !verifyCsrf(req)) {
      console.warn(`[SECURITY_AUDIT] CSRF Violation on ${pathname} from origin ${req.headers.get("origin")}`);
      return NextResponse.json(
        {
          error: "CSRF check failed: Origin mismatch or unverified client.",
          code: "CSRF_VIOLATION",
          requestId,
        },
        { status: 403 }
      );
    }
  }

  // 3. Extract access token
  const cookieToken = req.cookies.get("auth_token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const token = cookieToken || bearerToken;

  const user = token ? await verifyToken(token) : null;

  // Clone headers and inject tracking
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  if (user) {
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-role", user.role);
    requestHeaders.set("x-user-email", user.email);
    if (user.departmentId) requestHeaders.set("x-user-department-id", user.departmentId);
    if (user.teamId) requestHeaders.set("x-user-team-id", user.teamId);
  }

  // 4. Handle Dashboard Routes
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // Role-Based Access Control for Dashboards
    if (pathname.startsWith("/dashboard/admin")) {
      if (!isSuperOrAdmin(user.role)) {
        return NextResponse.redirect(new URL("/dashboard/citizen", req.url));
      }
    } else if (pathname.startsWith("/dashboard/authority")) {
      if (!isSuperOrAdmin(user.role) && user.role !== "AUTHORITY") {
        return NextResponse.redirect(new URL("/dashboard/citizen", req.url));
      }
    } else if (pathname.startsWith("/dashboard/moderation")) {
      if (!isSuperOrAdmin(user.role) && user.role !== "MODERATOR") {
        return NextResponse.redirect(new URL("/dashboard/citizen", req.url));
      }
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 5. Handle API Routes
  if (pathname.startsWith("/api/")) {
    // Public API endpoints
    const isPublicApi =
      pathname === "/api/auth/login" ||
      pathname === "/api/auth/register" ||
      pathname === "/api/auth/refresh" ||
      pathname === "/api/health" ||
      pathname === "/api/ready" ||
      pathname === "/api/reports" ||
      pathname === "/api/ai/ask" ||
      (pathname === "/api/categories" && req.method === "GET") ||
      (pathname === "/api/departments" && req.method === "GET") ||
      (pathname === "/api/incidents" && req.method === "GET") ||
      (pathname.startsWith("/api/duplicates/check") && req.method === "POST");

    if (isPublicApi) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // Protected API Endpoints - Require Authentication
    if (!user) {
      console.warn(`[SECURITY_AUDIT] Unauthorized API access to ${pathname}`);
      return NextResponse.json(
        {
          error: "Authentication required to access this endpoint.",
          code: "UNAUTHORIZED",
          requestId,
        },
        { status: 401 }
      );
    }

    // RBAC for sensitive API routes
    if (
      pathname.startsWith("/api/admin") ||
      pathname === "/api/settings" ||
      pathname === "/api/audit"
    ) {
      if (!isSuperOrAdmin(user.role)) {
        console.warn(`[SECURITY_AUDIT] Forbidden access by ${user.id} (${user.role}) to ${pathname}`);
        return NextResponse.json(
          {
            error: "Forbidden: Super Administrator access required.",
            code: "FORBIDDEN",
            requestId,
          },
          { status: 403 }
        );
      }
    } else if (
      pathname.startsWith("/api/moderation") ||
      pathname === "/api/duplicates/merge"
    ) {
      if (!isSuperOrAdmin(user.role) && user.role !== "MODERATOR") {
        console.warn(`[SECURITY_AUDIT] Forbidden access by ${user.id} (${user.role}) to ${pathname}`);
        return NextResponse.json(
          {
            error: "Forbidden: Moderator privileges required.",
            code: "FORBIDDEN",
            requestId,
          },
          { status: 403 }
        );
      }
    } else if (
      pathname.includes("/assign") ||
      pathname.includes("/status")
    ) {
      if (!isSuperOrAdmin(user.role) && user.role !== "AUTHORITY") {
        console.warn(`[SECURITY_AUDIT] Forbidden access by ${user.id} (${user.role}) to ${pathname}`);
        return NextResponse.json(
          {
            error: "Forbidden: Authority privileges required.",
            code: "FORBIDDEN",
            requestId,
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
