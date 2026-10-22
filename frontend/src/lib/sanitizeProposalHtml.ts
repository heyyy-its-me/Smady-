import DOMPurify from "dompurify";

/** Keep proposal markup readable while stripping executable and active content. */
export function sanitizeProposalHtml(untrustedHtml: string): string {
  return DOMPurify.sanitize(untrustedHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["style", "srcset", "action", "formaction"],
    ALLOW_DATA_ATTR: false,
  });
}
