import { useEffect } from 'react';

export function PhotoLightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 cursor-pointer"
      style={{ backgroundColor: 'rgba(36,28,18,0.93)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 leading-none transition-colors text-[1.6rem]"
        style={{ color: 'rgba(244,234,214,0.55)' }}
        aria-label="Close"
      >
        ✕
      </button>
      <img
        src={src}
        alt={name}
        className="max-w-[90vw] max-h-[72vh] object-contain rounded-2xl shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src.includes('logo-red.png')) return;
          img.src = `${import.meta.env.BASE_URL}assets/site/logo-red.png`;
          img.classList.add('p-12', 'max-h-[40vh]');
        }}
      />
      <p className="mt-5 font-display text-[1.25rem] font-semibold text-center max-w-[82vw]"
         style={{ color: 'var(--color-cream)' }}>
        {name}
      </p>
    </div>
  );
}
