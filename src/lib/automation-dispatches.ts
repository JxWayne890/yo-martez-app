import { supabase } from "@/lib/supabase";

interface DispatchLookup {
  automationKey: string;
  stageKey: string;
  entityType: string;
  entityId: string;
}

interface RecordDispatchInput extends DispatchLookup {
  customerEmail: string;
  customerName?: string | null;
  metadata?: Record<string, unknown>;
}

export async function hasAutomationDispatch(
  lookup: DispatchLookup
): Promise<boolean> {
  const { data, error } = await supabase
    .from("AutomationDispatch")
    .select("id")
    .eq("automationKey", lookup.automationKey)
    .eq("stageKey", lookup.stageKey)
    .eq("entityType", lookup.entityType)
    .eq("entityId", lookup.entityId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function recordAutomationDispatch(
  input: RecordDispatchInput
): Promise<void> {
  const { error } = await supabase.from("AutomationDispatch").insert({
    automationKey: input.automationKey,
    stageKey: input.stageKey,
    entityType: input.entityType,
    entityId: input.entityId,
    customerEmail: input.customerEmail,
    customerName: input.customerName || null,
    metadata: input.metadata || null,
  });

  if (error) throw error;
}
