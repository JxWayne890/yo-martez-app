import { supabase } from "@/lib/supabase";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    const { error } = await supabase
      .from("EmailTemplate")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    checks.database = error ? "error" : "ok";
  } catch {
    checks.database = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return Response.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
