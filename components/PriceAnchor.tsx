import React from 'react';

export const PriceAnchor: React.FC = () => {
  return (
    <div className="flex items-center gap-2 font-sans text-xs md:text-sm font-medium tracking-wider">
      <span className="text-brand-offwhite/50 line-through decoration-brand-offwhite/50">
        DE R$ 997,00
      </span>
      <span className="text-brand-green font-bold animate-pulse">
        POR R$ 0,00
      </span>
    </div>
  );
};