import { ipKeyGenerator, rateLimit } from "express-rate-limit";

// The blanket limiter in app.ts is IP-keyed and guards anonymous/pre-auth
// traffic (e.g. login brute-forcing). It doesn't protect against a single
// authenticated account (compromised, or just a misbehaving client)
// hammering permission-gated endpoints — everyone behind the same IP (NAT,
// corporate network) shares that one bucket. This is the per-user ceiling on
// top of it: keyed by user id once authenticated, so throttling one account
// never affects anyone else, and one account can't hide behind a shared IP.
// Applied per-router, after requireAuth, so req.user is already populated.
export const perUserRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown"),
});
