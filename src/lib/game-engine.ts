const BUTTON_COUNT = 3;
const MOVE_DELAY_MS = 1000;
const TOTAL_SIZE = 160;

const SIZE_TIERS = [
  { size: 80, points: 1, fontSize: '1.5rem' },
  { size: 52, points: 2, fontSize: '1rem' },
  { size: 32, points: 5, fontSize: '0.75rem' },
];

const ROTATIONS = [0, 90, 180, 270];

const COLORS = [
  { r: 8, g: 145, b: 178 },
  { r: 126, g: 34, b: 206 },
  { r: 220, g: 38, b: 38 },
  { r: 234, g: 179, b: 8 },
  { r: 22, g: 163, b: 74 },
  { r: 219, g: 39, b: 119 },
  { r: 249, g: 115, b: 22 },
];

type Position = { x: number; y: number };
type SizeTier = { size: number; points: number; fontSize: string };

let score = 0;
let area: HTMLElement | null = null;
let buttons: HTMLButtonElement[] = [];
let rings: HTMLDivElement[] = [];
let buttonTiers: SizeTier[] = [];
let labels: HTMLSpanElement[] = [];
let moveIntervals: ReturnType<typeof setInterval>[] = [];
let onScoreChange: ((score: number) => void) | null = null;

function selectRandomTier(): SizeTier {
  return SIZE_TIERS[Math.floor(Math.random() * SIZE_TIERS.length)];
}

function applySize(btn: HTMLButtonElement, tier: SizeTier): void {
  btn.style.width = tier.size + 'px';
  btn.style.height = tier.size + 'px';
  btn.style.fontSize = tier.fontSize;
}

function getRandomPosition(existingPositions: Position[]): Position {
  const maxX = (area?.clientWidth ?? 0) - TOTAL_SIZE;
  const maxY = (area?.clientHeight ?? 0) - TOTAL_SIZE;
  let attempts = 0;
  let pos: Position;

  do {
    pos = {
      x: Math.max(0, Math.floor(Math.random() * maxX)),
      y: Math.max(0, Math.floor(Math.random() * maxY)),
    };
    attempts++;
  } while (attempts < 50 && overlapsAny(pos, existingPositions));

  return pos;
}

function overlapsAny(pos: Position, existingPositions: Position[]): boolean {
  for (let i = 0; i < existingPositions.length; i++) {
    const other = existingPositions[i];
    if (
      Math.abs(pos.x - other.x) < TOTAL_SIZE &&
      Math.abs(pos.y - other.y) < TOTAL_SIZE
    ) {
      return true;
    }
  }
  return false;
}

function applyRandomColour(btn: HTMLButtonElement, ring: HTMLDivElement): void {
  const c = COLORS[Math.floor(Math.random() * COLORS.length)];
  btn.style.borderColor = `rgba(${c.r},${c.g},${c.b},0.6)`;
  btn.style.background = `rgba(${c.r},${c.g},${c.b},0.45)`;
  btn.style.boxShadow = `0 0 1.5rem rgba(${c.r},${c.g},${c.b},0.4)`;
  ring.style.borderColor = `rgba(${c.r},${c.g},${c.b},0.3)`;
  ring.style.background = `rgba(${c.r},${c.g},${c.b},0.12)`;
  ring.style.boxShadow = `0 0 1.5rem rgba(${c.r},${c.g},${c.b},0.2)`;
}

function getCurrentPositions(excludeIndex: number): Position[] {
  const positions: Position[] = [];
  for (let i = 0; i < rings.length; i++) {
    if (i === excludeIndex) continue;
    positions.push({
      x: parseInt(rings[i].style.left, 10) || 0,
      y: parseInt(rings[i].style.top, 10) || 0,
    });
  }
  return positions;
}

function moveButton(index: number): void {
  const ring = rings[index];
  const btn = buttons[index];
  const tier = selectRandomTier();
  buttonTiers[index] = tier;
  applySize(btn, tier);
  const existing = getCurrentPositions(index);
  const pos = getRandomPosition(existing);
  ring.style.left = pos.x + 'px';
  ring.style.top = pos.y + 'px';
  const label = labels[index];
  label.textContent = '+' + tier.points;
  const rotation = ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
  label.style.transform = 'rotate(' + rotation + 'deg)';
  applyRandomColour(btn, ring);
}

function createButton(): { btn: HTMLButtonElement; ring: HTMLDivElement; label: HTMLSpanElement } {
  const ring = document.createElement('div');
  ring.className = 'outer-ring';

  const btn = document.createElement('button');
  btn.className = 'target-btn';

  const label = document.createElement('span');
  label.className = 'points-label';
  label.style.display = 'inline-block';
  btn.appendChild(label);

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    const idx = buttons.indexOf(btn);
    score += buttonTiers[idx].points;
    moveButton(idx);
    if (onScoreChange) {
      onScoreChange(score);
    }
  });

  ring.addEventListener('click', function () {
    score--;
    moveButton(rings.indexOf(ring));
    if (onScoreChange) {
      onScoreChange(score);
    }
  });

  ring.appendChild(btn);
  area!.appendChild(ring);
  return { btn, ring, label };
}

function removeAllButtons(): void {
  for (let i = 0; i < rings.length; i++) {
    if (rings[i].parentNode) {
      rings[i].parentNode!.removeChild(rings[i]);
    }
  }
  buttons = [];
  rings = [];
  buttonTiers = [];
  labels = [];
}

function clearAllIntervals(): void {
  for (let i = 0; i < moveIntervals.length; i++) {
    clearInterval(moveIntervals[i]);
  }
  moveIntervals = [];
}

export const Game = {
  start(gameArea: HTMLElement, initialScore: number, callback: ((score: number) => void) | null): void {
    area = gameArea;
    score = initialScore || 0;
    onScoreChange = callback || null;

    removeAllButtons();
    clearAllIntervals();

    for (let i = 0; i < BUTTON_COUNT; i++) {
      const pair = createButton();
      buttons.push(pair.btn);
      rings.push(pair.ring);
      labels.push(pair.label);
      buttonTiers.push(SIZE_TIERS[0]);
    }

    for (let j = 0; j < buttons.length; j++) {
      moveButton(j);
    }

    for (let k = 0; k < buttons.length; k++) {
      ((index: number) => {
        const interval = setInterval(() => {
          moveButton(index);
        }, MOVE_DELAY_MS);
        moveIntervals.push(interval);
      })(k);
    }
  },

  stop(): void {
    clearAllIntervals();
    removeAllButtons();
  },

  getScore(): number {
    return score;
  },
};
