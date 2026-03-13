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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

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

    // Get the project URL for callbacks
    const projectId = Deno.env.get("SUPABASE_URL")!.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`;

    // Create Mercado Pago preference
    const preferenceBody = {
      items: [
        {
          id: plan,
          title: planConfig.title,
          description: `Assinatura mensal - ${planConfig.downloads} downloads/mês`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: planConfig.price,
        },
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: `${req.headers.get("origin") || "https://criahub.com"}/dashboard?payment=success`,
        failure: `${req.headers.get("origin") || "https://criahub.com"}/planos?payment=failure`,
        pending: `${req.headers.get("origin") || "https://criahub.com"}/dashboard?payment=pending`,
      },
      auto_return: "approved",
      notification_url: webhookUrl,
      metadata: {
        user_id: userId,
        plan: plan,
      },
      payment_methods: {
        excluded_payment_types: [],
        installments: 1,
      },
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error("Mercado Pago error:", errorData);
      return new Response(JSON.stringify({ error: "Erro ao criar pagamento" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preference = await mpResponse.json();

    // Save payment record as pending
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient.from("payments").insert({
      user_id: userId,
      mercadopago_preference_id: preference.id,
      amount: planConfig.price,
      plan: plan,
      status: "pending",
    });

    return new Response(
      JSON.stringify({
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        preference_id: preference.id,
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
