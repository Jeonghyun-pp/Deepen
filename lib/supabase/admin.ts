import { createClient } from "@supabase/supabase-js"

// service_role 키를 쓰므로 RLS를 우회한다. 서버 전용.
// 절대 클라이언트 컴포넌트에서 import 금지.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
