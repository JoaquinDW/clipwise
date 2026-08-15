import { prismaClientGlobal } from '@/infra/prisma';
import { Company, SubscriptionProps, TransactionProps } from './company.entity';
import { CompanyPort } from './company.port';

export class CompanyRepository implements CompanyPort {
  async createCompany(name : string): Promise<Company> {
    // use the prisma code here
    const company = await prismaClientGlobal.company.create({
      data: {
        name: name,
      }
    });
    return await this.getCompany(company.id)
  }

  async getCompany(id: string): Promise<Company> {
    const company = await prismaClientGlobal.company.findFirst(
      {
        where: {
          id: id,
        }
      })
    if(!company) throw new Error('company not found')
    return new Company({
      id: company.id,
      name: company.name,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    })
  }

  async registerTransaction(transactionDetails: TransactionProps): Promise<void> {
    if(!transactionDetails.companyId) throw new Error('Company id is required')
    await prismaClientGlobal.paymentTransaction.create({
      data: {
        companyId: transactionDetails.companyId,
        // `raw` is a Json column: store the object, not a stringified blob
        raw: transactionDetails as unknown as object,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
  }

  /**
   * Resolve the company a Stripe event belongs to. The customer id is the
   * durable link; the metadata companyId is the fallback for the very first
   * checkout, before the customer has been persisted.
   */
  async findCompanyIdForStripe(
    stripeCustomerId: string | null | undefined,
    fallbackCompanyId?: string | null
  ): Promise<string | null> {
    if (stripeCustomerId) {
      const byCustomer = await prismaClientGlobal.company.findUnique({
        where: { stripeCustomerId },
        select: { id: true },
      });
      if (byCustomer) return byCustomer.id;
    }

    if (fallbackCompanyId) {
      const byId = await prismaClientGlobal.company.findUnique({
        where: { id: fallbackCompanyId },
        select: { id: true },
      });
      if (byId) return byId.id;
    }

    return null;
  }

  async syncSubscription(companyId: string, subscription: SubscriptionProps): Promise<void> {
    const { resetMinutes, ...fields } = subscription;

    // Only patch what the event actually carried, so a partial event never
    // wipes state written by a more complete one.
    const data = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined)
    ) as Record<string, unknown>;

    if (resetMinutes) {
      data.minutesUsed = 0;
      data.minutesResetAt = new Date();
    }

    if (Object.keys(data).length === 0) return;

    await prismaClientGlobal.company.update({ where: { id: companyId }, data });
  }
}
