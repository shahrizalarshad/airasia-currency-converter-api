import FigmaCurrencyConverter from './components/FigmaCurrencyConverter';
import PWAInitializer from './components/PWAInitializer';

export default function Home() {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center overflow-x-hidden" style={{ background: '#F7F7F7' }}>
      <PWAInitializer />
      <FigmaCurrencyConverter />
    </div>
  );
}
