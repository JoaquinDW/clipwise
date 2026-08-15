export interface CompanyProps {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerDetails {
  email?: string | null;
  name?: string | null;
  country?: string | null;
}

/**
 * Subscription state mirrored from the billing provider. Every field is
 * optional so a webhook handler can patch only what its event actually carries.
 */
export interface SubscriptionProps {
  billingProvider?: string | null;
  billingCustomerId?: string | null;
  billingSubscriptionId?: string | null;
  billingProductId?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  /** Set on a period rollover so metered minutes start from zero again. */
  resetMinutes?: boolean;
}

/** Audit trail of a settled payment, stored as JSON in PaymentTransaction.raw. */
export interface TransactionProps {
  userId?: string;
  companyId?: string;
  productId?: string;
  orderId?: string;
  billingReason?: string;
  created?: number;
  currency?: string;
  customerDetails?: CustomerDetails;
  /** Total charged, in the currency's smallest unit. */
  amount?: number;
}

export class Company {
  public props: CompanyProps;

  constructor(props: CompanyProps) {
    this.props = { ...props };
  }

  id() {
    return this.props.id;
  }

}