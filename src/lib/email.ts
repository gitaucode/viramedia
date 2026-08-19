function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function rows(items: Array<[string, unknown]>) {
  return items.map(([label, value]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${escapeHtml(Array.isArray(value) ? value.join(", ") : value || "—")}</td></tr>`).join("");
}

export async function sendEmail(subject: string, html: string, replyTo?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.VIRA_INBOX || process.env.NOMA_INBOX || "hello@viramedia.co.ke";
  const from = process.env.VIRA_FROM_EMAIL || process.env.NOMA_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, configurationMissing: true as const };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "User-Agent": "vira-media/1.0" },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!response.ok) return { ok: false, configurationMissing: false as const };
  return { ok: true, configurationMissing: false as const };
}
