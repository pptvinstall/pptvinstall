import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Cooldown: one alert per unique error message per 5 minutes
const COOLDOWN_MS = 5 * 60 * 1000;
const lastAlertTimes = new Map<string, number>();

function isOnCooldown(key: string): boolean {
  const last = lastAlertTimes.get(key);
  if (!last) return false;
  return Date.now() - last < COOLDOWN_MS;
}

export async function alertOnError(error: Error, context: string): Promise<void> {
  const cooldownKey = `${context}::${error.message}`;

  if (isOnCooldown(cooldownKey)) return;
  lastAlertTimes.set(cooldownKey, Date.now());

  const env = process.env.NODE_ENV || "unknown";
  const timestamp = new Date().toISOString();

  const subject = `🚨 PPTV Server Error — ${context}`;

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border-left:4px solid #dc2626;">
        <h2 style="margin:0 0 16px;color:#dc2626;">Server Error Alert</h2>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
          <tr><td style="padding:6px 0;color:#64748b;width:120px;">Context</td><td style="padding:6px 0;font-weight:700;">${context}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Environment</td><td style="padding:6px 0;">${env}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Timestamp</td><td style="padding:6px 0;">${timestamp}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Error</td><td style="padding:6px 0;color:#dc2626;">${error.message}</td></tr>
        </table>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;">
          <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Stack Trace</p>
          <pre style="margin:0;font-size:12px;white-space:pre-wrap;word-break:break-all;color:#0f172a;">${error.stack || "No stack trace available"}</pre>
        </div>
        <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">This alert has a 5-minute cooldown per error type. Check your server logs for full details.</p>
      </div>
    </div>
  `;

  const text =
    `PPTV Server Error Alert\n` +
    `Context     : ${context}\n` +
    `Environment : ${env}\n` +
    `Timestamp   : ${timestamp}\n` +
    `Error       : ${error.message}\n\n` +
    `Stack Trace:\n${error.stack || "No stack trace available"}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Picture Perfect TV Install <pptvinstall@gmail.com>",
      to: process.env.ADMIN_EMAIL || "pptvinstall@gmail.com",
      subject,
      html,
      text,
    });
  } catch (mailErr) {
    // Log but never throw — error alerting must not crash the server
    console.error("errorAlertService: failed to send alert email:", mailErr);
  }
}
