import { Syne, DM_Sans } from 'next/font/google';
import Link from 'next/link';
import { auth, signIn } from '@/auth';
import { providersList } from '@/infra/providerDetector';
import { redirect } from 'next/navigation';
import '../(landing-page)/style.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
  display: 'swap',
});

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div
      className={`${syne.variable} ${dmSans.variable}`}
      style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f2ede8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}
    >
      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,59,92,0.08) 0%, transparent 68%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,140,0,0.07) 0%, transparent 68%)', filter: 'blur(40px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="grad-text" style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em' }}>
            Clipwise
          </span>
        </Link>

        {/* Card */}
        <div style={{ width: '100%', background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: '40px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 22, fontWeight: 800, color: '#f2ede8', letterSpacing: '-0.02em', marginBottom: 8 }}>
              Welcome back
            </h1>
            <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#555', lineHeight: 1.6 }}>
              Sign in to your Clipwise account
            </p>
          </div>

          {providersList.googleAuth.isAvailable ? (
            <form
              action={async () => {
                'use server';
                await signIn('google', { redirectTo: '/dashboard' });
              }}
              style={{ width: '100%' }}
            >
              <button
                type="submit"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '13px 24px',
                  background: '#1a1a1a',
                  border: '1px solid #242424',
                  borderRadius: 10,
                  color: '#f2ede8',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={undefined}
              >
                {/* Google icon */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </form>
          ) : (
            <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 1.6 }}>
              Google Auth not configured. Check your{' '}
              <code style={{ color: '#FF3B5C' }}>.env</code> file.
            </p>
          )}

          <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#333', textAlign: 'center', lineHeight: 1.7 }}>
            By continuing, you agree to our{' '}
            <Link href="/" style={{ color: '#555', textDecoration: 'underline' }}>Terms</Link>
            {' '}and{' '}
            <Link href="/" style={{ color: '#555', textDecoration: 'underline' }}>Privacy Policy</Link>
          </p>
        </div>

        <Link
          href="/"
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: '#333', textDecoration: 'none', transition: 'color 0.2s' }}
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
