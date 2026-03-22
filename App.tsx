import React from 'react';
import { CtaButton } from './components/CtaButton';
import { PriceAnchor } from './components/PriceAnchor';

const App: React.FC = () => {
  return (
    <main className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between py-6 px-4 md:px-8 lg:px-16 overflow-hidden bg-brand-navy bg-gradient-to-br from-[#0A1929] via-[#0f233a] to-[#050c14]">
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-noise z-0 mix-blend-overlay opacity-30"></div>

      {/* Background Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-gold/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* 1. LOGO */}
      <header className="relative z-10 w-full flex justify-center flex-none">
        <span className="text-xs md:text-sm font-sans tracking-[0.3em] font-semibold text-brand-offwhite/50 uppercase">
          Terapeuta 10X
        </span>
      </header>

      {/* CENTER CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center flex-grow w-full max-w-5xl gap-6 md:gap-10">


        {/* 2. HEADLINE */}
        <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl lg:text-7xl leading-[1.1] font-bold text-balance drop-shadow-lg">
          EM UMA ÚNICA AULA VOU ENTREGAR O PLANO PARA VOCÊ{' '}
          <span className="text-brand-gold italic">LOTAR SUA AGENDA</span>{' '}
          SEM PRECISAR{' '}
          <span className="text-brand-gold italic">CRIAR CONTEÚDO.</span>
        </h1>

        {/* 3. SUB-HEADLINE */}
        <p className="font-sans text-sm sm:text-base md:text-xl lg:text-2xl text-brand-offwhite/80 max-w-3xl leading-relaxed text-balance">
          Você vai sair com o MAPA, a ESTRATÉGIA DE TRÁFEGO e o ROTEIRO para atrair
          pacientes particulares recorrentes, resgatando sua liberdade e sua dignidade profissional.
        </p>

        {/* ACTION AREA */}
        <div className="flex flex-col items-center gap-3 w-full mt-2 md:mt-4">

          {/* 4. CTA BUTTON */}
          <CtaButton />

          {/* 5. PRICE ANCHOR */}
          <PriceAnchor />

        </div>
      </div>

      {/* 6. FOOTER */}
      <footer className="relative z-10 flex-none text-center mt-4">
        <p className="font-sans text-[10px] md:text-xs text-brand-offwhite/40 tracking-wide flex items-center justify-center gap-1.5">
          <span className="text-brand-gold">🔒</span> Evento Fechado para Profissionais de Saúde Mental.
        </p>
      </footer>
    </main>
  );
};

export default App;