import React from 'react';

export const WPP_LINK = 'https://chat.whatsapp.com/KJs0tufUsnLKMrtR8ThN5s';

export const CtaButton: React.FC = () => {
  return (
    <a
      href={WPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative w-full block text-center no-underline overflow-hidden rounded-xl"
      style={{
        backgroundColor: '#10B981',
        boxShadow: '0 0 24px rgba(16,185,129,0.4)',
        padding: '18px 24px',
        transition: 'box-shadow 0.3s ease, transform 0.2s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 36px rgba(16,185,129,0.6)';
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 24px rgba(16,185,129,0.4)';
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
      }}
      aria-label="Garantir minha vaga agora"
    >
      {/* Shine sweep */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
          transform: 'translateX(-100%) skewX(-12deg)',
          transition: 'transform 0s',
        }}
      />

      <span
        className="relative font-sans font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2"
        style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1rem)', letterSpacing: '0.08em' }}
      >
        GARANTIR MINHA VAGA AGORA
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          style={{ width: '18px', height: '18px', flexShrink: 0 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </span>
    </a>
  );
};
