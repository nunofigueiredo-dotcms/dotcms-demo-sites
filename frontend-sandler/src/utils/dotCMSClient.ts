import { createDotCMSClient } from "@dotcms/client";

// The client validates `dotcmsUrl` on construction, so a missing host would
// throw at import time and break the build wherever dotCMS isn't configured
// (CI, a preview deploy). Fall back to a placeholder: requests fail at runtime
// and getDotCMSPage's try/catch turns that into a 404 rather than a crash.
const DOTCMS_HOST =
  process.env.NEXT_PUBLIC_DOTCMS_HOST || "http://localhost:8082";

export const dotCMSClient = createDotCMSClient({
  dotcmsUrl: DOTCMS_HOST,
  authToken: process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN || "not-configured",
  siteId: process.env.NEXT_PUBLIC_DOTCMS_SITE_ID,
});
