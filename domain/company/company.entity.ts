export interface CompanyProps {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerDetails {
  address?: {
    city?: string | null;
    country?: string;
    line1?: string | null;
    line2?: string | null;
    postal_code?: string | null;
    state?: string | null;
  };
  email?: string;
  name?: string;
  phone?: string | null;
  tax_exempt?: string;
  tax_ids?: string[];
}

/**
 * Subscription state mirrored from Stripe. Every field is optional so a
 * webhook handler can patch only what its event actually carries.
 */
export interface SubscriptionProps {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  /** Set on a period rollover so metered minutes start from zero again. */
  resetMinutes?: boolean;
}

export interface TransactionProps {
    userId?: string;
    companyId?: string;
    priceId?: string;
    created?: number;
    currency?: string;
    customerDetails?: CustomerDetails;
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