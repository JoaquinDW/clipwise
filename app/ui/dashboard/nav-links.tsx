'use client';
import {
  HomeIcon,
  BanknotesIcon,
  UserIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const links = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'Videos', href: '/dashboard/videos', icon: VideoCameraIcon },
  { name: 'Billing', href: '/billing', icon: BanknotesIcon },
  { name: 'Account', href: '/account', icon: UserIcon },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        const isActive =
          pathname === link.href ||
          (link.href !== '/dashboard' && pathname.startsWith(link.href));
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[44px] grow items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors md:flex-none md:justify-start',
              {
                'border-l-2 border-[#FF3B5C] bg-[rgba(255,59,92,0.08)] text-[#f2ede8]': isActive,
                'text-[#555] hover:text-[#f2ede8] hover:bg-[rgba(255,255,255,0.04)]': !isActive,
              },
            )}
          >
            <LinkIcon className="w-5 flex-none" aria-hidden="true" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
