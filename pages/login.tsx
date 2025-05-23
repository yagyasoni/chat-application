import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    else router.push('/');
  };

  return (
    <main className="flex h-screen items-center justify-center bg-gray-200">
      <section className="w-96 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4 text-center">Login to Periskope</h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <div className="mb-4">
          <label className="block mb-1 text-sm text-gray-600">Email</label>
          <input
            type="email"
            className="w-full p-2 bg-gray-100 rounded-full text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-sm text-gray-600">Password</label>
          <input
            type="password"
            className="w-full p-2 bg-gray-100 rounded-full text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          className="w-full p-2 bg-green-500 text-white rounded-full"
          onClick={handleLogin}
        >
          Login
        </button>
      </section>
    </main>
  );
};

export default LoginPage;