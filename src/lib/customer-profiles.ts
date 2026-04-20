import { supabase } from "@/lib/supabase";

interface UpsertCustomerProfileInput {
  email: string;
  shopifyCustomerId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  marketingState?: string | null;
  birthday?: Date | null;
  birthdaySource?: string | null;
  membersAccessGrantedAt?: Date | null;
  vipTier?: string | null;
  orderCount?: number;
  totalSpent?: number;
  lastOrderAt?: Date | null;
}

export interface CustomerProfileRow {
  id: string;
  email: string;
  shopifyCustomerId: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  marketingState: string | null;
  birthday: string | null;
  birthdaySource: string | null;
  membersAccessGrantedAt: string | null;
  vipTier: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

function serialize(input: UpsertCustomerProfileInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (input.shopifyCustomerId !== undefined) fields.shopifyCustomerId = input.shopifyCustomerId || null;
  if (input.firstName !== undefined) fields.firstName = input.firstName || null;
  if (input.lastName !== undefined) fields.lastName = input.lastName || null;
  if (input.phone !== undefined) fields.phone = input.phone || null;
  if (input.marketingState !== undefined) fields.marketingState = input.marketingState || null;
  if (input.birthday !== undefined) fields.birthday = input.birthday ? input.birthday.toISOString() : null;
  if (input.birthdaySource !== undefined) fields.birthdaySource = input.birthdaySource || null;
  if (input.membersAccessGrantedAt !== undefined) fields.membersAccessGrantedAt = input.membersAccessGrantedAt ? input.membersAccessGrantedAt.toISOString() : null;
  if (input.vipTier !== undefined) fields.vipTier = input.vipTier || null;
  if (input.orderCount !== undefined) fields.orderCount = input.orderCount;
  if (input.totalSpent !== undefined) fields.totalSpent = input.totalSpent;
  if (input.lastOrderAt !== undefined) fields.lastOrderAt = input.lastOrderAt ? input.lastOrderAt.toISOString() : null;

  return fields;
}

export async function upsertCustomerProfile(
  input: UpsertCustomerProfileInput
): Promise<CustomerProfileRow> {
  const fields = serialize(input);

  const { data: existing, error: findError } = await supabase
    .from("CustomerProfile")
    .select("*")
    .eq("email", input.email)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { data, error } = await supabase
      .from("CustomerProfile")
      .update({ ...fields, updatedAt: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return data as CustomerProfileRow;
  }

  const { data, error } = await supabase
    .from("CustomerProfile")
    .insert({ email: input.email, ...fields })
    .select("*")
    .single();

  if (error) throw error;
  return data as CustomerProfileRow;
}
