import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { requestLoginCode, verifyLoginCode, type CustomerSnapshot } from '../../lib/customerAuth';

type Lang = 'en' | 'es';
const t = (lang: Lang, en: string, es: string) => (lang === 'en' ? en : es);

/* ── Sign-in modal ────────────────────────────────────────────────────
 * 2-step: email → 6-digit code. The code field is paste-aware and
 * auto-submits when 6 digits land. Code is delivered via Resend (see
 * MagicCodeService). On success, sets HttpOnly cookie + reloads so the
 * header + cart pre-fill pick up the logged-in state.
 * ─────────────────────────────────────────────────────────────────── */
export default function AccountModal({
  open, onClose, lang, onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  onSignedIn?: (c: CustomerSnapshot) => void;
}) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      // reset when closing
      setTimeout(() => {
        setStep('email'); setEmail(''); setCode(''); setError(''); setSubmitting(false);
      }, 300);
    }
  }, [open]);

  useEffect(() => {
    if (step === 'code') setTimeout(() => codeRef.current?.focus(), 50);
  }, [step]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    if (!email.includes('@')) {
      setError(t(lang, 'Please enter a valid email.', 'Por favor escribe un correo válido.'));
      return;
    }
    setSubmitting(true);
    try {
      await requestLoginCode(email.trim());
      setStep('code');
    } catch (err: any) {
      setError(err?.message || t(lang, 'Could not send code. Try again.', 'No pudimos enviar el código. Intenta de nuevo.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(rawCode: string) {
    setError('');
    setSubmitting(true);
    try {
      const customer = await verifyLoginCode(email.trim(), rawCode);
      onSignedIn?.(customer);
      // Hard-reload — cookie is HttpOnly so React state can't read it; reload
      // lets the header + Order page rehydrate with the authenticated session.
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || t(lang, 'Wrong code. Try again.', 'Código incorrecto. Intenta de nuevo.'));
      setCode('');
      setSubmitting(false);
      setTimeout(() => codeRef.current?.focus(), 0);
    }
  }

  function onCodeChange(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !submitting) verify(digits);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/55" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md bg-cream rounded-[1.4rem] border border-line shadow-xl overflow-hidden"
            initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center text-ink-mute hover:bg-line transition-colors"
              aria-label="Close"
            >✕</button>

            <div className="p-7">
              <div className="font-display text-[0.62rem] uppercase tracking-[0.22em] text-ladrillo font-semibold mb-2">
                Sample Bistro · {t(lang, 'Returning guests', 'Clientes recurrentes')}
              </div>

              {step === 'email' && (
                <form onSubmit={sendCode}>
                  <h2 className="font-display text-[1.8rem] font-semibold text-ink leading-tight">
                    {t(lang, 'Welcome back', 'Bienvenido de nuevo')}
                  </h2>
                  <p className="mt-2 text-[0.92rem] text-ink-mute leading-snug">
                    {t(
                      lang,
                      'Sign in to see your past orders, saved addresses, and any coupons waiting for you. No password needed — we email you a code.',
                      'Inicia sesión para ver tus pedidos pasados, direcciones guardadas y los cupones que te esperan. Sin contraseña — te enviamos un código.'
                    )}
                  </p>

                  <label className="block mt-5 text-[0.72rem] uppercase tracking-[0.2em] text-ink-mute font-semibold mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-line bg-cream-card px-4 py-3 text-[1rem] text-ink placeholder:text-ink-faint focus:border-ladrillo focus:outline-none transition-colors"
                  />

                  {error && <p className="mt-3 text-[0.82rem] text-ladrillo">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-5 w-full rounded-full bg-ladrillo text-cream font-semibold py-3 hover:bg-ladrillo-deep transition-colors disabled:opacity-55"
                  >
                    {submitting
                      ? t(lang, 'Sending…', 'Enviando…')
                      : t(lang, 'Send my code', 'Enviar mi código')}
                  </button>
                </form>
              )}

              {step === 'code' && (
                <div>
                  <h2 className="font-display text-[1.8rem] font-semibold text-ink leading-tight">
                    {t(lang, 'Check your email', 'Revisa tu correo')}
                  </h2>
                  <p className="mt-2 text-[0.92rem] text-ink-mute leading-snug">
                    {t(lang, 'We sent a 6-digit code to', 'Enviamos un código de 6 dígitos a')}
                    <strong className="text-ink"> {email}</strong>.
                  </p>

                  <label className="block mt-5 text-[0.72rem] uppercase tracking-[0.2em] text-ink-mute font-semibold mb-1.5">
                    {t(lang, 'Code', 'Código')}
                  </label>
                  <input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    placeholder="••••••"
                    maxLength={6}
                    className="w-full rounded-xl border border-line bg-cream-card px-4 py-3 text-[1.6rem] text-center tracking-[0.5em] font-mono text-ink placeholder:text-ink-faint focus:border-ladrillo focus:outline-none transition-colors"
                  />

                  {error && <p className="mt-3 text-[0.82rem] text-ladrillo">{error}</p>}

                  <div className="mt-5 flex items-center justify-between text-[0.82rem]">
                    <button
                      type="button"
                      onClick={() => { setStep('email'); setCode(''); setError(''); }}
                      className="text-ink-mute hover:text-ink underline"
                    >
                      {t(lang, '← Use a different email', '← Usar otro correo')}
                    </button>
                    <button
                      type="button"
                      onClick={() => sendCode()}
                      disabled={submitting}
                      className="text-ladrillo hover:text-ladrillo-deep font-semibold disabled:opacity-55"
                    >
                      {t(lang, 'Resend code', 'Reenviar código')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
