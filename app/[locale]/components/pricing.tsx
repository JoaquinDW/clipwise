'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

export default function Pricing() {
  const t = useTranslations('landing.pricing');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Access plans array by index: 0=starter, 1=pro, 2=business/teams
  const getPlan = (index: number) => {
    return {
      name: t(`plans.${index}.name`),
      icon: t(`plans.${index}.icon`),
      tagline: t(`plans.${index}.tagline`),
      price: t(`plans.${index}.price`),
      priceAnnual: t.has(`plans.${index}.priceAnnual`) ? t(`plans.${index}.priceAnnual`) : t(`plans.${index}.price`),
      period: t(`plans.${index}.period`),
      periodAnnual: t.has(`plans.${index}.periodAnnual`) ? t(`plans.${index}.periodAnnual`) : t(`plans.${index}.period`),
      cta: t(`plans.${index}.cta`),
      trialNote: t.has(`plans.${index}.trialNote`) ? t(`plans.${index}.trialNote`) : '',
      note: t.has(`plans.${index}.note`) ? t(`plans.${index}.note`) : '',
      badge: t.has(`plans.${index}.badge`) ? t(`plans.${index}.badge`) : '',
      popular: t.has(`plans.${index}.popular`) ? t.raw(`plans.${index}.popular`) : false,
    };
  };

  const getFeatures = (planIndex: number) => {
    const features = [];
    let i = 0;
    while (t.has(`plans.${planIndex}.features.${i}`)) {
      features.push(t(`plans.${planIndex}.features.${i}`));
      i++;
    }
    return features;
  };

  const starter = getPlan(0);
  const pro = getPlan(1);
  const business = getPlan(2);

  return (
    <section id="pricing" className="relative bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="max-w-3xl mx-auto text-center pb-12">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-500/20 mb-4"
              data-aos="fade-up"
            >
              <span className="text-xs font-medium text-purple-300">{t('badge')}</span>
            </div>
            <h2 className="h2 mb-4" data-aos="fade-up">
              {t('headline')}
            </h2>
            <p className="text-xl text-gray-400" data-aos="fade-up" data-aos-delay="200">
              {t('subheadline')}
            </p>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-4 mt-8" data-aos="fade-up" data-aos-delay="300">
              <span className={billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'}>Monthly</span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  billingCycle === 'annual' ? 'bg-purple-600' : 'bg-gray-700'
                }`}
                aria-label="Toggle billing cycle"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={billingCycle === 'annual' ? 'text-white' : 'text-gray-500'}>
                Annual <span className="text-green-400 text-sm">(Save 25%)</span>
              </span>
            </div>
          </div>

          {/* Pricing cards - 3 cards only */}
          <div className="max-w-sm mx-auto grid gap-8 lg:grid-cols-3 lg:gap-6 items-start lg:max-w-none">
            {/* Starter Plan */}
            <PricingCard
              icon={starter.icon}
              name={starter.name}
              tagline={starter.tagline}
              price={billingCycle === 'annual' ? starter.priceAnnual : starter.price}
              period={billingCycle === 'annual' ? starter.periodAnnual : starter.period}
              features={getFeatures(0)}
              cta={starter.cta}
              trialNote={starter.trialNote}
              note={starter.note}
              badge={starter.badge}
              href="/login"
              popular={false}
              delay={0}
            />

            {/* Pro Plan - Most Popular */}
            <PricingCard
              icon={pro.icon}
              name={pro.name}
              tagline={pro.tagline}
              price={billingCycle === 'annual' ? pro.priceAnnual : pro.price}
              period={billingCycle === 'annual' ? pro.periodAnnual : pro.period}
              features={getFeatures(1)}
              cta={pro.cta}
              trialNote={pro.trialNote}
              badge={pro.badge}
              href="/login"
              popular={true}
              delay={100}
            />

            {/* Teams/Business Plan */}
            <PricingCard
              icon={business.icon}
              name={business.name}
              tagline={business.tagline}
              price={business.price}
              period={business.period}
              features={getFeatures(2)}
              cta={business.cta}
              href={business.cta.toLowerCase().includes('contact') || business.cta.toLowerCase().includes('ventas') ? '/contact' : '/login'}
              popular={false}
              delay={200}
            />
          </div>

          {/* FAQ section within pricing */}
          <div className="max-w-3xl mx-auto mt-16">
            <h3 className="text-2xl font-bold text-center mb-8" data-aos="fade-up">
              {t('faq.title')}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="p-4 rounded-lg bg-gray-800" data-aos="fade-up" data-aos-delay={index * 100}>
                  <h4 className="font-semibold text-gray-200 mb-2">{t(`faq.items.${index}.question`)}</h4>
                  <p className="text-sm text-gray-400">{t(`faq.items.${index}.answer`)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div
            className="max-w-3xl mx-auto text-center mt-16 p-8 rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30"
            data-aos="fade-up"
          >
            <h3 className="text-3xl font-bold mb-4">{t('finalCta.headline')}</h3>
            <p className="text-gray-300 mb-6">{t('finalCta.subheadline')}</p>
            <Link href="/login" className="btn bg-purple-600 hover:bg-purple-700 text-white">
              {t('finalCta.button')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Pricing Card Component
function PricingCard({
  icon,
  name,
  tagline,
  price,
  period,
  features,
  cta,
  trialNote,
  note,
  badge,
  href,
  popular,
  delay,
}: {
  icon: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  trialNote?: string;
  note?: string;
  badge?: string;
  href: string;
  popular: boolean;
  delay: number;
}) {
  return (
    <div
      className={`relative flex flex-col h-full p-6 rounded-2xl border ${
        popular ? 'bg-gradient-to-br from-purple-600/20 to-purple-900/20 border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-gray-800 border-gray-700'
      }`}
      data-aos="fade-up"
      data-aos-delay={delay}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold bg-purple-600 text-white">⭐ {tagline}</span>
        </div>
      )}

      <div className="mb-4">
        <div className="text-4xl mb-2">{icon}</div>
        <div className="text-lg font-semibold text-gray-200 mb-1">{name}</div>
        {!popular && <div className="text-sm text-gray-400">{tagline}</div>}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">{price}</span>
          <span className="text-gray-400 text-sm">{period}</span>
        </div>
      </div>

      <div className="flex-grow">
        <ul className="space-y-3 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={href}
        className={`btn w-full ${popular ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
      >
        {cta}
      </Link>

      {trialNote && <p className="text-center text-xs text-gray-400 mt-3">{trialNote}</p>}
      {note && <p className="text-center text-xs text-gray-400 mt-3">{note}</p>}
      {badge && !popular && <p className="text-center text-xs text-purple-400 mt-3 font-medium">{badge}</p>}
    </div>
  );
}
