import wrapAssembly from '../wrapAssembly';

export * from '../generated/YGEnums';

const loadAssembly = require('../../binaries/wasm-sync-web');

export async function loadYoga() {
  return wrapAssembly(await loadAssembly());
}
