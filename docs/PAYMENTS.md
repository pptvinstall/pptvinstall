# PPTVInstall payments

## Customer flow

1. Build and accept the PPTVInstall quote.
2. Create the Job OS invoice from the accepted quote.
3. Generate the secure hosted checkout link from the invoice.
4. Customer pays on Stripe's hosted page; PPTVInstall never collects or stores raw card numbers.
5. Stripe sends a signed server-to-server event to PPTVInstall.
6. PPTVInstall matches the Stripe Checkout Session to the canonical invoice by invoice ID/number metadata, verifies the exact remaining balance, records one card payment, and marks the job paid when the invoice is fully paid.
7. Stripe retries are idempotent because the Checkout Session ID is stored as the payment reference.

## Payment methods

- Cash — recorded manually.
- Zelle — recorded manually.
- Apple Pay — manual Apple Pay remains supported; eligible Apple Pay can also appear inside Stripe Checkout.
- Credit / debit card — Stripe-hosted Checkout when Stripe is configured.
- Square — backwards-compatible fallback only when Stripe is not configured and Square credentials are present.

## Stripe production setup

Stripe is the preferred hosted checkout provider when `STRIPE_SECRET_KEY` is present. The key belongs to the live `pptvinstall.replit.app` Stripe account. Do not commit or paste the key into source control.

Production environment variables:

- `STRIPE_SECRET_KEY` — live Stripe secret key, stored only in the hosting provider's secret environment.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the live `https://pptvinstall.com/api/stripe/webhook` endpoint, stored only in the hosting provider's secret environment.
- `STRIPE_CHECKOUT_BASE_URL` — optional; defaults to `https://pptvinstall.com` and controls where Stripe returns the customer after checkout.

The live webhook endpoint should subscribe only to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

`checkout.session.completed` is recorded only when the Checkout Session reports `payment_status=paid`. Delayed payment methods remain pending until the async success event arrives.

The generated Checkout Session carries the PPTVInstall invoice ID and invoice number in both Checkout Session and PaymentIntent metadata. Reconciliation refuses to mutate an invoice when the invoice is missing/void/already paid, the currency is not USD, or the Stripe amount does not equal the invoice's exact remaining balance.

## Customer return pages

- Successful Checkout returns to `/payment/success`.
- Cancelled Checkout returns to `/payment/cancelled`.

The success page is informational only. It never marks an invoice paid. The signed webhook is the source of truth for automatic reconciliation.

## Payout path

Customer card / eligible Apple Pay payment → Stripe balance → configured Stripe payout schedule / manual payout → linked Delta Community payout account.

Payout destination and timing are controlled in Stripe, not in PPTVInstall. Bank account and debit card details must be entered only in Stripe's secure Dashboard.

## Safety boundaries

- Never collect raw card numbers in PPTVInstall.
- Never store bank-account or debit-card credentials in this repository.
- Quote snapshots and invoice totals remain canonical; the payment provider does not recompute pricing.
- Customer pages never expose owner economics, pricing floors, helper compensation, margins, or internal notes.
- A successful checkout redirect alone is not proof of settlement.
- Invalid or stale webhook signatures are rejected before invoice/payment data is touched.
- Duplicate Stripe webhook deliveries never create duplicate Job OS payments.
