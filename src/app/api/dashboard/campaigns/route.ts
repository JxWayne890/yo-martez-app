import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("EmailTemplate")
    .select("id, slug, subject, htmlBody, isActive, updatedAt")
    .order("updatedAt", { ascending: false });

  if (error) {
    console.error("Campaigns GET error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  return Response.json({ templates: data || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { slug, subject, htmlBody, isActive } = body;

  if (!slug || !subject || !htmlBody) {
    return Response.json(
      { error: "slug, subject, and htmlBody are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("EmailTemplate")
    .insert({ slug, subject, htmlBody, isActive: isActive ?? true })
    .select("*")
    .single();

  if (error) {
    console.error("Campaigns POST error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  return Response.json({ template: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, slug, subject, htmlBody, isActive } = body;

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (slug) updates.slug = slug;
  if (subject) updates.subject = subject;
  if (htmlBody) updates.htmlBody = htmlBody;
  if (isActive !== undefined) updates.isActive = isActive;

  const { data, error } = await supabase
    .from("EmailTemplate")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Campaigns PUT error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  return Response.json({ template: data });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("EmailTemplate").delete().eq("id", id);

  if (error) {
    console.error("Campaigns DELETE error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  return Response.json({ success: true });
}
