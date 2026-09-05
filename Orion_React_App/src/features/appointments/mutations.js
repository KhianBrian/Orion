import { supabase } from "../../lib/supabase";

export async function cancelAppointment({ appointmentId, idempotencyKey }) {
  const { error } = await supabase.functions.invoke("cancel-appointment", {
    body: { appointmentId, idempotencyKey },
  });

  if (error) throw error;
}

export async function appointmentErrorCode(error) {
  if (error?.context instanceof Response) {
    try {
      return (await error.context.json()).error;
    } catch {
      return undefined;
    }
  }

  return undefined;
}
