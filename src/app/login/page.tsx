'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(currentPin: string) {
    if (currentPin.length !== 4) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin }),
      });
      const data = await res.json() as { success: boolean; role?: string; error?: string };

      if (data.success) {
        router.push(data.role === 'admin' ? '/admin' : '/');
      } else {
        setError('Código incorrecto');
        setPin('');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pin.length === 4) {
      void handleSubmit(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setError('');
    setPin(value);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">
            Simulacro SUCAMEC
          </h1>
          <p className="text-sm text-slate-500 mt-1">Ley 30299</p>
        </div>

        {/* Card */}
        <div className="w-full bg-white border-2 border-[#E2E8F0] rounded-2xl p-8 flex flex-col items-center gap-6 shadow-sm">
          <label
            htmlFor="pin-input"
            className="text-sm font-medium text-slate-600 text-center"
          >
            Ingresa tu código de acceso
          </label>

          <input
            id="pin-input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={handleChange}
            disabled={loading}
            autoFocus
            placeholder="••••"
            className="w-32 h-16 text-center text-3xl font-bold tracking-[0.5em] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-300"
          />

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit(pin)}
            disabled={loading || pin.length !== 4}
            className="w-full py-3 rounded-xl bg-[#2563EB] text-white font-semibold text-base hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
