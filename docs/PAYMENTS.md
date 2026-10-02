# PPTVInstall payments

## Customer flow

1. Build and accept the PPTVInstall quote.
2. Create the Job OS invoice from the accepted quote.
3. Generate the secure hosted checkout link from the invoice.
4. Customer pays on the processor-hosted page; PPTVInstall never collects or stores raw card numbers.
5. Record or reconcile the payment against the Job OS invoice, then issue the paid receipt.

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
- `STRIPE_CHECKOUT_BASE_URL` — optional; defaults to `https://pptvinstall.com` and controls where Stripe returns the customer after checkout.

The generated Checkout Session carries the PPTVInstall invoice ID and invoice number in Stripe metadata so a webhook/reconciliation path can match processor payments back to the canonical Job OS invoice without guessing from amounts or customer names.

## Payout path

Customer card / eligible Apple Pay payment → Stripe balance → configured Stripe payout schedule / manual payout → linked Delta Community payout account.

Payout destination and timing are controlled in Stripe, not in PPTVInstall. Bank account and debit card details must be entered only in Stripe's secure Dashboard.

## Safety boundaries

- Never collect raw card numbers in PPTVInstall.
- Never store bank-account or debit-card credentials in this repository.
- Quote snapshots and invoice totals remain canonical; the payment provider does not recompute pricing.
- Customer pages never expose owner economics, pricing floors, helper compensation, margins, or internal notes.
- A successful checkout redirect alone is not proof of settlement. Payment reconciliation should use Stripe's signed server-to-server events or an owner-verified payment record before producing a paid receipt.
