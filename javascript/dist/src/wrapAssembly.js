/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// @ts-nocheck

import { Unit, Direction } from "./generated/YGEnums.js";
import YGEnums from "./generated/YGEnums.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function wrapAssembly(lib) {
  // Pointer to the static YGValue return buffer (2 floats = 8 bytes).
  const valueBufPtr = lib._jswrap_YGValueBuffer();
  // Byte offset into HEAPF32 (4 bytes per float).
  const valueBufIdx = valueBufPtr >> 2;

  // Callback maps stored on Module for EM_JS access.
  lib._yogaMeasureFuncs = new Map();
  lib._yogaDirtiedFuncs = new Map();
  function readYGValue() {
    return {
      value: lib.HEAPF32[valueBufIdx],
      unit: lib.HEAP32[valueBufIdx + 1]
    };
  }

  // --- Polymorphic setter dispatch ---
  // wasmPointFn is the direct WASM function for Point values, to avoid
  // infinite recursion (since e.g. setWidth is both the polymorphic entry
  // point AND what would resolve for Point suffix '').
  function dispatchSetter(fnName, wasmPointFn, args) {
    const value = args.pop();
    let unit, asNumber;
    if (value === 'auto') {
      unit = Unit.Auto;
      asNumber = undefined;
    } else if (value === 'max-content') {
      unit = Unit.MaxContent;
      asNumber = undefined;
    } else if (value === 'fit-content') {
      unit = Unit.FitContent;
      asNumber = undefined;
    } else if (value === 'stretch') {
      unit = Unit.Stretch;
      asNumber = undefined;
    } else if (typeof value === 'object') {
      unit = value.unit;
      asNumber = value.valueOf();
    } else {
      unit = typeof value === 'string' && value.endsWith('%') ? Unit.Percent : Unit.Point;
      asNumber = parseFloat(value);
      if (value !== undefined && !Number.isNaN(value) && Number.isNaN(asNumber)) {
        throw new Error(`Invalid value ${value} for ${fnName}`);
      }
    }
    if (unit === Unit.Point) {
      if (asNumber !== undefined) {
        return wasmPointFn(this._ptr, ...args, asNumber);
      } else {
        return wasmPointFn(this._ptr, ...args);
      }
    }
    const suffix = {
      [Unit.Percent]: 'Percent',
      [Unit.Auto]: 'Auto',
      [Unit.MaxContent]: 'MaxContent',
      [Unit.FitContent]: 'FitContent',
      [Unit.Stretch]: 'Stretch'
    }[unit];
    if (suffix === undefined) {
      throw new Error(`Failed to execute "${fnName}": Unsupported unit '${value}'`);
    }
    const method = this[`${fnName}${suffix}`];
    if (!method) {
      throw new Error(`Failed to execute "${fnName}": Unsupported unit '${value}'`);
    }
    if (asNumber !== undefined) {
      return method.call(this, ...args, asNumber);
    } else {
      return method.call(this, ...args);
    }
  }

  // --- FinalizationRegistry for automatic cleanup ---
  const configRegistry = new FinalizationRegistry(ptr => {
    lib._YGConfigFree(ptr);
  });
  const nodeRegistry = new FinalizationRegistry(ptr => {
    lib._yogaMeasureFuncs.delete(ptr);
    lib._yogaDirtiedFuncs.delete(ptr);
    lib._YGNodeFinalize(ptr);
  });

  // --- Config class ---
  class ConfigImpl {
    constructor(ptr) {
      this._ptr = ptr;
      configRegistry.register(this, ptr, this);
    }
    setExperimentalFeatureEnabled(feature, enabled) {
      lib._YGConfigSetExperimentalFeatureEnabled(this._ptr, feature, enabled ? 1 : 0);
    }
    isExperimentalFeatureEnabled(feature) {
      return !!lib._YGConfigIsExperimentalFeatureEnabled(this._ptr, feature);
    }
    setPointScaleFactor(factor) {
      lib._YGConfigSetPointScaleFactor(this._ptr, factor);
    }
    getErrata() {
      return lib._YGConfigGetErrata(this._ptr);
    }
    setErrata(errata) {
      lib._YGConfigSetErrata(this._ptr, errata);
    }
    useWebDefaults() {
      return !!lib._YGConfigGetUseWebDefaults(this._ptr);
    }
    setUseWebDefaults(useWebDefaults) {
      lib._YGConfigSetUseWebDefaults(this._ptr, useWebDefaults ? 1 : 0);
    }
  }

  // --- Node class ---
  class NodeImpl {
    constructor(ptr) {
      this._ptr = ptr;
      this._children = [];
      this._parent = null;
      nodeRegistry.register(this, ptr, this);
    }

    // --- Tree hierarchy ---
    insertChild(child, index) {
      lib._YGNodeInsertChild(this._ptr, child._ptr, index);
      this._children.splice(index, 0, child);
      child._parent = this;
    }
    removeChild(child) {
      lib._YGNodeRemoveChild(this._ptr, child._ptr);
      const idx = this._children.indexOf(child);
      if (idx !== -1) {
        this._children.splice(idx, 1);
      }
      child._parent = null;
    }
    getChildCount() {
      return this._children.length;
    }
    getChild(index) {
      return this._children[index];
    }
    getParent() {
      return this._parent;
    }

    // --- Lifecycle ---
    reset() {
      lib._yogaMeasureFuncs.delete(this._ptr);
      lib._yogaDirtiedFuncs.delete(this._ptr);
      this._children = [];
      this._parent = null;
      lib._YGNodeReset(this._ptr);
    }

    // --- Style setters ---
    copyStyle(other) {
      lib._YGNodeCopyStyle(this._ptr, other._ptr);
    }
    setPositionType(positionType) {
      lib._YGNodeStyleSetPositionType(this._ptr, positionType);
    }
    setPosition(edge, position) {
      dispatchSetter.call(this, 'setPosition', lib._YGNodeStyleSetPosition, [edge, position]);
    }
    setPositionPercent(edge, position) {
      lib._YGNodeStyleSetPositionPercent(this._ptr, edge, position);
    }
    setPositionAuto(edge) {
      lib._YGNodeStyleSetPositionAuto(this._ptr, edge);
    }
    setAlignContent(alignContent) {
      lib._YGNodeStyleSetAlignContent(this._ptr, alignContent);
    }
    setAlignItems(alignItems) {
      lib._YGNodeStyleSetAlignItems(this._ptr, alignItems);
    }
    setAlignSelf(alignSelf) {
      lib._YGNodeStyleSetAlignSelf(this._ptr, alignSelf);
    }
    setFlexDirection(flexDirection) {
      lib._YGNodeStyleSetFlexDirection(this._ptr, flexDirection);
    }
    setFlexWrap(flexWrap) {
      lib._YGNodeStyleSetFlexWrap(this._ptr, flexWrap);
    }
    setJustifyContent(justifyContent) {
      lib._YGNodeStyleSetJustifyContent(this._ptr, justifyContent);
    }
    setDirection(direction) {
      lib._YGNodeStyleSetDirection(this._ptr, direction);
    }
    setMargin(edge, margin) {
      dispatchSetter.call(this, 'setMargin', lib._YGNodeStyleSetMargin, [edge, margin]);
    }
    setMarginPercent(edge, margin) {
      lib._YGNodeStyleSetMarginPercent(this._ptr, edge, margin);
    }
    setMarginAuto(edge) {
      lib._YGNodeStyleSetMarginAuto(this._ptr, edge);
    }
    setOverflow(overflow) {
      lib._YGNodeStyleSetOverflow(this._ptr, overflow);
    }
    setDisplay(display) {
      lib._YGNodeStyleSetDisplay(this._ptr, display);
    }
    setFlex(flex) {
      lib._YGNodeStyleSetFlex(this._ptr, flex);
    }
    setFlexBasis(flexBasis) {
      dispatchSetter.call(this, 'setFlexBasis', lib._YGNodeStyleSetFlexBasis, [flexBasis]);
    }
    setFlexBasisPercent(flexBasis) {
      lib._YGNodeStyleSetFlexBasisPercent(this._ptr, flexBasis);
    }
    setFlexBasisAuto() {
      lib._YGNodeStyleSetFlexBasisAuto(this._ptr);
    }
    setFlexBasisMaxContent() {
      lib._YGNodeStyleSetFlexBasisMaxContent(this._ptr);
    }
    setFlexBasisFitContent() {
      lib._YGNodeStyleSetFlexBasisFitContent(this._ptr);
    }
    setFlexBasisStretch() {
      lib._YGNodeStyleSetFlexBasisStretch(this._ptr);
    }
    setFlexGrow(flexGrow) {
      lib._YGNodeStyleSetFlexGrow(this._ptr, flexGrow);
    }
    setFlexShrink(flexShrink) {
      lib._YGNodeStyleSetFlexShrink(this._ptr, flexShrink);
    }
    setWidth(width) {
      dispatchSetter.call(this, 'setWidth', lib._YGNodeStyleSetWidth, [width]);
    }
    setWidthPercent(width) {
      lib._YGNodeStyleSetWidthPercent(this._ptr, width);
    }
    setWidthAuto() {
      lib._YGNodeStyleSetWidthAuto(this._ptr);
    }
    setWidthMaxContent() {
      lib._YGNodeStyleSetWidthMaxContent(this._ptr);
    }
    setWidthFitContent() {
      lib._YGNodeStyleSetWidthFitContent(this._ptr);
    }
    setWidthStretch() {
      lib._YGNodeStyleSetWidthStretch(this._ptr);
    }
    setHeight(height) {
      dispatchSetter.call(this, 'setHeight', lib._YGNodeStyleSetHeight, [height]);
    }
    setHeightPercent(height) {
      lib._YGNodeStyleSetHeightPercent(this._ptr, height);
    }
    setHeightAuto() {
      lib._YGNodeStyleSetHeightAuto(this._ptr);
    }
    setHeightMaxContent() {
      lib._YGNodeStyleSetHeightMaxContent(this._ptr);
    }
    setHeightFitContent() {
      lib._YGNodeStyleSetHeightFitContent(this._ptr);
    }
    setHeightStretch() {
      lib._YGNodeStyleSetHeightStretch(this._ptr);
    }
    setMinWidth(minWidth) {
      dispatchSetter.call(this, 'setMinWidth', lib._YGNodeStyleSetMinWidth, [minWidth]);
    }
    setMinWidthPercent(minWidth) {
      lib._YGNodeStyleSetMinWidthPercent(this._ptr, minWidth);
    }
    setMinWidthMaxContent() {
      lib._YGNodeStyleSetMinWidthMaxContent(this._ptr);
    }
    setMinWidthFitContent() {
      lib._YGNodeStyleSetMinWidthFitContent(this._ptr);
    }
    setMinWidthStretch() {
      lib._YGNodeStyleSetMinWidthStretch(this._ptr);
    }
    setMinHeight(minHeight) {
      dispatchSetter.call(this, 'setMinHeight', lib._YGNodeStyleSetMinHeight, [minHeight]);
    }
    setMinHeightPercent(minHeight) {
      lib._YGNodeStyleSetMinHeightPercent(this._ptr, minHeight);
    }
    setMinHeightMaxContent() {
      lib._YGNodeStyleSetMinHeightMaxContent(this._ptr);
    }
    setMinHeightFitContent() {
      lib._YGNodeStyleSetMinHeightFitContent(this._ptr);
    }
    setMinHeightStretch() {
      lib._YGNodeStyleSetMinHeightStretch(this._ptr);
    }
    setMaxWidth(maxWidth) {
      dispatchSetter.call(this, 'setMaxWidth', lib._YGNodeStyleSetMaxWidth, [maxWidth]);
    }
    setMaxWidthPercent(maxWidth) {
      lib._YGNodeStyleSetMaxWidthPercent(this._ptr, maxWidth);
    }
    setMaxWidthMaxContent() {
      lib._YGNodeStyleSetMaxWidthMaxContent(this._ptr);
    }
    setMaxWidthFitContent() {
      lib._YGNodeStyleSetMaxWidthFitContent(this._ptr);
    }
    setMaxWidthStretch() {
      lib._YGNodeStyleSetMaxWidthStretch(this._ptr);
    }
    setMaxHeight(maxHeight) {
      dispatchSetter.call(this, 'setMaxHeight', lib._YGNodeStyleSetMaxHeight, [maxHeight]);
    }
    setMaxHeightPercent(maxHeight) {
      lib._YGNodeStyleSetMaxHeightPercent(this._ptr, maxHeight);
    }
    setMaxHeightMaxContent() {
      lib._YGNodeStyleSetMaxHeightMaxContent(this._ptr);
    }
    setMaxHeightFitContent() {
      lib._YGNodeStyleSetMaxHeightFitContent(this._ptr);
    }
    setMaxHeightStretch() {
      lib._YGNodeStyleSetMaxHeightStretch(this._ptr);
    }
    setAspectRatio(aspectRatio) {
      lib._YGNodeStyleSetAspectRatio(this._ptr, aspectRatio);
    }
    setBorder(edge, border) {
      lib._YGNodeStyleSetBorder(this._ptr, edge, border);
    }
    setPadding(edge, padding) {
      dispatchSetter.call(this, 'setPadding', lib._YGNodeStyleSetPadding, [edge, padding]);
    }
    setPaddingPercent(edge, padding) {
      lib._YGNodeStyleSetPaddingPercent(this._ptr, edge, padding);
    }
    setGap(gutter, gapLength) {
      dispatchSetter.call(this, 'setGap', lib._YGNodeStyleSetGap, [gutter, gapLength]);
    }
    setGapPercent(gutter, gapLength) {
      lib._YGNodeStyleSetGapPercent(this._ptr, gutter, gapLength);
    }
    setBoxSizing(boxSizing) {
      lib._YGNodeStyleSetBoxSizing(this._ptr, boxSizing);
    }
    setIsReferenceBaseline(isReferenceBaseline) {
      lib._YGNodeSetIsReferenceBaseline(this._ptr, isReferenceBaseline ? 1 : 0);
    }
    setAlwaysFormsContainingBlock(alwaysFormsContainingBlock) {
      lib._YGNodeSetAlwaysFormsContainingBlock(this._ptr, alwaysFormsContainingBlock ? 1 : 0);
    }

    // --- Style getters ---
    getPositionType() {
      return lib._YGNodeStyleGetPositionType(this._ptr);
    }
    getPosition(edge) {
      lib._jswrap_YGNodeStyleGetPosition(this._ptr, edge);
      return readYGValue();
    }
    getAlignContent() {
      return lib._YGNodeStyleGetAlignContent(this._ptr);
    }
    getAlignItems() {
      return lib._YGNodeStyleGetAlignItems(this._ptr);
    }
    getAlignSelf() {
      return lib._YGNodeStyleGetAlignSelf(this._ptr);
    }
    getFlexDirection() {
      return lib._YGNodeStyleGetFlexDirection(this._ptr);
    }
    getFlexWrap() {
      return lib._YGNodeStyleGetFlexWrap(this._ptr);
    }
    getJustifyContent() {
      return lib._YGNodeStyleGetJustifyContent(this._ptr);
    }
    getDirection() {
      return lib._YGNodeStyleGetDirection(this._ptr);
    }
    getMargin(edge) {
      lib._jswrap_YGNodeStyleGetMargin(this._ptr, edge);
      return readYGValue();
    }
    getOverflow() {
      return lib._YGNodeStyleGetOverflow(this._ptr);
    }
    getDisplay() {
      return lib._YGNodeStyleGetDisplay(this._ptr);
    }
    getFlexBasis() {
      lib._jswrap_YGNodeStyleGetFlexBasis(this._ptr);
      return readYGValue();
    }
    getFlexGrow() {
      return lib._YGNodeStyleGetFlexGrow(this._ptr);
    }
    getFlexShrink() {
      return lib._YGNodeStyleGetFlexShrink(this._ptr);
    }
    getWidth() {
      lib._jswrap_YGNodeStyleGetWidth(this._ptr);
      return readYGValue();
    }
    getHeight() {
      lib._jswrap_YGNodeStyleGetHeight(this._ptr);
      return readYGValue();
    }
    getMinWidth() {
      lib._jswrap_YGNodeStyleGetMinWidth(this._ptr);
      return readYGValue();
    }
    getMinHeight() {
      lib._jswrap_YGNodeStyleGetMinHeight(this._ptr);
      return readYGValue();
    }
    getMaxWidth() {
      lib._jswrap_YGNodeStyleGetMaxWidth(this._ptr);
      return readYGValue();
    }
    getMaxHeight() {
      lib._jswrap_YGNodeStyleGetMaxHeight(this._ptr);
      return readYGValue();
    }
    getAspectRatio() {
      return lib._YGNodeStyleGetAspectRatio(this._ptr);
    }
    getBorder(edge) {
      return lib._YGNodeStyleGetBorder(this._ptr, edge);
    }
    getPadding(edge) {
      lib._jswrap_YGNodeStyleGetPadding(this._ptr, edge);
      return readYGValue();
    }
    getGap(gutter) {
      lib._jswrap_YGNodeStyleGetGap(this._ptr, gutter);
      return readYGValue();
    }
    getBoxSizing() {
      return lib._YGNodeStyleGetBoxSizing(this._ptr);
    }
    isReferenceBaseline() {
      return !!lib._YGNodeIsReferenceBaseline(this._ptr);
    }

    // --- Measure / Dirtied ---
    setMeasureFunc(measureFunc) {
      if (measureFunc) {
        lib._yogaMeasureFuncs.set(this._ptr, measureFunc);
        lib._jswrap_YGNodeSetMeasureFunc(this._ptr);
      } else {
        this.unsetMeasureFunc();
      }
    }
    unsetMeasureFunc() {
      lib._yogaMeasureFuncs.delete(this._ptr);
      lib._jswrap_YGNodeUnsetMeasureFunc(this._ptr);
    }
    setDirtiedFunc(dirtiedFunc) {
      if (dirtiedFunc) {
        const nodeWeakRef = new WeakRef(this);
        lib._yogaDirtiedFuncs.set(this._ptr, () => {
          const node = nodeWeakRef.deref();
          if (node) dirtiedFunc(node);
        });
        lib._jswrap_YGNodeSetDirtiedFunc(this._ptr);
      } else {
        this.unsetDirtiedFunc();
      }
    }
    unsetDirtiedFunc() {
      lib._yogaDirtiedFuncs.delete(this._ptr);
      lib._jswrap_YGNodeUnsetDirtiedFunc(this._ptr);
    }

    // --- Dirty / Layout ---
    markDirty() {
      lib._YGNodeMarkDirty(this._ptr);
    }
    isDirty() {
      return !!lib._YGNodeIsDirty(this._ptr);
    }
    markLayoutSeen() {
      lib._YGNodeSetHasNewLayout(this._ptr, 0);
    }
    hasNewLayout() {
      return !!lib._YGNodeGetHasNewLayout(this._ptr);
    }
    calculateLayout(width = NaN, height = NaN, direction = Direction.LTR) {
      lib._YGNodeCalculateLayout(this._ptr, width, height, direction);
    }

    // --- Layout getters ---
    getComputedLeft() {
      return lib._YGNodeLayoutGetLeft(this._ptr);
    }
    getComputedRight() {
      return lib._YGNodeLayoutGetRight(this._ptr);
    }
    getComputedTop() {
      return lib._YGNodeLayoutGetTop(this._ptr);
    }
    getComputedBottom() {
      return lib._YGNodeLayoutGetBottom(this._ptr);
    }
    getComputedWidth() {
      return lib._YGNodeLayoutGetWidth(this._ptr);
    }
    getComputedHeight() {
      return lib._YGNodeLayoutGetHeight(this._ptr);
    }
    getComputedHadOverflow() {
      return !!lib._YGNodeLayoutGetHadOverflow(this._ptr);
    }
    getComputedLayout() {
      return {
        left: lib._YGNodeLayoutGetLeft(this._ptr),
        right: lib._YGNodeLayoutGetRight(this._ptr),
        top: lib._YGNodeLayoutGetTop(this._ptr),
        bottom: lib._YGNodeLayoutGetBottom(this._ptr),
        width: lib._YGNodeLayoutGetWidth(this._ptr),
        height: lib._YGNodeLayoutGetHeight(this._ptr),
        hadOverflow: !!lib._YGNodeLayoutGetHadOverflow(this._ptr)
      };
    }
    getComputedMargin(edge) {
      return lib._YGNodeLayoutGetMargin(this._ptr, edge);
    }
    getComputedBorder(edge) {
      return lib._YGNodeLayoutGetBorder(this._ptr, edge);
    }
    getComputedPadding(edge) {
      return lib._YGNodeLayoutGetPadding(this._ptr, edge);
    }
  }
  return {
    Config: {
      create() {
        return new ConfigImpl(lib._YGConfigNew());
      }
    },
    Node: {
      create(config) {
        if (config) {
          return new NodeImpl(lib._YGNodeNewWithConfig(config._ptr));
        }
        return new NodeImpl(lib._YGNodeNew());
      },
      createDefault() {
        return new NodeImpl(lib._YGNodeNew());
      },
      createWithConfig(config) {
        return new NodeImpl(lib._YGNodeNewWithConfig(config._ptr));
      }
    },
    ...YGEnums
  };
}
//# sourceMappingURL=wrapAssembly.js.map