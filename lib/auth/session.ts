import { auth } from '@/auth';
import { prismaClientGlobal } from '@/infra/prisma';

export interface SessionUserWithCompany {
  id: string;
  email: string;
  name: string | null;
  companyId: string;
}

/**
 * The signed-in user together with a guaranteed company.
 *
 * A company is normally created in the NextAuth `jwt` callback on signUp, which
 * fires exactly once — if it ever throws, the user is left with
 * `companyId: null` forever and every route dead-ends. This repairs that lazily
 * instead of leaving the account unusable.
 */
export async function getSessionUserWithCompany(): Promise<SessionUserWithCompany | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prismaClientGlobal.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, companyId: true },
  });
  if (!user) return null;

  let companyId = user.companyId;
  if (!companyId) {
    const company = await prismaClientGlobal.company.create({
      data: { name: user.email.split('@')[0] || `company-${user.id}` },
    });
    await prismaClientGlobal.user.update({
      where: { id: user.id },
      data: { companyId: company.id },
    });
    companyId = company.id;
    console.warn(`[auth] repaired missing company for user ${user.id}`);
  }

  return { id: user.id, email: user.email, name: user.name, companyId };
}
