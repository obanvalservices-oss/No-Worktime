/**
 * Sends email confirmation link. Set RESEND_API_KEY + RESEND_FROM_EMAIL in production.
 * Without Resend, logs the link to the server console (development).
 */
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
  appName = "NO Worktime"
): Promise<void> {
  const subject = `Confirm your email — ${appName}`;
  const html = `
    <p>Thanks for signing up. Confirm your email address to activate your account.</p>
    <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#2d6a5d;color:#fff;text-decoration:none;border-radius:8px;">Confirm email</a></p>
    <p style="color:#666;font-size:12px;">If you did not create an account, you can ignore this message.</p>
    <p style="color:#666;font-size:12px;word-break:break-all;">${verifyUrl}</p>
  `.trim();

  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (key && from) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend error: ${res.status} ${text}`);
    }
    return;
  }

  console.warn(
    `[email] RESEND_API_KEY / RESEND_FROM_EMAIL not set — confirmation link for ${to}:\n${verifyUrl}`
  );
}
