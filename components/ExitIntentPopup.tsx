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
    // Desktop: mouse sai do viewport pelo topo (vai para barra de endereço/botão voltar)
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && (e.target as Element)?.nodeName !== 'SELECT') {
        show();
      }
    };

    // Back button / navegação
    const onPopState = () => show();
    history.pushState(null, '', location.href);

    // Mobile: scroll rápido para cima
    let lastScrollY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const delta = lastScrollY - window.scrollY;
        if (delta > 60 && window.scrollY < 80) show();
        lastScrollY = window.scrollY;
        ticking = false;
      });
    };

    document.addEventListener('mouseout', onMouseOut);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('scroll', onScroll);
    };
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 12, 20, 0.88)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0f233a 0%, #0A1929 60%, #050c14 100%)',
          border: '1px solid rgba(212,175,55,0.25)',
          boxShadow: '0 0 60px rgba(212,175,55,0.08), 0 24px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            {/* Warning icon */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="#ef4444" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            {/* ESPERE badge */}
            <span
              className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
              Espere!
            </span>
          </div>
          <button
            onClick={dismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight text-balance mb-3">
            Você está prestes a perder{' '}
            <span className="text-brand-gold italic">sua vaga!</span>
          </h2>
          <p className="font-sans text-sm text-white/70 leading-relaxed">
            A aula acontece{' '}
            <span className="text-brand-gold font-semibold">este domingo</span>{' '}
            — e as vagas estão acabando.
          </p>
        </div>

        {/* Scarcity badge */}
        <div className="flex justify-center px-5 py-3">
          <div
            className="flex items-center gap-2 font-sans text-xs font-semibold px-4 py-2 rounded-full"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#d4af37' }}
          >
            <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse flex-shrink-0" />
            Restam poucas vagas
          </div>
        </div>

        {/* Checkmarks */}
        <div className="flex items-center justify-center gap-5 px-5 pb-4">
          {['Gratuito', 'Bônus exclusivos'].map((item) => (
            <span key={item} className="flex items-center gap-1.5 font-sans text-xs text-white/60">
              <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 flex-shrink-0">
                <path d="M5 10l3.5 3.5L15 7" stroke="#10B981" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="px-5 pb-2">
          <a
            href={WPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="block w-full text-center font-sans font-bold text-base text-white uppercase tracking-wide py-4 rounded-xl transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 0 24px rgba(16,185,129,0.45)',
            }}
          >
            Sim! Quero minha vaga
          </a>
        </div>

        {/* Dismiss link */}
        <div className="px-5 pb-6 text-center">
          <button
            onClick={dismiss}
            className="font-sans text-xs text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
          >
            Não, prefiro perder esta oportunidade
          </button>
        </div>
      </div>
    </div>
  );
};
