import { saveCustomerBirthday } from "@/lib/workflows/birthdays";

function parseBirthday(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || body["Email Address"] || "").trim();
  const birthdayRaw = String(body.birthday || body.Birthday || "").trim();
  const birthday = parseBirthday(birthdayRaw);

  if (!email || !birthday) {
    return Response.json(
      { error: "Valid email and birthday are required" },
      { status: 400 }
    );
  }

  await saveCustomerBirthday({
    email,
    firstName: body.firstName || body.first_name || body["First Name"] || null,
    lastName: body.lastName || body.last_name || body["Last Name"] || null,
    phone: body.phone || body["Phone Number"] || null,
    birthday,
    source: body.source || "birthday_form",
  });

  return Response.json({ success: true });
}
