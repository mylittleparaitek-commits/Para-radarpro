# Stripe

## Plan catalog

| Plan | Monthly (EUR) | Stripe Price ID env var |
| --- | --- | --- |
| Découverte (free) | 0 | — |
| Pro | 19 | `STRIPE_PRICE_ID_PRO` |
| Business | 49 | `STRIPE_PRICE_ID_BUSINESS` |
| Premium | 99 | `STRIPE_PRICE_ID_PREMIUM` |

Defined in `lib/stripe/products.ts`. The marketing page, the pricing page, the checkout API and the webhook handler all read from this one file.

## Product & price setup (dashboard)

In the Stripe dashboard, create **one product per plan** with a **monthly recurring EUR price**. Copy each Price ID into `.env.local`.

The catalog supports **test mode** seamlessly — just use test Price IDs in dev and live Price IDs in prod.

## Webhook events handled

The handler lives in `lib/stripe/webhook.ts`. It is **idempotent**: every event id is recorded in the `stripe_events` table before processing.

| Event | What happens |
| --- | --- |
| `checkout.session.completed` | Retrieve the subscription, map Price ID → plan, update `profiles.subscription_plan` + `subscription_status` + `stripe_subscription_id` + `subscription_ends_at`. |
| `customer.subscription.created` `customer.subscription.updated` | Same as above — keeps plan + status in sync for upgrades/downgrades. |
| `customer.subscription.deleted` | Downgrade to `free`, status `canceled`, clear `stripe_subscription_id`. |
| `invoice.payment_failed` | Set status to `past_due` (keep the plan; Stripe will retry). |

All other events return 200 without side effects.

## Webhook setup

### Dev (Stripe CLI)

```bash
pnpm stripe:listen
```

The CLI prints a `whsec_…` secret on startup — paste it into `.env.local` as `STRIPE_WEBHOOK_SECRET`. The CLI forwards live events to `http://localhost:3000/api/stripe/webhook`.

### Prod

In **Stripe Dashboard → Developers → Webhooks → Add endpoint**:

- URL: `https://your-domain.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- Copy the **Signing secret** into the prod env as `STRIPE_WEBHOOK_SECRET`.

## Billing portal

`POST /api/stripe/portal` returns a Stripe billing portal URL. Users can:

- Upgrade / downgrade their plan
- Update card details
- Download invoices
- Cancel (with effect at the end of the current period)

The portal is the single self-service surface — we **never** ask users for card numbers in the app UI.

## Idempotence in detail

`POST /api/stripe/webhook` does:

1. Verify the signature with `STRIPE_WEBHOOK_SECRET`.
2. Insert `{id: event.id, type, payload, processed_at}` into `stripe_events`.
3. If the insert fails on duplicate key (`23505`), return 200 immediately — the event was already processed.
4. Otherwise, dispatch on `event.type` and update profiles.

Without step 2, Stripe's retries (every event is delivered at least once, sometimes more on transient failures) would double-charge our local state — for example, marking a subscription as canceled twice.

## Local testing recipes

### Simulate a successful subscription

```bash
stripe trigger checkout.session.completed
```

You'll see the event arrive in the CLI and the user profile update. Verify with:

```sql
select id, email, subscription_plan, subscription_status
  from public.profiles
  where email = 'you@example.com';
```

### Simulate a cancellation

```bash
stripe trigger customer.subscription.deleted
```

The user should go back to `free` + `canceled`.

### Simulate a failed payment

```bash
stripe trigger invoice.payment_failed
```

Status becomes `past_due`; plan stays.
