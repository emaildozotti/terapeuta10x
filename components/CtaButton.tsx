import React from 'react';

export const CtaButton: React.FC = () => {
  return (
    <a
      href="https://chat.whatsapp.com/Gn2VfUHkRpaF1wzFGfzPTo"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative w-full max-w-md bg-brand-green hover:bg-[#0ea271] text-white font-sans font-bold text-base md:text-xl py-4 md:py-5 px-8 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 overflow-hidden block text-center no-underline"
      aria-label="Garantir minha vaga gratuita"
    >
      {/* Shine Effect */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] skew-x-12" />

      <span className="relative flex items-center justify-center gap-2 uppercase tracking-wide">
        Garantir Minha Vaga Gratuita
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-5 h-5 md:w-6 md:h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </span>

      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </a>
  );
};