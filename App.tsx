import React from 'react';
import { CtaButton } from './components/CtaButton';
import { ExitIntentPopup } from './components/ExitIntentPopup';

const App: React.FC = () => {
  return (
    <>
      <main
        className="relative min-h-[100dvh] w-full flex flex-col items-center overflow-hidden"
        style={{ backgroundColor: '#0A0A0A' }}
      >
        {/* Noise Texture Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0 mix-blend-overlay opacity-20"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Radial orange glow — subtle, centered below fold */}
        <div
          className="absolute pointer-events-none z-0"
          style={{
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '520px',
            height: '520px',
            background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* ── BARRA DE EVENTO ── */}
        <div
          className="relative z-10 w-full flex items-center justify-center gap-3 py-3 px-4"
          style={{
            background: 'rgba(249,115,22,0.06)',
            borderBottom: '1px solid rgba(249,115,22,0.15)',
          }}
        >
          {/* Pulsing dot */}
          <span
            className="flex-shrink-0 w-2 h-2 rounded-full"
            style={{
              backgroundColor: '#F97316',
              boxShadow: '0 0 6px #F97316',
              animation: 'pulse 1.6s ease-in-out infinite',
            }}
          />
          <span
            className="font-sans font-semibold uppercase tracking-widest text-center"
            style={{ fontSize: '11px', color: 'rgba(241,241,241,0.6)', letterSpacing: '0.25em' }}
          >
            ESTA SEGUNDA &bull; 20H &bull; AO VIVO NO MEET
          </span>
        </div>

        {/* ── HERO BLOCK ── */}
        <div
          className="relative z-10 flex flex-col items-center text-center px-6 pt-10 pb-12 w-full"
          style={{ maxWidth: '512px' }}
        >

          {/* HEADLINE */}
          <div className="flex flex-col items-center gap-0 mb-6">
            <span
              className="font-sans font-bold uppercase"
              style={{
                fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
                letterSpacing: '0.3em',
                color: 'rgba(241,241,241,0.65)',
                lineHeight: 1.2,
              }}
            >
              O FIM DA
            </span>
            <span
              className="font-sans font-black uppercase"
              style={{
                fontSize: 'clamp(3.5rem, 14vw, 5rem)',
                letterSpacing: '-0.01em',
                color: '#F97316',
                lineHeight: 1,
              }}
            >
              AGENDA VAZIA
            </span>
          </div>

          {/* DIVISOR */}
          <div
            style={{
              width: '64px',
              height: '2px',
              background: '#F97316',
              marginBottom: '24px',
              opacity: 0.75,
            }}
          />

          {/* ALARME */}
          <div
            className="w-full mb-5 text-left"
            style={{
              borderLeft: '3px solid #F97316',
              paddingLeft: '16px',
            }}
          >
            <p
              className="font-sans font-extrabold uppercase"
              style={{
                fontSize: 'clamp(0.78rem, 2.8vw, 0.9rem)',
                color: '#F97316',
                lineHeight: 1.55,
                letterSpacing: '0.03em',
              }}
            >
              O TERAPEUTA QUE NAO TIVER UM SISTEMA DE CAPTACAO NOS PROXIMOS 6 MESES ESTARA COMPLETAMENTE FORA DO MERCADO.
            </p>
          </div>

          {/* BODY */}
          <p
            className="font-sans w-full text-left mb-6"
            style={{
              fontSize: 'clamp(0.85rem, 3.2vw, 1rem)',
              color: 'rgba(241,241,241,0.75)',
              lineHeight: 1.7,
            }}
          >
            Em uma aula, voce descobre como encher sua agenda sem se tornar refem da criacao de conteudo e sem depender de indicacao.
          </p>

          {/* BONUS BOX */}
          <div
            className="w-full flex items-start gap-3 mb-6 rounded-lg"
            style={{
              background: '#1A1A1A',
              border: '1px solid rgba(249,115,22,0.25)',
              padding: '16px',
            }}
          >
            <span style={{ fontSize: '1.25rem', flexShrink: 0, lineHeight: 1.3 }}>
              🎁
            </span>
            <p
              className="font-sans"
              style={{
                fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
                color: 'rgba(241,241,241,0.8)',
                lineHeight: 1.6,
              }}
            >
              Quem participar ao vivo recebe uma surpresa exclusiva.
            </p>
          </div>

          {/* PRICE ANCHOR */}
          <div className="flex flex-col items-center gap-1 mb-5 w-full">
            <span
              className="font-sans"
              style={{
                fontSize: '0.85rem',
                color: 'rgba(241,241,241,0.35)',
                textDecoration: 'line-through',
                textDecorationColor: 'rgba(241,241,241,0.3)',
              }}
            >
              DE R$ 997,00
            </span>
            <span
              className="font-sans font-bold"
              style={{
                fontSize: 'clamp(1.1rem, 4.5vw, 1.35rem)',
                color: '#F97316',
                letterSpacing: '0.02em',
              }}
            >
              POR APENAS: R$ 0,00
            </span>
          </div>

          {/* CTA */}
          <CtaButton />

          {/* FOOTER */}
          <p
            className="font-sans mt-6"
            style={{
              fontSize: '11px',
              color: 'rgba(241,241,241,0.28)',
              letterSpacing: '0.04em',
              textAlign: 'center',
            }}
          >
            🔒 Evento gratuito. Exclusivo para terapeutas e psicanalistas.
          </p>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
          }
        `}</style>
      </main>

      <ExitIntentPopup />
    </>
  );
};

export default App;
