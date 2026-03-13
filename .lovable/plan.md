

# Plano: Assinaturas Recorrentes com Mercado Pago

## Situação Atual
O sistema atual cria **pagamentos avulsos** via Checkout Preferences. O usuário paga uma vez e a assinatura dura 30 dias sem renovação automática.

## O Que Muda
Substituir o fluxo de pagamento avulso pela **API de Preapproval (assinaturas recorrentes)** do Mercado Pago, que cobra automaticamente todo mês.

## Alterações

### 1. Edge Function `mercadopago-checkout` — Reescrever
- Trocar a chamada de `POST /checkout/preferences` para `POST /preapproval` (API de assinaturas recorrentes do Mercado Pago)
- Configuração da assinatura recorrente:
  - `reason`: nome do plano
  - `auto_recurring`: frequência mensal, valor em BRL, tipo "months", frequency 1
  - `back_url`: URLs de retorno
  - `payer_email`: email do usuário
  - `external_reference`: user_id + plan no metadata
  - `notification_url`: webhook existente
- Salvar o `preapproval_id` retornado no banco
- Retornar o `init_point` para redirecionamento

### 2. Edge Function `mercadopago-webhook` — Atualizar
- Adicionar tratamento para eventos do tipo `subscription_preapproval` e `subscription_authorized_payment`
- Ao receber notificação:
  - Buscar detalhes via `GET /preapproval/{id}` ou `GET /v1/payments/{id}` conforme o tipo
  - Mapear status: `authorized` → ativo, `paused`/`cancelled` → inativo
  - Tratar pagamentos recorrentes aprovados: resetar `downloads_used`, renovar período
  - Tratar cancelamento/pausa: desativar assinatura

### 3. Banco de Dados — Migration
- Adicionar coluna `mercadopago_preapproval_id` na tabela `subscriptions` para guardar o ID da assinatura recorrente (separado do payment_id)

### 4. Dashboard do Usuário — Cancelamento
- Adicionar botão "Cancelar Assinatura" no Dashboard
- Nova edge function `mercadopago-cancel` que chama `PUT /preapproval/{id}` com `status: "cancelled"`

### 5. Frontend `PricingSection` — Ajuste menor
- Nenhuma mudança visual, apenas garantir que o fluxo chama o novo endpoint corretamente (mesmo nome de função, resposta compatível)

## Fluxo Final
```text
Usuário escolhe plano
  → mercadopago-checkout cria preapproval (assinatura recorrente)
  → Redireciona para Mercado Pago
  → Usuário paga (PIX ou cartão)
  → Webhook recebe "authorized" → ativa assinatura
  → Todo mês: MP cobra automaticamente
  → Webhook recebe pagamento aprovado → renova período + reseta downloads
  → Se falhar/cancelar → webhook desativa assinatura
```

## Detalhes Técnicos

- API endpoint: `https://api.mercadopago.com/preapproval`
- Autenticação: Bearer token (MERCADOPAGO_ACCESS_TOKEN já configurado)
- Tipos de notificação webhook: `subscription_preapproval`, `subscription_authorized_payment`
- A coluna `mercadopago_subscription_id` existente pode ser reaproveitada para o preapproval_id

