import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_PRICES: Record<string, { title: string; price: number; downloads: number }> = {
  starter: { title: "CriaHub Starter", price: 24.9, downloads: 10 },
  pro: { title: "CriaHub Pro", price: 34.9, downloads: 17 },
  master: { title: "CriaHub Master", price: 59.9, downloads: 27 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email;

    const { plan } = await req.json();
    const planConfig = PLAN_PRICES[plan];
    if (!planConfig) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`;
    const origin = req.headers.get("origin") || "https://criahub.com";

    // Create recurring subscription via Preapproval API
    const preapprovalBody = {
      reason: planConfig.title,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: planConfig.price,
        currency_id: "BRL",
      },
      payer_email: userEmail,
      back_url: `${origin}/dashboard?payment=success`,
      external_reference: JSON.stringify({ user_id: userId, plan }),
      notification_url: webhookUrl,
      status: "pending",
    };

    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preapprovalBody),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error("Mercado Pago preapproval error:", errorData);
      return new Response(JSON.stringify({ error: "Erro ao criar assinatura" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preapproval = await mpResponse.json();
    console.log("Preapproval created:", preapproval.id);

    // Save preapproval reference in payments table
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient.from("payments").insert({
      user_id: userId,
      mercadopago_preference_id: preapproval.id,
      amount: planConfig.price,
      plan: plan,
      status: "pending",
    });

    return new Response(
      JSON.stringify({
        init_point: preapproval.init_point,
        sandbox_init_point: preapproval.sandbox_init_point,
        preference_id: preapproval.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
