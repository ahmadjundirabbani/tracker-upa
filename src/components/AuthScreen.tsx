import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Mail, Lock, User, Sparkles, BookOpen, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          throw new Error('Silakan masukkan nama lengkap Anda.');
        }
        if (password.length < 6) {
          throw new Error('Password harus minimal 6 karakter.');
        }

        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Custom update display name in Auth
        await updateProfile(user, { displayName: name });

        // Save profile in Firestore
        const userProfile = {
          userId: user.uid,
          name: name.trim(),
          email: email,
          joinedAt: new Date().toISOString(),
          currentGroupId: null
        };
        await setDoc(doc(db, 'users', user.uid), userProfile);
      } else {
        // Sign In
        await signInWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Terjadi kesalahan sistem.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Email sudah digunakan oleh akun lain.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Email atau sandi salah. Silakan coba lagi.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'Akun dengan email ini tidak ditemukan.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Format alamat email tidak valid.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check / set profile in Firestore if new
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const userProfile = {
          userId: user.uid,
          name: user.displayName || 'Hamba Allah',
          email: user.email || '',
          joinedAt: new Date().toISOString(),
          currentGroupId: null
        };
        await setDoc(docRef, userProfile);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(
          'Gagal masuk menggunakan Google. Jika Anda sedang melihat aplikasi di dalam panel preview AI Studio, browser Anda mungkin memblokir Cookie Pihak Ketiga (Third-Party Cookies). Solusinya: \n\n1. Buka aplikasi di "Tab Baru" (tombol kanan atas preview).\n2. Atau, gunakan menu "Daftar Baru" / "Masuk Akun" via Email & Sandi di atas yang 100% lancar di sini.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth_container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logotype */}
        <div className="flex flex-col items-center justify-center">
          <div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-200">
            <BookOpen className="h-9 w-9 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold font-display text-slate-900">
            SakinahTrack ✨
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Pelacak Target & Komunitas Ibadah Real-time
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-2xl sm:px-10">
          
          {/* Header Action switcher */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
            <button
              onClick={() => { setIsSignUp(false); setErrorMessage(null); }}
              className={`flex-1 text-center pb-2 text-sm font-semibold transition-all ${
                !isSignUp ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Masuk Akun
            </button>
            <button
              onClick={() => { setIsSignUp(true); setErrorMessage(null); }}
              className={`flex-1 text-center pb-2 text-sm font-semibold transition-all ${
                isSignUp ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-lg flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-rose-700 whitespace-pre-line">{errorMessage}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleEmailAuth}>
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Ahmad Jundir"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Alamat Email
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Kata Sandi
                </label>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all font-display mt-6 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Mendata Sistem...
                </>
              ) : (
                <>
                  {isSignUp ? 'Daftar Akun' : 'Masuk SakinahTrack'}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 select-none">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-medium">atau gunakan</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2.5 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all cursor-pointer"
          >
            <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" width="24" height="24">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v2.7h5.38C16.88,15.14,14.77,16.5,12,16.5c-3.04,0-5.61-2.05-6.53-4.82C5.24,11.01,5.1,10.33,5.1,10s.14-1.01,.37-1.68C6.39,5.55,8.96,3.5,12,3.5c1.8,0,3.34,.63,4.55,1.75l2.45-2.45C17.06,1,14.75,0,12,0,7.31,0,3.29,2.69,1.35,6.62c-.14,.29-.27,.58-.4,.88-.1,.24-.19,.49-.27,.75C.24,9.03,0,9.93,0,11c0,1.07,.24,1.97,.68,2.75,.08,.26,.17,.51,.27,.75s.26,.59,.4,.88C3.29,19.31,7.31,22,12,22c5.5,0,10-4.5,10-10C22,11.7,21.75,11.4,21.35,11.1Z" fill="#EA4335" />
                <path d="M21.35,11.1H12v2.7h5.38C16.88,15.14,14.77,16.5,12,16.5c-3.04,0-5.61-2.05-6.53-4.82C5.24,11.01,5.1,10.33,5.1,10s.14-1.01,.37-1.68C6.39,5.55,8.96,3.5,12,3.5c1.8,0,3.34,.63,4.55,1.75l2.45-2.45C17.06,1,14.75,0,12,0,7.31,0,3.29,2.69,1.35,6.62c-.14,.29-.27,.58-.4,.88-.1,.24-.19,.49-.27,.75C.24,9.03,0,9.93,0,11c0,1.07,.24,1.97,.68,2.75,.08,.26,.17,.51,.27,.75s.26,.59,.4,.88C3.29,19.31,7.31,22,12,22c5.5,0,10-4.5,10-10C22,11.7,21.75,11.4,21.35,11.1Z" fill="#4285F4" />
                <path d="M12,22c5.5,0,10-4.5,10-10,0-.3-.25-.6-.65-.9H12v2.7h5.38C16.88,15.14,14.77,16.5,12,16.5c-3.04,0-5.61-2.05-6.53-4.82C5.24,11.01,5.1,10.33,5.1,10s.14-1.01,.37-1.68C6.39,5.55,8.96,3.5,12,3.5c1.8,0,3.34,.63,4.55,1.75l2.45-2.45C17.06,1,14.75,0,12,0,7.31,0,3.29,2.69,1.35,6.62c-.14,.29-.27,.58-.4,.88-.1,.24-.19,.49-.27,.75C.24,9.03,0,9.93,0,11c0,1.07,.24,1.97,.68,2.75,.08,.26,.17,.51,.27,.75s.26,.59,.4,.88C3.29,19.31,7.31,22,12,22Z" fill="#34A853" />
                <path d="M12,3.5c1.8,0,3.34,.63,4.55,1.75l2.45-2.45C17.06,1,14.75,0,12,0,7.31,0,3.29,2.69,1.35,6.62c-.14,.29-.27,.58-.4,.88-.1,.24-.19,.49-.27,.75C.24,9.03,0,9.93,0,11c0,1.07,.24,1.97,.68,2.75,.08,.26,.17,.51,.27,.75s.26,.59,.4,.88C3.29,19.31,7.31,22,12,22Z" fill="#FBBC05" />
              </g>
            </svg>
            Masuk dengan Google
          </button>
        </div>

        {/* Spiritual Quote footer */}
        <div className="mt-8 text-center text-xs text-slate-500 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/40">
          <Sparkles className="h-4.5 w-4.5 text-emerald-600 mx-auto mb-1" />
          <p className="font-medium italic text-slate-600">
            "Saling tolong-menolonglah kamu dalam kebajikan dan takwa, dan jangan saling menolong-menolong dalam berbuat dosa."
          </p>
          <p className="font-semibold text-emerald-700 mt-1">QS. Al-Ma'idah: 2</p>
        </div>
      </div>
    </div>
  );
}
