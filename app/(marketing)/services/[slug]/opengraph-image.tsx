import { ImageResponse } from 'next/og';
import { RESIDENTIAL_SERVICES, BUSINESS } from '@/lib/constants';

export const runtime = 'edge';
export const alt = `${BUSINESS.name} — HVAC service in Clifton, NJ`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return RESIDENTIAL_SERVICES.map((s) => ({ slug: s.slug }));
}

export default function Image({ params }: { params: { slug: string } }) {
  const service = RESIDENTIAL_SERVICES.find((s) => s.slug === params.slug);
  const title = service?.name ?? 'HVAC Services';
  const subtitle = service?.short ?? "North Jersey's premier HVAC specialists";

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: '#070a12',
        padding: '64px 80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 26,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: '#f97316',
          fontWeight: 700,
        }}
      >
        {BUSINESS.name} · Clifton, NJ
      </div>
      <div
        style={{
          display: 'flex',
          color: '#ffffff',
          fontSize: 80,
          fontWeight: 800,
          lineHeight: 1.05,
          marginTop: 20,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', color: '#cbd5e1', fontSize: 32, marginTop: 20 }}>
        {subtitle}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 40,
          color: '#94a3b8',
          fontSize: 26,
        }}
      >
        {BUSINESS.phone} · Free estimates · Licensed &amp; insured
      </div>
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '100%',
          height: 12,
          background: '#f97316',
        }}
      />
    </div>,
    { ...size },
  );
}
