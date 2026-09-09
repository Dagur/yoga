import wrapAssembly from '../wrapAssembly';

export * from '../generated/YGEnums';

const loadAssembly = require('../../binaries/wasm-async-node');

export async function loadYoga() {
  return wrapAssembly(await loadAssembly());
}
