export type SidebarSwipeInput = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** True when the gesture must begin at the left screen edge (installed PWA). */
  fromEdge: boolean;
};

export const SIDEBAR_SWIPE_MIN_DX = 60;
export const SIDEBAR_SWIPE_EDGE_ZONE = 24;

/**
 * A rightward horizontal swipe opens the mobile sidebar. Vertical scrolling
 * and leftward drags never qualify.
 */
export function shouldOpenSidebar({ startX, startY, endX, endY, fromEdge }: SidebarSwipeInput): boolean {
  const dx = endX - startX;
  const dy = endY - startY;

  if (dx < SIDEBAR_SWIPE_MIN_DX) {
    return false;
  }
  if (Math.abs(dx) <= Math.abs(dy) * 2) {
    return false;
  }
  if (fromEdge && startX > SIDEBAR_SWIPE_EDGE_ZONE) {
    return false;
  }
  return true;
}
