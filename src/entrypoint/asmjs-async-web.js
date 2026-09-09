import wrapAssembly from '../wrapAssembly';

export * from '../generated/YGEnums';

const loadAssembly = require('../../binaries/asmjs-async-web');

export async function loadYoga() {
  return wrapAssembly(await loadAssembly());
}
