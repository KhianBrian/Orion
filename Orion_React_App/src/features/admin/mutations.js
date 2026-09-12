import { supabase } from "../../lib/supabase";

export async function provisionPsychiatrist({ email, fullName, displayName, bio }) {
  const { data, error } = await supabase.functions.invoke("provision-psychiatrist", {
    body: { email, fullName, displayName, bio: bio || null },
  });
  if (error) throw error;
  return data;
}
