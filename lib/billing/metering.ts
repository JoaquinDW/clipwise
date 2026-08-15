import { prismaClientGlobal } from '@/infra/prisma';
import { getPlanLimits, TRIAL_MINUTES } from '@/lib/plans';
import { isSubscriptionBypassed } from '@/lib/subscription-bypass';

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class VideoTooLongError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoTooLongError';
  }
}

/**
 * Charge a video's duration against its company's monthly allowance.
 *
 * This runs in the worker rather than at the API door because that is the first
 * moment the real duration is known for a YouTube/Twitch/Kick URL. Throws when
 * the video is over the plan's length limit or would blow the allowance, so the
 * caller marks the video FAILED with a meaningful message.
 *
 * Idempotent via `Video.minutesMetered`: a retry re-runs ingest but never
 * double-charges.
 */
export async function meterVideoDuration(
  videoId: string,
  durationSeconds: number
): Promise<void> {
  if (!durationSeconds || durationSeconds <= 0) return;

  const video = await prismaClientGlobal.video.findUnique({
    where: { id: videoId },
    select: {
      minutesMetered: true,
      company: {
        select: {
          id: true,
          plan: true,
          subscriptionStatus: true,
          minutesUsed: true,
          users: { select: { email: true } },
        },
      },
    },
  });

  if (!video) throw new Error('Video not found');
  if (video.minutesMetered) return;

  const company = video.company;
  const limits = getPlanLimits(company.plan);

  // The worker has no session, so the bypass list is resolved from the company's
  // members — otherwise a bypassed admin would still hit the quota here.
  const bypassed = company.users.some(u => isSubscriptionBypassed(u.email));

  if (!bypassed && durationSeconds > limits.maxVideoDurationSeconds) {
    throw new VideoTooLongError(
      `This video is ${Math.round(durationSeconds / 60)} min. Your plan allows up to ${Math.round(
        limits.maxVideoDurationSeconds / 60
      )} min per video.`
    );
  }

  const minutesLimit =
    company.subscriptionStatus === 'trialing'
      ? Math.min(limits.minutesPerMonth, TRIAL_MINUTES)
      : limits.minutesPerMonth;

  const minutes = durationSeconds / 60;

  if (!bypassed && company.minutesUsed + minutes > minutesLimit) {
    throw new QuotaExceededError(
      `Not enough minutes left: this video needs ${minutes.toFixed(1)} min and you have ${Math.max(
        0,
        minutesLimit - company.minutesUsed
      ).toFixed(1)} min remaining. Upgrade your plan to keep going.`
    );
  }

  await prismaClientGlobal.$transaction([
    prismaClientGlobal.company.update({
      where: { id: company.id },
      data: { minutesUsed: { increment: minutes } },
    }),
    prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { minutesMetered: true, duration: Math.round(durationSeconds) },
    }),
  ]);

  console.log(
    `[metering] Charged ${minutes.toFixed(1)} min to company ${company.id} for video ${videoId}`
  );
}
