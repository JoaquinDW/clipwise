import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaClientGlobal as prisma } from '@/infra/prisma';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const { email } = parsed.data;

  await prisma.waitlistEntry.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  return NextResponse.json({ success: true });
}
