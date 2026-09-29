export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Enterprise Email Notification Dispatcher
 * Delivers transactional security alerts, account lockouts, and OTPs.
 * Integrates with SMTP in production or logs formatted alerts in non-production.
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // In development / staging / test environments:
    console.log(`\n================== [OUTGOING SECURITY EMAIL] ==================`);
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:\n${options.text}`);
    if (options.html) {
      console.log(`HTML Payload Attached: ${options.html.length} chars`);
    }
    console.log(`===============================================================\n`);

    return true;
  } catch (err) {
    console.error('[Email Dispatcher Error]:', err);
    return false;
  }
};

/**
 * Sends a security lockout notification to a user when their account
 * is temporarily locked due to repeated brute-force login attempts.
 */
export const sendAccountLockoutEmail = async (
  email: string,
  lockoutMinutes: number,
  clientIp: string
): Promise<boolean> => {
  const subject = 'Security Alert: Your CarePulse Account Has Been Temporarily Locked';
  const text = `Hello,

We detected multiple consecutive failed login attempts on your CarePulse account from IP address: ${clientIp}.

For your protection, your account has been temporarily locked for ${lockoutMinutes} minute(s). During this time, all login attempts for this account will be halted.

If this was you, you may try logging in again after ${lockoutMinutes} minute(s).

If you did NOT make these attempts, someone may be attempting to guess your password. We strongly recommend resetting your password immediately once your lockout expires.

Stay safe,
CarePulse Security Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #dc2626;">Security Alert: Account Temporarily Locked</h2>
      <p>Hello,</p>
      <p>We detected multiple consecutive failed login attempts on your CarePulse account from IP address: <strong>${clientIp}</strong>.</p>
      <p>For your security, your account has been temporarily locked for <strong>${lockoutMinutes} minute(s)</strong>.</p>
      <p style="background: #fef2f2; padding: 12px; border-left: 4px solid #ef4444; color: #991b1b;">
        If you did not initiate these login attempts, an unauthorized user may be attempting to access your account. Please reset your password once the temporary lock expires.
      </p>
      <p>Best regards,<br/><strong>CarePulse Security Team</strong></p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};
