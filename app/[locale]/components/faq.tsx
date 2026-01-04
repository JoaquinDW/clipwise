'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function Faq() {
  const t = useTranslations('landing.faq');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = Array.from({ length: 10 }, (_, i) => i).filter((i) => t.has(`items.${i}.question`));

  return (
    <section id="faq" className="relative bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="max-w-3xl mx-auto text-center pb-12 md:pb-16">
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
          </div>

          {/* FAQ items */}
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {faqs.map((index) => (
                <div
                  key={index}
                  className="border border-gray-700 rounded-lg overflow-hidden"
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                >
                  <button
                    className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  >
                    <span className="font-semibold text-gray-200">{t(`items.${index}.question`)}</span>
                    <svg
                      className={`w-5 h-5 text-purple-500 transition-transform ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openIndex === index && (
                    <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-700">
                      <p className="text-gray-400">{t(`items.${index}.answer`)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
