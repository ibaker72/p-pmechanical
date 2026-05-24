import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, DM_Sans } from 'next/font/google';
import { BUSINESS } from '@/lib/constants';
import { HvacBusinessSchema } from '@/components/seo/HvacBusinessSchema';
import { StickyMobileCTA } from '@/components/StickyMobileCTA';
import './globals.css';

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const sans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ppmechanicalhvac.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BUSINESS.name} | HVAC & Boiler Specialists in Clifton, NJ`,
    template: `%s | ${BUSINESS.name}`,
  },
  description:
    "North Jersey's premier HVAC, boiler, and AC specialists. Serving Clifton, Passaic, Paterson, and surrounding areas with 24/7 emergency service and free estimates.",
  applicationName: BUSINESS.name,
  authors: [{ name: BUSINESS.name }],
  keywords: [
    'HVAC Clifton NJ',
    'boiler installation NJ',
    'AC repair Passaic County',
    'emergency HVAC New Jersey',
    'P&P Mechanical',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: `${BUSINESS.name} | HVAC & Boiler Specialists in Clifton, NJ`,
    description:
      'Premier HVAC, boiler, and AC specialists serving Clifton and North Jersey. 24/7 emergency service, free estimates, licensed & insured.',
    siteName: BUSINESS.name,
    images: ['/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BUSINESS.name} | HVAC & Boiler Specialists`,
    description: '24/7 emergency HVAC, boiler, and AC service across North Jersey.',
    images: ['/og-default.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  themeColor: '#070a12',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <head>
        <HvacBusinessSchema />
      </head>
      <body className="pb-[72px] md:pb-0">
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
        <StickyMobileCTA />
      </body>
    </html>
  );
}
