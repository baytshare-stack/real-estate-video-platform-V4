/** Shared transactional copy (OTP registration / resend). */

export function buildRegistrationOtpEmail(otpPlain: string) {
  const subject = "Your verification code";
  const text = `Your verification code is ${otpPlain}. It expires in a few minutes. If you did not request this, ignore this email.`;
  const html = `<p>Your verification code is <strong>${otpPlain}</strong>.</p><p>It expires in a few minutes. If you did not request this, ignore this email.</p>`;
  return { subject, text, html };
}
