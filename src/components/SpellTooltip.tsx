'use client';

import { useState, useRef, useEffect } from 'react';
import { getSpellTranslation, getWowheadSpellUrl, getSpellIconUrl } from '@/lib/wowhead-translations';

interface SpellTooltipProps {
  abilityName: string;
  spellId?: number;
  children: React.ReactNode;
  className?: string;
}

export default function SpellTooltip({ abilityName, spellId, children, className = '' }: SpellTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const translation = getSpellTranslation(abilityName);
  const wowheadUrl = getWowheadSpellUrl(abilityName, spellId);
  const iconUrl = getSpellIconUrl(spellId, abilityName);
  
  // Utiliser le nom traduit si disponible, sinon le nom original
  const displayName = translation.name !== abilityName ? translation.name : abilityName;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  const handleTooltipMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleTooltipMouseLeave = () => {
    setIsVisible(false);
  };

  // Calculer la position du tooltip
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = position.x - rect.width / 2;
      let y = position.y - rect.height - 10;
      
      // Ajuster si le tooltip dépasse à droite
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }
      
      // Ajuster si le tooltip dépasse à gauche
      if (x < 10) {
        x = 10;
      }
      
      // Ajuster si le tooltip dépasse en haut
      if (y < 10) {
        y = position.y + 30; // Afficher en dessous
      }
      
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    }
  }, [isVisible, position]);

  return (
    <>
      <span
        className={`cursor-help ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={displayName !== abilityName ? `${displayName} (${abilityName})` : abilityName}
      >
        {children}
      </span>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none"
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            transform: 'translate(-50%, -100%)',
            maxWidth: '300px',
          }}
        >
          <div className="bg-gradient-to-b from-[#1e2328] to-[#0f1419] border-2 border-[#3c4146] rounded-lg shadow-2xl p-3 pointer-events-auto">
            {/* Header avec icône et nom */}
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-[#3c4146]">
              {iconUrl && (
                <img
                  src={iconUrl}
                  alt={translation.name}
                  className="w-12 h-12 border border-[#3c4146] rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1">
                <div className="text-[#ffd100] font-bold text-base leading-tight">
                  {displayName}
                </div>
                {abilityName !== displayName && (
                  <div className="text-[#9d9d9d] text-xs italic">
                    {abilityName}
                  </div>
                )}
              </div>
            </div>
            
            {/* Description */}
            {translation.description && (
              <div className="text-[#9d9d9d] text-sm mb-2 leading-relaxed">
                {translation.description}
              </div>
            )}
            
            {/* Footer avec lien WoWHead */}
            <div className="mt-2 pt-2 border-t border-[#3c4146]">
              <a
                href={wowheadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00ccff] hover:text-[#00ffff] text-xs flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span>🔗</span>
                Voir sur WoWHead
              </a>
            </div>
          </div>
          
          {/* Flèche pointant vers le haut */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#3c4146]"></div>
          </div>
        </div>
      )}
    </>
  );
}

