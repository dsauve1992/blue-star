interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LabelLayoutParams {
  dataIndex: number;
  rect: Rect;
  labelRect: Rect;
}

const LABEL_GAP = 4;
const VERTICAL_STEPS = [0, 1, -1, 2, -2];

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

export function createRrgLabelLayout() {
  let placed: Rect[] = [];

  return ({ dataIndex, rect, labelRect }: LabelLayoutParams) => {
    if (dataIndex === 0) {
      placed = [];
    }

    const leftX = rect.x - LABEL_GAP - labelRect.width;
    const candidates = [labelRect.x, leftX].flatMap((x) =>
      VERTICAL_STEPS.map((step) => ({
        ...labelRect,
        x,
        y: labelRect.y + step * labelRect.height,
      })),
    );

    const chosen =
      candidates.find((c) => !placed.some((p) => intersects(c, p))) ??
      labelRect;
    placed.push(rect, chosen);

    return { dx: chosen.x - labelRect.x, dy: chosen.y - labelRect.y };
  };
}
