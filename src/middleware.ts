import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "kelasbit_session";

const routes = [
  { path: "/siswa", role: "siswa", loginPath: "/login/siswa" },
  { path: "/guru", role: "guru", loginPath: "/login/guru" },
];

const loginRoutes = ["/login", "/login/siswa", "/login/guru"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const route = routes.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  if (route) {
    if (!hasSession) {
      return NextResponse.redirect(new URL(route.loginPath, request.url));
    }

    const role = request.cookies.get("kelasbit_role")?.value;
    if (role && role !== route.role) {
      return NextResponse.redirect(new URL("/sesi", request.url));
    }

    return NextResponse.next();
  }

  if (loginRoutes.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/sesi", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/siswa/:path*", "/guru/:path*", "/login", "/login/siswa", "/login/guru"],
};
