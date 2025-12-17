import '@testing-library/jest-dom';
import { fc } from './fc-config';

// Re-export configured fast-check
export { fc };

// Re-export all arbitraries for convenience
export * from './arbitraries';
