VDS Logistic — production website foundation

Assumed domain:
https://vds-logistic.cc

What is included
- Premium black/gold responsive brand system.
- Main commercial landing page for Russia.
- Separate landing pages for China delivery, rail, sea, road, supplier sourcing, customs and Alipay/WeChat payments.
- Expanded service pages with use cases, process, related services and FAQ blocks for Yandex Direct / SEO relevance.
- Payment calculator: "Вы отдаёте → Вы получаете" for Alipay, WeChat, Chinese cards and invoices.
- Node.js production server with no external npm dependencies.
- POST /api/lead lead intake with optional Telegram and/or webhook delivery.
- GET /api/rates Bank of Russia reference rates with caching and a dated fallback.
- GET /api/health health check.
- UTM + yclid attribution capture.
- Yandex Metrika-ready conversion events.
- FAQ/Service/Organization structured data, canonical URLs, robots.txt, sitemap.xml and custom 404 page.
- Privacy and personal-data consent pages.

Quick start
1. Node.js 20+.
2. Copy .env.example to .env.
3. Configure YANDEX_METRIKA_ID.
4. Configure LEAD_WEBHOOK_URL and/or TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.
5. Run: npm start

Main Metrika goals already wired
- lead_open
- lead_start
- lead_submit
- lead_success (fires only after /api/lead safely returns HTTP 2xx)
- service_click
- payment_calc_use
- payment_calc_swap
- payment_service_select
- payment_calc_submit

Recommended Direct optimization goal: lead_success.

Before public launch
- Add the real legal details and contacts for ВДС-Восточный.
- Confirm the final domain and replace vds-logistic.cc if needed.
- Confirm the real commercial terms for payments/top-ups. The visible calculator is deliberately presented as a reference calculation, not a final quote.
- Configure HTTPS/reverse proxy on hosting.

See DEPLOY.md for server details.
