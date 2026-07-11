import { createServerFn } from "@tanstack/react-start";

export const DEMO_EMAIL = "demo@cognita.io";
export const DEMO_PASSWORD = "CognitaDemo2026!";

/**
 * Idempotently provisions the shared demo CISO account plus its profile and
 * user_roles rows. Safe to call from unauthenticated clients — it only ever
 * touches this single hardcoded identity.
 */
export const ensureDemoUser = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ email: string; password: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up any existing user with the demo email. listUsers is paginated;
    // page 1 with a generous perPage is enough for a demo instance.
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);

    let user = list?.users?.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);

    if (!user) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: {
            display_name: "Demo CISO",
            department: "Global Governance",
            role: "ciso",
          },
        });
      if (createErr || !created?.user) {
        throw new Error(createErr?.message ?? "Failed to create demo user");
      }
      user = created.user;
    } else {
      // Make sure password matches the advertised one (in case it drifted).
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
    }

    // Upsert profile and CISO role. The auth.users trigger is not registered
    // in this instance, so we write these rows explicitly.
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: "Demo CISO",
          department: "Global Governance",
          trust_score: 95,
        },
        { onConflict: "id" },
      );
    if (profErr) throw new Error(profErr.message);

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: "ciso" },
        { onConflict: "user_id,role" },
      );
    if (roleErr) throw new Error(roleErr.message);

    return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
  },
);
