import { supabase } from "@/lib/supabase";

interface ResolvedTemplate {
  subject: string;
  html: string;
}

export async function getTemplate(
  slug: string,
  variables?: Record<string, string>
): Promise<ResolvedTemplate> {
  const { data, error } = await supabase
    .from("EmailTemplate")
    .select("subject, htmlBody")
    .eq("slug", slug)
    .eq("isActive", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Email template not found: ${slug}`);

  let html = data.htmlBody as string;
  let subject = data.subject as string;

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      html = html.replaceAll(placeholder, value);
      subject = subject.replaceAll(placeholder, value);
    }
  }

  return { subject, html };
}
