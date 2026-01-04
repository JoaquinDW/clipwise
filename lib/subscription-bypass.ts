/**
 * Subscription Bypass Utility
 *
 * Allows bypassing subscription checks for development/testing purposes.
 * Configure SUBSCRIPTION_BYPASS_EMAILS in .env to enable for specific users.
 */

/**
 * Check if a user email is allowed to bypass subscription checks
 * @param email - User email to check
 * @returns true if the email is in the bypass list
 */
export function isSubscriptionBypassed(email: string | null | undefined): boolean {
  if (!email) return false;

  const bypassEmails = process.env.SUBSCRIPTION_BYPASS_EMAILS;

  if (!bypassEmails) return false;

  // Support comma-separated list of emails
  const allowedEmails = bypassEmails
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  return allowedEmails.includes(email.toLowerCase());
}

/**
 * Check if a user has an active subscription OR is bypassed
 * @param email - User email
 * @param hasActiveSubscription - Whether user has active subscription from Stripe
 * @returns true if user should have access
 */
export function canAccessPaidFeatures(
  email: string | null | undefined,
  hasActiveSubscription: boolean = false
): boolean {
  // If bypassed, grant access regardless of subscription status
  if (isSubscriptionBypassed(email)) {
    return true;
  }

  // Otherwise, check actual subscription status
  return hasActiveSubscription;
}

/**
 * Get bypass status for debugging/UI purposes
 * @param email - User email
 * @returns Object with bypass information
 */
export function getBypassInfo(email: string | null | undefined) {
  const bypassed = isSubscriptionBypassed(email);

  return {
    bypassed,
    reason: bypassed ? 'Email in SUBSCRIPTION_BYPASS_EMAILS' : 'Not bypassed',
    email: email || 'No email provided'
  };
}
