/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Regression test for https://github.com/react/yoga/issues/2006
// A row of three growable children (flexGrow/flexShrink 1, maxWidth 180) inside
// a 540px container. When the *first* child has a larger minWidth than the
// rest, the first free-space pass used to freeze every item at its max while
// also draining the remaining free space to exactly zero, leaving the second
// pass with nothing to distribute. The children then collapsed to their
// minWidths (60/30/30) instead of growing to fill the row (180/180/180).

#include <gtest/gtest.h>
#include <yoga/Yoga.h>

namespace {

// Lay out a 540px row containing three children, each with flexGrow/
// flexShrink of 1, maxWidth of `maxW` and the given minWidths, and assert
// every child grows to maxWidth (the row exactly fills the container).
void expectAllGrowToMax(float minWidth0, float minWidth1, float minWidth2) {
  YGConfigRef config = YGConfigNew();
  YGNodeRef root = YGNodeNewWithConfig(config);
  YGNodeStyleSetWidth(root, 540.0f);
  YGNodeStyleSetFlexDirection(root, YGFlexDirectionRow);

  float minWidths[] = {minWidth0, minWidth1, minWidth2};
  for (size_t i = 0; i < 3; i++) {
    YGNodeRef child = YGNodeNewWithConfig(config);
    YGNodeStyleSetFlexGrow(child, 1.0f);
    YGNodeStyleSetFlexShrink(child, 1.0f);
    YGNodeStyleSetMaxWidth(child, 180.0f);
    YGNodeStyleSetHeight(child, 30.0f);
    YGNodeStyleSetMinWidth(child, minWidths[i]);
    YGNodeInsertChild(root, child, i);
  }

  YGNodeCalculateLayout(root, 540.0f, 30.0f, YGDirectionLTR);

  for (size_t i = 0; i < 3; i++) {
    YGNodeRef child = YGNodeGetChild(root, i);
    EXPECT_NEAR(180.0f, YGNodeLayoutGetWidth(child), 1e-3f)
        << "child[" << i
        << "] should grow to maxWidth, not collapse to its minWidth";
  }

  YGNodeFreeRecursive(root);
  YGConfigFree(config);
}

} // namespace

TEST(YGFirstChildMinWidth, first_child_larger_minwidth_row) {
  // The originally reported case: the first child has a larger minWidth than
  // the other two, which used to break the whole row.
  expectAllGrowToMax(60.0f, 30.0f, 30.0f);
}

TEST(YGFirstChildMinWidth, other_positions_still_work) {
  // Sanity: placing the outlier minWidth on the second or third child already
  // worked and must keep working.
  expectAllGrowToMax(30.0f, 60.0f, 30.0f);
  expectAllGrowToMax(30.0f, 30.0f, 60.0f);
}

TEST(YGFirstChildMinWidth, uniform_minwidth_row) {
  // All children share the same minWidth: no issue either way.
  expectAllGrowToMax(30.0f, 30.0f, 30.0f);
}
