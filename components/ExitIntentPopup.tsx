import React, { useEffect, useState, useCallback } from 'react';
import { WPP_LINK } from './CtaButton';

const SESSION_KEY = 'exit_popup_shown';

export const ExitIntentPopup: React.FC = () => {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    // Desktop: mouse leaves through top of viewport
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) show();
    };
    document.documentElement.addEventListener('mouseleave', onMouseLeave);

    // Back button
    const onPopState = () => show();
    history.pushState(null, '', location.href);
    window.addEventListener('popstate', onPopState);

    return () => {
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('popstate', onPopState);
    };
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 5, 5, 0.9)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          maxWidth: '400px',
          background: '#1A1A1A',
          border: '1px solid rgba(249,115,22,0.3)',
          borderRadius: '16px',
          boxShadow: '0 0 60px rgba(249,115,22,0.1), 0 24px 48px rgba(0,0,0,0.7)',
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(249,115,22,0.12)' }}
        >
          <div className="flex items-center gap-2">
            {/* Pulsing live dot */}
            <span
              className="flex-shrink-0 rounded-full"
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#F97316',
                boxShadow: '0 0 6px #F97316',
                animation: 'pulse 1.6s ease-in-out infinite',
                display: 'inline-block',
              }}
            />
            <span
              className="font-sans font-bold uppercase"
              style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#F97316' }}
            >
              ESPERE
            </span>
          </div>
          <button
            onClick={dismiss}
            className="flex items-center justify-center rounded-full transition-colors"
            style={{
              width: '28px',
              height: '28px',
              color: 'rgba(241,241,241,0.35)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-4 text-center">
          <h2
            className="font-sans font-black"
            style={{
              fontSize: 'clamp(1.3rem, 5vw, 1.6rem)',
              lineHeight: 1.2,
              color: '#F1F1F1',
              marginBottom: '12px',
            }}
          >
            Voce vai mesmo sair sem garantir sua vaga?
          </h2>
          <p
            className="font-sans"
            style={{
              fontSize: '0.88rem',
              color: 'rgba(241,241,241,0.65)',
              lineHeight: 1.65,
            }}
          >
            A aula e esta segunda as 20h, ao vivo. Se nao for pra voce, voce sai em 10 segundos. Sem custo, sem compromisso.
          </p>
        </div>

        {/* CTA */}
        <div className="px-6 pb-4">
          <a
            href={WPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { (window as any).fbq?.('track', 'Contact'); dismiss(); }}
            className="block w-full text-center font-sans font-bold uppercase text-white rounded-xl transition-all duration-300"
            style={{
              fontSize: '0.9rem',
              letterSpacing: '0.07em',
              padding: '16px 20px',
              backgroundColor: '#10B981',
              boxShadow: '0 0 20px rgba(16,185,129,0.35)',
              textDecoration: 'none',
            }}
          >
            SIM, QUERO MINHA VAGA
          </a>
        </div>

        {/* Dismiss */}
        <div className="px-6 pb-5 text-center">
          <button
            onClick={dismiss}
            className="font-sans transition-colors"
            style={{
              fontSize: '11px',
              color: 'rgba(241,241,241,0.25)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Nao, prefiro perder esta oportunidade
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
};
