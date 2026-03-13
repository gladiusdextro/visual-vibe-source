import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      return new Response("Not configured", { status: 500 });
    }

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      // We only care about payment events
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response("No payment ID", { status: 200, headers: corsHeaders });
    }

    // Fetch payment details from Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpResponse.ok) {
      console.error("Failed to fetch payment:", await mpResponse.text());
      return new Response("Error fetching payment", { status: 500 });
    }

    const payment = await mpResponse.json();
    console.log("Payment details:", JSON.stringify({
      id: payment.id,
      status: payment.status,
      metadata: payment.metadata,
    }));

    const userId = payment.metadata?.user_id;
    const plan = payment.metadata?.plan;

    if (!userId || !plan) {
      console.error("Missing metadata in payment");
      return new Response("Missing metadata", { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Map Mercado Pago status
    const mpStatus = payment.status; // approved, pending, rejected, cancelled, refunded, in_process

    // Update payment record
    await supabase
      .from("payments")
      .update({
        mercadopago_payment_id: String(paymentId),
        status: mpStatus,
        payment_method: payment.payment_type_id || payment.payment_method_id,
        updated_at: new Date().toISOString(),
      })
      .eq("mercadopago_preference_id", payment.preference_id);

    // If no matching preference, insert a new payment record
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("mercadopago_payment_id", String(paymentId))
      .maybeSingle();

    if (!existingPayment) {
      await supabase.from("payments").upsert({
        user_id: userId,
        mercadopago_payment_id: String(paymentId),
        mercadopago_preference_id: payment.preference_id,
        amount: payment.transaction_amount,
        plan: plan,
        status: mpStatus,
        payment_method: payment.payment_type_id || payment.payment_method_id,
      }, { onConflict: "mercadopago_payment_id" }).select();
    }

    if (mpStatus === "approved") {
      // Activate or update subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from("subscriptions")
          .update({
            plan: plan,
            status: "active",
            downloads_used: 0,
            downloads_limit: PLAN_LIMITS[plan] || 10,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            mercadopago_subscription_id: String(paymentId),
            updated_at: now.toISOString(),
          })
          .eq("user_id", userId);
      } else {
        await supabase.from("subscriptions").insert({
          user_id: userId,
          plan: plan,
          status: "active",
          downloads_used: 0,
          downloads_limit: PLAN_LIMITS[plan] || 10,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          mercadopago_subscription_id: String(paymentId),
        });
      }

      console.log(`Subscription activated for user ${userId}, plan: ${plan}`);
    } else if (mpStatus === "rejected" || mpStatus === "cancelled" || mpStatus === "refunded") {
      // Deactivate subscription
      await supabase
        .from("subscriptions")
        .update({
          status: mpStatus === "rejected" ? "past_due" : "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("status", "active");

      console.log(`Subscription deactivated for user ${userId}, reason: ${mpStatus}`);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
