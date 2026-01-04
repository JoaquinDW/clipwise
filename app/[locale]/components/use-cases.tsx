'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import FeatImage01 from '../../(landing-page)/public/images/features-03-image-01.png';
import FeatImage02 from '../../(landing-page)/public/images/features-03-image-02.png';
import FeatImage03 from '../../(landing-page)/public/images/features-03-image-03.png';

export default function UseCases() {
  const t = useTranslations('landing.useCases');

  const cases = [
    {
      image: FeatImage01,
      index: 0,
    },
    {
      image: FeatImage02,
      index: 1,
    },
    {
      image: FeatImage03,
      index: 2,
    },
  ];

  return (
    <section className="relative bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-12 md:py-20">
          {/* Items */}
          <div className="grid gap-20">
            {cases.map((useCase, idx) => (
              <div
                key={idx}
                className={`md:grid md:grid-cols-12 md:gap-6 items-center ${
                  idx % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                {/* Image */}
                <div
                  className={`max-w-xl md:max-w-none md:w-full mx-auto md:col-span-5 lg:col-span-6 mb-8 md:mb-0 ${
                    idx % 2 === 1 ? 'md:order-1' : ''
                  }`}
                  data-aos="fade-up"
                >
                  <Image className="max-w-full mx-auto md:max-w-none h-auto rounded-lg" src={useCase.image} width={540} height={405} alt={t(`items.${useCase.index}.title`)} />
                </div>

                {/* Content */}
                <div
                  className={`max-w-xl md:max-w-none md:w-full mx-auto md:col-span-7 lg:col-span-6 ${
                    idx % 2 === 1 ? 'md:order-0' : ''
                  }`}
                  data-aos="fade-up"
                  data-aos-delay="200"
                >
                  <div className="md:pr-4 lg:pr-12 xl:pr-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-500/20 mb-4">
                      <span className="text-xs font-medium text-purple-300">{t(`items.${useCase.index}.badge`)}</span>
                    </div>
                    <h3 className="h3 mb-3">{t(`items.${useCase.index}.title`)}</h3>
                    <p className="text-xl text-gray-400 mb-4">{t(`items.${useCase.index}.description`)}</p>
                    <ul className="space-y-2 -mb-2">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const featureKey = `items.${useCase.index}.features.${i}`;
                        if (!t.has(featureKey)) return null;
                        return (
                          <li key={i} className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-gray-300">{t(featureKey)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
