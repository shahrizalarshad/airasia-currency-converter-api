'use client';

import { useEffect, useState } from 'react';
import { initializePWA } from '@/lib/pwa';

export default function PWAInitializer() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      // Only initialize PWA features after component is mounted on client
      initializePWA();
    }
  }, [isMounted]);

  // This component doesn't render anything
  return null;
} 