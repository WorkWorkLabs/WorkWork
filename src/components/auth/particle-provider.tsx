'use client';

import { AuthCoreContextProvider } from '@particle-network/auth-core-modal';
import { ArbitrumOne, Base, Polygon } from '@particle-network/chains';
import React from 'react';

export function ParticleAuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthCoreContextProvider
      options={{
        projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID || 'mock-project-id',
        clientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY || 'mock-client-key',
        appId: process.env.NEXT_PUBLIC_PARTICLE_APP_ID || 'mock-app-id',
        erc4337: {
          name: 'SIMPLE',
          version: '1.0.0',
        },
        wallet: {
          visible: true,
          customStyle: {
            supportChains: [ArbitrumOne, Base, Polygon],
          }
        },
      }}
    >
      {children}
    </AuthCoreContextProvider>
  );
}
