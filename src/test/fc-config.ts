import * as fc from 'fast-check';

// Configure fast-check with default parameters (100 iterations)
fc.configureGlobal({
  numRuns: 100,
  verbose: false,
});

export { fc };
