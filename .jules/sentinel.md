# Sentinel's Journal - Critical Security Learnings Only

## 2025-05-14 - OAuth CSRF Protection and Cryptographic Randomness
**Vulnerability:** The OAuth flow was missing `state` parameter validation, leaving users vulnerable to CSRF attacks. Additionally, `Math.random()` was used for security-sensitive tokens.
**Learning:** Even when using PKCE, the `state` parameter remains a critical defense against CSRF in the authorization flow. `Math.random()` is not cryptographically secure and should never be used for generating security tokens or verifiers.
**Prevention:** Always implement `state` validation in OAuth flows and use `crypto.getRandomValues()` for any security-sensitive random data.
