export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

export function getAdminAuthSetupError(): Response {
  return Response.json(
    {
      error:
        "Admin authentication is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.",
    },
    { status: 503 }
  );
}
