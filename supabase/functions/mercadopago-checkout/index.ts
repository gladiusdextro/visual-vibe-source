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

const PLAN_LIMITS: Record<string, number> = {
  starter: 10,
  pro: 17,
  master: 27,
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

    const body = await req.json();
    const { plan, payment_type } = body;
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
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── PIX (Transparent Checkout) ──
    if (payment_type === "pix") {
      const paymentBody = {
        transaction_amount: planConfig.price,
        description: planConfig.title,
        payment_method_id: "pix",
        payer: { email: user.email },
        metadata: { user_id: user.id, plan },
        notification_url: webhookUrl,
      };

      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "X-Idempotency-Key": `${user.id}-${plan}-pix-${Date.now()}`,
        },
        body: JSON.stringify(paymentBody),
      });

      if (!mpResponse.ok) {
        const errorData = await mpResponse.text();
        console.error("MP PIX error:", errorData);
        return new Response(JSON.stringify({ error: "Erro ao criar pagamento PIX" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payment = await mpResponse.json();
      console.log("PIX payment created:", payment.id, payment.status);

      await adminClient.from("payments").insert({
        user_id: user.id,
        mercadopago_payment_id: String(payment.id),
        amount: planConfig.price,
        plan,
        status: payment.status,
        payment_method: "pix",
      });

      return new Response(
        JSON.stringify({
          payment_id: payment.id,
          status: payment.status,
          qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CARD (Transparent Checkout) ──
    if (payment_type === "card") {
      const { token, installments, issuer_id, payment_method_id, payer } = body;

      if (!token) {
        return new Response(JSON.stringify({ error: "Token do cartão é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentBody = {
        transaction_amount: planConfig.price,
        token,
        description: planConfig.title,
        installments: installments || 1,
        payment_method_id,
        issuer_id,
        payer: {
          email: user.email,
          identification: payer?.identification,
        },
        metadata: { user_id: user.id, plan },
        notification_url: webhookUrl,
      };

      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "X-Idempotency-Key": `${user.id}-${plan}-card-${Date.now()}`,
        },
        body: JSON.stringify(paymentBody),
      });

      if (!mpResponse.ok) {
        const errorData = await mpResponse.text();
        console.error("MP card error:", errorData);
        return new Response(JSON.stringify({ error: "Erro ao processar pagamento com cartão" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payment = await mpResponse.json();
      console.log("Card payment created:", payment.id, payment.status);

      await adminClient.from("payments").insert({
        user_id: user.id,
        mercadopago_payment_id: String(payment.id),
        amount: planConfig.price,
        plan,
        status: payment.status,
        payment_method: payment.payment_method_id || "card",
      });

      // If approved immediately, activate subscription
      if (payment.status === "approved") {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);

        const { data: existingSub } = await adminClient
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingSub) {
          await adminClient.from("subscriptions").update({
            plan,
            status: "active",
            downloads_used: 0,
            downloads_limit: PLAN_LIMITS[plan] || 10,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: now.toISOString(),
          }).eq("user_id", user.id);
        } else {
          await adminClient.from("subscriptions").insert({
            user_id: user.id,
            plan,
            status: "active",
            downloads_used: 0,
            downloads_limit: PLAN_LIMITS[plan] || 10,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          });
        }
        console.log(`Card subscription activated for ${user.id}, plan: ${plan}`);
      }

      return new Response(
        JSON.stringify({
          payment_id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Tipo de pagamento inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
