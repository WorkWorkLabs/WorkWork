'use client';

import { useConnect, useAuthCore } from '@particle-network/auth-core-modal';
import { ArbitrumOne } from '@particle-network/chains';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { useRouter } from 'next/navigation';

export function ParticleLoginButtonContent() {
  const { connect, disconnect } = useConnect();
  const { userInfo } = useAuthCore();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const loginMutation = trpc.auth.loginWithParticle.useMutation({
    onSuccess: () => {
      router.push('/dashboard');
    },
    onError: (err) => {
      console.error('Login failed:', err);
    }
  });

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Open the Particle Auth Modal
      const user = await connect({
        chain: ArbitrumOne
      });
      
      if (user) {
        // Map wallets to our expected format
        // Note: user.wallets structure depends on SDK version, assuming standard array
        const wallets = user.wallets?.map((w: any) => ({
             chain: w.chain_name,
             address: w.public_address
        })) || [];

        await loginMutation.mutateAsync({
           uuid: user.uuid,
           email: user.email || undefined,
           name: user.name || undefined,
           wallets: wallets
        });
      }
    } catch (error) {
      console.error('Particle connect error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (userInfo) {
      return (
          <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden md:inline-block">{userInfo.name || userInfo.email}</span>
              <Button variant="outline" onClick={() => disconnect()}>Logout</Button>
          </div>
      )
  }

  return (
    <Button 
      onClick={handleLogin} 
      disabled={loading}
      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
    >
      {loading ? 'Connecting...' : 'Login with Particle'}
    </Button>
  );
}
