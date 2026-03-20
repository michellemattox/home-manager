import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, name, token, householdId } = await req.json();

    if (!email || !token) {
      return new Response(JSON.stringify({ error: "email and token are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const redirectTo = `https://home-manager-michellemattoxs-projects.vercel.app/join?token=${token}`;

    // Check if a Supabase Auth user already exists for this email
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingAuthUser = userList?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    console.log("existingAuthUser:", existingAuthUser?.id ?? "none");

    if (existingAuthUser) {
      // User already has an account — generate a one-time magic link that lands them in the app
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });

      console.log("generateLink error:", linkError?.message ?? "none");
      console.log("generateLink data:", JSON.stringify(linkData));

      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const actionLink = (linkData as any)?.properties?.action_link ?? null;
      console.log("actionLink:", actionLink);

      return new Response(
        JSON.stringify({ success: true, existingUser: true, actionLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // New user — send Supabase invite email
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { display_name: name, household_id: householdId },
    });

    console.log("inviteError:", inviteError?.message ?? "none");

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.log("caught error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
