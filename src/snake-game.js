export const GRID_SIZE = 16;

export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

export function serializePosition(position) {
  return `${position.x},${position.y}`;
}

export function createInitialState(random = Math.random) {
  const snake = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 }
  ];

  return {
    gridSize: GRID_SIZE,
    snake,
    direction: "right",
    nextDirection: "right",
    food: getRandomFreeCell(snake, GRID_SIZE, random),
    score: 0,
    gameOver: false,
    paused: false
  };
}

export function queueDirection(state, requestedDirection) {
  if (!DIRECTIONS[requestedDirection]) {
    return state;
  }

  if (requestedDirection === OPPOSITES[state.direction]) {
    return state;
  }

  return {
    ...state,
    nextDirection: requestedDirection
  };
}

export function togglePause(state) {
  if (state.gameOver) {
    return state;
  }

  return {
    ...state,
    paused: !state.paused
  };
}

export function tick(state, random = Math.random) {
  if (state.gameOver || state.paused) {
    return state;
  }

  const direction = state.nextDirection;
  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  const nextHead = {
    x: head.x + delta.x,
    y: head.y + delta.y
  };

  if (isOutOfBounds(nextHead, state.gridSize)) {
    return {
      ...state,
      direction,
      gameOver: true
    };
  }

  const willEat = positionsEqual(nextHead, state.food);
  const nextSnake = [nextHead, ...state.snake];

  if (!willEat) {
    nextSnake.pop();
  }

  if (hasSelfCollision(nextSnake)) {
    return {
      ...state,
      direction,
      gameOver: true
    };
  }

  const nextFood = willEat
    ? getRandomFreeCell(nextSnake, state.gridSize, random)
    : state.food;

  return {
    ...state,
    snake: nextSnake,
    direction,
    nextDirection: direction,
    food: nextFood,
    score: state.score + (willEat ? 1 : 0)
  };
}

export function getRandomFreeCell(snake, gridSize, random = Math.random) {
  const occupied = new Set(snake.map(serializePosition));
  const freeCells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const cell = { x, y };
      if (!occupied.has(serializePosition(cell))) {
        freeCells.push(cell);
      }
    }
  }

  if (freeCells.length === 0) {
    return null;
  }

  const index = Math.floor(random() * freeCells.length);
  return freeCells[index];
}

export function isOutOfBounds(position, gridSize) {
  return (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= gridSize ||
    position.y >= gridSize
  );
}

export function hasSelfCollision(snake) {
  const seen = new Set();

  for (const segment of snake) {
    const key = serializePosition(segment);
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }

  return false;
}

function positionsEqual(a, b) {
  return Boolean(a && b) && a.x === b.x && a.y === b.y;
}
