'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

const ParticleLoginButtonContent = dynamic(
  () => import('./particle-login-button-content').then((mod) => mod.ParticleLoginButtonContent),
  { 
    ssr: false,
    loading: () => <Button disabled className="bg-gradient-to-r from-blue-500 to-purple-600 text-white opacity-50">Loading...</Button>
  }
);

export function ParticleLoginButton() {
  return <ParticleLoginButtonContent />;
}
