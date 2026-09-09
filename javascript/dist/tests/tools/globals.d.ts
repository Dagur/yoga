/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
declare global {
    var YGBENCHMARK: (title: string, fn: () => void) => void;
}
declare const benchmark: (title: string, fn: () => void) => void;
export { benchmark as YGBENCHMARK };
