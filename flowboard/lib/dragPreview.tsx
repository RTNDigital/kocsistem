"use client";

import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";

interface Args {
  nativeSetDragImage: ((image: Element, x: number, y: number) => void) | null;
  render: () => ReactNode;
  offset?: { x: string; y: string };
}

export function renderReactDragPreview({ nativeSetDragImage, render, offset }: Args) {
  setCustomNativeDragPreview({
    nativeSetDragImage,
    getOffset: pointerOutsideOfPreview(offset ?? { x: "12px", y: "8px" }),
    render({ container }) {
      const root = createRoot(container);
      root.render(<>{render()}</>);
      return () => {
        queueMicrotask(() => root.unmount());
      };
    },
  });
}
