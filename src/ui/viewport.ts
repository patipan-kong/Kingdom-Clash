/** CSS/client coordinates are separate from logical render coordinates and simulation world units. */
export type Point = {
    x: number;
    y: number;
};
export type Rect = Point & {
    width: number;
    height: number;
};
export type Insets = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};
export function safeRect(view: Rect, insets: Insets): Rect { return { x: view.x + insets.left, y: view.y + insets.top, width: Math.max(1, view.width - insets.left - insets.right), height: Math.max(1, view.height - insets.top - insets.bottom) }; }
export function gameplaySize(width: number, height: number, mobile: boolean) { return { width: mobile ? 540 * Math.max(1, width) / Math.max(1, height) : 960, height: 540 }; }
export function coordinateTransform(canvas: Rect, logical: {
    width: number;
    height: number;
}) {
    const sx = canvas.width / logical.width, sy = canvas.height / logical.height;
    return { scale: sx, cssToLogical: (p: Point) => ({ x: (p.x - canvas.x) / sx, y: (p.y - canvas.y) / sy }), logicalToCss: (p: Point) => ({ x: canvas.x + p.x * sx, y: canvas.y + p.y * sy }), cssLength: (n: number) => n / sx };
}
export function gameTransform(game: {
    canvas: HTMLCanvasElement;
    scale: {
        width: number;
        height: number;
    };
}) { return coordinateTransform(game.canvas.getBoundingClientRect(), game.scale); }
/** Camera performs viewport/scroll/zoom conversion before the existing world projection. */
export function cameraToWorld(p: Point, camera: {
    getWorldPoint: (x: number, y: number) => Point;
}, projection: Point) { const v = camera.getWorldPoint(p.x, p.y); return { x: v.x / projection.x, y: v.y / projection.y }; }
