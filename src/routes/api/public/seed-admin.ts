import { createFileRoute } from "@tanstack/react-router";

// One-time, idempotent admin seed endpoint. Public so it can be hit once
// without a session; it only ever creates the single fixed admin account
// configured for this project, so no payload is needed.
export const Route = createFileRoute("/api/public/seed-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "nokunato@gmail.com";
        const password = "Hppavilion1";

        // Find existing user
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listErr) return new Response(JSON.stringify({ ok: false, error: listErr.message }), { status: 500 });
        let user = list.users.find((u) => u.email?.toLowerCase() === email);
        if (!user) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
          user = data.user!;
        } else {
          // Ensure password matches and confirmed
          await supabaseAdmin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
        }
        // Ensure admin role
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
        if (roleErr) return new Response(JSON.stringify({ ok: false, error: roleErr.message }), { status: 500 });
        return new Response(JSON.stringify({ ok: true, userId: user.id }), {
          headers: { "content-type": "application/json" },
        });
      },
      GET: async () => new Response("Use POST to seed admin.", { status: 405 }),
    },
  },
});
