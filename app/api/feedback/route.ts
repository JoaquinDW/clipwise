import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/billing/guard';
import { mailgunClientGlobal } from '@/infra/mailgun';

export const runtime = 'nodejs';

const CATEGORIES = ['bug', 'idea', 'question', 'other'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  bug: 'Bug',
  idea: 'Idea / feature request',
  question: 'Question',
  other: 'Other',
};

const MAX_MESSAGE_LENGTH = 4000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

/**
 * Best-effort throttle, per server instance. Enough to stop a stuck form or a
 * bored user from mailing the inbox in a loop; not a security boundary.
 */
const recentSends = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (recentSends.get(userId) || []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (timestamps.length >= MAX_PER_WINDOW) {
    recentSends.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  recentSends.set(userId, timestamps);
  return false;
}

export async function POST(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const { user } = guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { category, message, page } = (body || {}) as {
    category?: string;
    message?: string;
    page?: string;
  };

  const text = typeof message === 'string' ? message.trim() : '';
  if (text.length < 5) {
    return NextResponse.json(
      { error: 'Please write a bit more so we can act on it.' },
      { status: 400 }
    );
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Please keep it under ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const type: Category = CATEGORIES.includes(category as Category)
    ? (category as Category)
    : 'other';

  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { error: 'Too many messages sent. Please try again later.' },
      { status: 429 }
    );
  }

  const to = process.env.FEEDBACK_EMAIL || 'balthasardeweert@gmail.com';

  const bodyText = [
    `Category: ${CATEGORY_LABELS[type]}`,
    `From: ${user.name || 'Unknown'} <${user.email}>`,
    `User ID: ${user.id}`,
    `Company ID: ${user.companyId}`,
    page ? `Page: ${page}` : null,
    '',
    text,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await mailgunClientGlobal.send({
      to: [to],
      subject: `[Momentreel feedback] ${CATEGORY_LABELS[type]} — ${user.email}`,
      text: bodyText,
      'h:Reply-To': user.email,
    });
  } catch (error) {
    console.error('[feedback] failed to send email', error);
    return NextResponse.json(
      { error: 'Could not send your message right now. Please try again later.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
