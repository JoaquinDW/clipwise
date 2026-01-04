'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function Newsletter() {
  const t = useTranslations('landing.newsletter');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    console.log('Subscribe:', email);
  };

  return (
    <section className="relative bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-12 md:py-20 border-t border-gray-800">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="h3 mb-4" data-aos="fade-up">
              {t('headline')}
            </h2>
            <p className="text-xl text-gray-400 mb-8" data-aos="fade-up" data-aos-delay="200">
              {t('subheadline')}
            </p>

            {/* Newsletter form */}
            <form className="max-w-md mx-auto" onSubmit={handleSubmit} data-aos="fade-up" data-aos-delay="400">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  className="flex-grow px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
                  placeholder={t('placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap">
                  {t('button')}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-3">{t('privacy')}</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
