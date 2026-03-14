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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle subscription_preapproval events (subscription status changes)
    if (body.type === "subscription_preapproval") {
      const preapprovalId = body.data?.id;
      if (!preapprovalId) {
        return new Response("No preapproval ID", { status: 200, headers: corsHeaders });
      }

      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });

      if (!mpResponse.ok) {
        console.error("Failed to fetch preapproval:", await mpResponse.text());
        return new Response("Error", { status: 500 });
      }

      const preapproval = await mpResponse.json();
      console.log("Preapproval details:", JSON.stringify({
        id: preapproval.id,
        status: preapproval.status,
        external_reference: preapproval.external_reference,
      }));

      let userId: string;
      let plan: string;
      try {
        const ref = JSON.parse(preapproval.external_reference);
        userId = ref.user_id;
        plan = ref.plan;
      } catch {
        console.error("Invalid external_reference:", preapproval.external_reference);
        return new Response("Invalid reference", { status: 200, headers: corsHeaders });
      }

      const mpStatus = preapproval.status; // authorized, paused, cancelled, pending

      // Update payment record
      await supabase
        .from("payments")
        .update({
          status: mpStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("mercadopago_preference_id", preapprovalId);

      if (mpStatus === "authorized") {
        // Activate subscription
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
              plan,
              status: "active",
              downloads_used: 0,
              downloads_limit: PLAN_LIMITS[plan] || 10,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              mercadopago_subscription_id: preapprovalId,
              updated_at: now.toISOString(),
            })
            .eq("user_id", userId);
        } else {
          await supabase.from("subscriptions").insert({
            user_id: userId,
            plan,
            status: "active",
            downloads_used: 0,
            downloads_limit: PLAN_LIMITS[plan] || 10,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            mercadopago_subscription_id: preapprovalId,
          });
        }
        console.log(`Subscription activated for user ${userId}, plan: ${plan}`);
      } else if (mpStatus === "paused" || mpStatus === "cancelled") {
        await supabase
          .from("subscriptions")
          .update({
            status: mpStatus === "cancelled" ? "cancelled" : "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("status", "active");

        console.log(`Subscription ${mpStatus} for user ${userId}`);
      }

      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Handle subscription_authorized_payment events (recurring payment processed)
    if (body.type === "subscription_authorized_payment") {
      const paymentId = body.data?.id;
      if (!paymentId) {
        return new Response("No payment ID", { status: 200, headers: corsHeaders });
      }

      const mpResponse = await fetch(`https://api.mercadopago.com/authorized_payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });

      if (!mpResponse.ok) {
        console.error("Failed to fetch authorized payment:", await mpResponse.text());
        return new Response("Error", { status: 500 });
      }

      const authorizedPayment = await mpResponse.json();
      console.log("Authorized payment:", JSON.stringify({
        id: authorizedPayment.id,
        status: authorizedPayment.status,
        preapproval_id: authorizedPayment.preapproval_id,
      }));

      if (authorizedPayment.status === "approved") {
        // Find subscription by preapproval_id and renew
        const preapprovalId = authorizedPayment.preapproval_id;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("mercadopago_subscription_id", preapprovalId)
          .maybeSingle();

        if (sub) {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setDate(periodEnd.getDate() + 30);

          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              downloads_used: 0,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", sub.id);

          // Record the recurring payment
          await supabase.from("payments").insert({
            user_id: sub.user_id,
            mercadopago_payment_id: String(paymentId),
            mercadopago_preference_id: preapprovalId,
            amount: authorizedPayment.transaction_amount || 0,
            plan: sub.plan,
            status: "approved",
            payment_method: authorizedPayment.payment_method_id || null,
          });

          console.log(`Subscription renewed for user ${sub.user_id}`);
        }
      }

      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Handle payment events (PIX one-time payments + legacy)
    if (body.type === "payment" || body.action === "payment.created" || body.action === "payment.updated") {
      const paymentId = body.data?.id;
      if (!paymentId) {
        return new Response("No payment ID", { status: 200, headers: corsHeaders });
      }

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });

      if (!mpResponse.ok) {
        console.error("Failed to fetch payment:", await mpResponse.text());
        return new Response("Error fetching payment", { status: 500 });
      }

      const payment = await mpResponse.json();
      const userId = payment.metadata?.user_id;
      const plan = payment.metadata?.plan;

      if (userId && plan) {
        // Update payment record
        await supabase
          .from("payments")
          .update({
            mercadopago_payment_id: String(paymentId),
            status: payment.status,
            payment_method: payment.payment_type_id || payment.payment_method_id,
            updated_at: new Date().toISOString(),
          })
          .eq("mercadopago_preference_id", payment.preference_id);

        // If payment approved, activate subscription (30 days)
        if (payment.status === "approved") {
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
                plan,
                status: "active",
                downloads_used: 0,
                downloads_limit: PLAN_LIMITS[plan] || 10,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("user_id", userId);
          } else {
            await supabase.from("subscriptions").insert({
              user_id: userId,
              plan,
              status: "active",
              downloads_used: 0,
              downloads_limit: PLAN_LIMITS[plan] || 10,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
            });
          }
          console.log(`PIX subscription activated for user ${userId}, plan: ${plan}`);
        }
      }

      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Unknown event type
    console.log("Unhandled webhook event type:", body.type);
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
