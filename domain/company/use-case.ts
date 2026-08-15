import { Company, SubscriptionProps, TransactionProps } from './company.entity';
import { CompanyRepository } from './company.repository';

export class CreateCompany {
  async createCompany(name: string): Promise<Company> {
    const newCompany = await new CompanyRepository().createCompany(name);
    return newCompany;
  }
}

export class RegisterTransaction {
  async registerTransaction(transactionDetails: TransactionProps): Promise<void> {
    await new CompanyRepository().registerTransaction(transactionDetails);
  }
}

export class SyncSubscription {
  /**
   * Mirror Stripe subscription state onto the company. Returns false when the
   * event could not be matched to a company, so the caller can log and ack.
   */
  async sync(
    params: {
      stripeCustomerId?: string | null;
      fallbackCompanyId?: string | null;
    } & SubscriptionProps
  ): Promise<boolean> {
    const { stripeCustomerId, fallbackCompanyId, ...subscription } = params;
    const repository = new CompanyRepository();

    const companyId = await repository.findCompanyIdForStripe(stripeCustomerId, fallbackCompanyId);
    if (!companyId) return false;

    await repository.syncSubscription(companyId, { ...subscription, stripeCustomerId });
    return true;
  }
}