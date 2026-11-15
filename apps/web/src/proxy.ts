import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/login",
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/borrowers/:path*",
    "/facilities/:path*",
    "/covenants/:path*",
    "/analysis-runs/:path*",
    "/cases/:path*",
    "/approvals/:path*",
    "/audit/:path*",
    "/settings/:path*",
    "/integrations/:path*",
  ],
};
