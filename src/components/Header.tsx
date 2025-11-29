'use client';

export default function Header() {
  return (
    <header className="py-12 px-8 text-center border-b border-[--border-color] bg-gradient-to-b from-[--bg-dark] to-transparent">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-4 mb-4">
          <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(201,162,39,0.5)]">⚔️</span>
          <h1 className="font-display text-4xl font-bold gradient-gold tracking-wide">
            Prophecies Raid Analyzer
          </h1>
        </div>
        <p className="text-lg text-[--text-secondary] font-light tracking-wide">
          Analysez vos soirées de raid • Comparez vos performances • Dominez Azeroth
        </p>
      </div>
    </header>
  );
}

