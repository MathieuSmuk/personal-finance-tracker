const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function createRequireTrustedOrigin(clientUrl) {
  const configuredUrl = new URL(clientUrl);

  if (
    !["http:", "https:"].includes(configuredUrl.protocol) ||
    configuredUrl.origin !== clientUrl
  ) {
    throw new Error(
      "CLIENT_URL must be an exact HTTP or HTTPS origin without a trailing slash.",
    );
  }

  return function requireTrustedOrigin(req, res, next) {
    // Read-only requests and browser preflight requests can continue.
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const requestOrigin = req.get("Origin");

    // Reject untrusted origins, including missing and opaque origins.
    if (requestOrigin !== configuredUrl.origin) {
      return res.status(403).json({
        message: "Request origin is not allowed.",
      });
    }

    return next();
  };
}
