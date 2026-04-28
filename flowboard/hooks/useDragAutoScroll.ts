"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

type Axis = "horizontal" | "vertical" | "both";

const EDGE = 90;
const MAX_SPEED = 22;

export function useDragAutoScroll(
  ref: RefObject<HTMLElement | null>,
  axis: Axis = "vertical",
) {
  useEffect(() => {
    let raf = 0;
    let active = false;
    let lastInput: { clientX: number; clientY: number } | null = null;

    const stop = () => {
      active = false;
      lastInput = null;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const tick = () => {
      if (!active) return;
      const node = ref.current;
      if (node && lastInput) {
        const r = node.getBoundingClientRect();
        if (axis === "horizontal" || axis === "both") {
          const x = lastInput.clientX;
          if (x < r.left + EDGE) {
            const ratio = Math.min(1, (r.left + EDGE - x) / EDGE);
            node.scrollLeft -= MAX_SPEED * ratio;
          } else if (x > r.right - EDGE) {
            const ratio = Math.min(1, (x - (r.right - EDGE)) / EDGE);
            node.scrollLeft += MAX_SPEED * ratio;
          }
        }
        if (axis === "vertical" || axis === "both") {
          const y = lastInput.clientY;
          if (y < r.top + EDGE) {
            const ratio = Math.min(1, (r.top + EDGE - y) / EDGE);
            node.scrollTop -= MAX_SPEED * ratio;
          } else if (y > r.bottom - EDGE) {
            const ratio = Math.min(1, (y - (r.bottom - EDGE)) / EDGE);
            node.scrollTop += MAX_SPEED * ratio;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const cleanup = monitorForElements({
      onDragStart: ({ location }) => {
        active = true;
        lastInput = location.current.input;
        if (!raf) raf = requestAnimationFrame(tick);
      },
      onDrag: ({ location }) => {
        lastInput = location.current.input;
      },
      onDrop: stop,
    });

    return () => {
      stop();
      cleanup();
    };
  }, [ref, axis]);
}
