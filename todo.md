Security findings
High
No security headers. next.config.ts sets no Content-Security-Policy, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy or Permissions-Policy. The admin panel can be framed, which allows clickjacking, and nothing limits the damage if an XSS bug ever appears.
The image optimizer accepts any host. remotePatterns: [{ protocol: "https", hostname: "**" }] lets anyone use /_next/image to proxy and resize images from any site, at your bandwidth and compute cost. Either list the allowed image hosts or serve admin-uploaded images from one storage domain.
Test scripts run against the real database and wipe data. All scripts/test-*.ts use the single DATABASE_URL. test-auth and test-access-control run loginThrottle.deleteMany({}), which clears every login lockout and chat rate limit. If .env points at production, running a test resets brute-force protection and touches live data. Give tests their own database URL and refuse to run when it looks like production.
Medium
The rate limits trust an IP header that can be faked. ip.ts:186-194 falls back to x-real-ip. Anywhere except Vercel, a client can send any value and get a fresh limit on every request. Only trust that header behind a proxy you control.


Login throttling only counts per email+IP pair. There is no per-account limit across IPs and no per-IP limit across emails. Also, the check and the failure-recording are separate steps, so parallel requests can get past the 5-attempt limit. Add a per-account counter and a per-IP counter, and record the attempt atomically.
No two-factor authentication on admin accounts. The single SUPER_ADMIN controls everything, and one stolen password means full takeover. TOTP for admins would be the most valuable addition here.
Sessions have no idle timeout. lastActivityAt is recorded but never checked, so a session stays valid for the full 7 days even if unused. Add something like a 2-hour idle limit for admins.
Chat links aren't checked. ChatMessages.tsx:29-46 renders any link the model writes. Event descriptions from discovered external events are fed to the model, so a malicious description could make the assistant show phishing links. //evil.com also passes the startsWith("/") check. Allow only /path (not //) and https:// links, ideally only your own domain plus event registration URLs.
No overall cost cap on Gemini. Chat is limited to 10 requests per minute per IP, and the session token can be reused for an hour. The sec-fetch-site check is easy to fake from a script, so many IPs can run up your API bill. Add a daily cap for all chat traffic and a budget alert.
The public form protection is weak against scripted spam. The form token isn't single-use and the signature comparison isn't constant-time (sig !== sign(ts)). Contact, speaker, hack-wars and registration forms have no per-IP rate limit. Add the same database-backed limiter the chat uses, and Turnstile or hCaptcha if spam appears.
Registrations aren't confirmed. Anyone can register any email address. The "already registered" reply and the hack-wars "this email already exists" message reveal who has signed up. Send a confirmation email (double opt-in) and reply neutrally.
Low
Changing your own password doesn't limit wrong current-password attempts, and isn't written to the audit log.
The audit log covers admin accounts only. Content deletes, publish/unpublish, discovery approvals and attendee CSV exports (personal data) aren't logged.
The sessions and login_throttles tables are never cleaned up. cleanupExpiredSessions exists but nothing calls it; a daily cron job would fix this.
fix-admin-email.ts commits personal email addresses to git. Delete it now that it has run, or make it take arguments.

There is no privacy policy, consent text or data-retention plan, even though the site collects names, emails, phone numbers and schools. This matters for GDPR/CCPA, especially with student applicants.
Product and feature gaps
No outgoing email at all. Registrations, applications and contact messages are saved to the database but nobody is notified. Add an email provider (Resend, Postmark, etc.) for visitor confirmations and admin alerts.
Tickets is a placeholder page. The TicketType model exists but nothing uses it, and todo.md still asks whether the $700 / $5,000 sponsorships need payment. Decide between display-only pricing and Stripe checkout.
Event registration is basic: no capacity limit, waitlist, cancellation link, calendar invite (.ics), or check-in.
Placeholder content: in event.ts, the date, venue and location are "to be announced", and the contact email is a personal blackbumblesolutions.com address. Use a role address like hello@… on your own domain.

SEO basics are missing: no robots.ts, sitemap.ts, metadataBase (so Open Graph URLs won't resolve) or JSON-LD Event markup. That markup is what gets events into Google's event listings.
No error.tsx or global-error.tsx, so errors show Next's default page.
No monitoring: no error tracking (e.g. Sentry) or analytics, and logging is just console.*.
Admin quality of life: image upload instead of pasting URLs, bulk actions, CSV export for messages and applications, and a dashboard with registration and application counts.
Code health
About 440 lines of commented-out old code sit at the top of page.tsx, and Eye is an unused import in EventRowActions.tsx.
The test scripts are standalone tsx files with no test runner or CI. Adding Vitest plus a GitHub Action running typecheck, lint and tests would catch regressions.
The README is still the create-next-app template. It should cover setup, environment variables, provisioning the first admin and deployment.
Suggested order: the first four items (headers, image hosts, test database isolation, IP trust) are quick, high-value fixes. Then chat link checking, public form rate limits and the session idle timeout. Then 2FA, transactional email and SEO. Tell me which ones to start with; the first three plus chat link checking are each small changes.

