# VDS Logistic — production deployment

## Quick start
1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Configure `YANDEX_METRIKA_ID` and at least one lead destination (`LEAD_WEBHOOK_URL` or Telegram bot/chat).
4. Run:

```bash
npm start
```

The server serves the complete site and exposes:
- `POST /api/lead` — lead intake for all site forms.
- `GET /api/rates` — Bank of Russia USD/CNY reference rates with a short cache.
- `GET /api/health` — health check.

## Yandex Direct / Metrika events
Primary optimization goal: `lead_success`.
Supporting funnel events: `lead_open`, `lead_start`, `lead_submit`, `service_click`, `payment_calc_use`, `payment_service_select`, `payment_calc_submit`.

`lead_success` fires only after `/api/lead` returns HTTP 2xx, so a failed CRM/Telegram delivery is not counted as a successful lead.

## Before launch
- Replace placeholder legal/contact information with the real VDS-Восточный company details.
- Confirm the final domain and update canonical URLs if it differs from `vds-logistic.cc`.
- Configure HTTPS through Nginx/Caddy/hosting proxy.
- Set real commercial payment terms. The calculator deliberately uses Bank of Russia as a reference and does not pretend it is the final client rate.
