/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { FlexDirection, MeasureMode } from 'yoga-layout';
type MeasureContext = {
    text: string;
    flexDirection: FlexDirection;
};
export declare function intrinsicSizeMeasureFunc(this: MeasureContext, width: number, widthMode: MeasureMode, height: number, heightMode: MeasureMode): {
    width: number;
    height: number;
};
export {};
