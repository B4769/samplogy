import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bwhwxnzrntyiqeimifes.supabase.co";
const supabaseAnonKey = "sb_publishable_kGRUMpfbImW-ez3tZSB63g_MJwMuJX5";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);