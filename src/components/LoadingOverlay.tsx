'use client';

interface LoadingOverlayProps {
  text?: string;
}

export default function LoadingOverlay({ text = 'Chargement...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-[--bg-darkest]/90 flex flex-col items-center justify-center z-50">
      <div className="loading-spinner mb-6" />
      <p className="font-display text-lg text-[--accent-gold] tracking-widest">
        {text}
      </p>
    </div>
  );
}

