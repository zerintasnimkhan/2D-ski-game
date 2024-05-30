import {
  Application,
  Sprite,
  Text,
  TextStyle,
  Container,
  Graphics,
} from "pixi.js";
import {
  Joystick,
  JoystickSettings,
  JoystickChangeEvent,
} from "./control/joystick";


const app = new Application<HTMLCanvasElement>({
  view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  backgroundColor: 0xb0e0e6,
  width: window.innerWidth,
  height: window.innerHeight,
});

const backgroundMusic = new Audio('sounds/background2.wav');
const collectSound = new Audio('sounds/collect.wav');
const gameOverSound = new Audio('sounds/gameover.wav');

const audioContext = new AudioContext();
const mediaElementSources = new Map<HTMLMediaElement, MediaElementAudioSourceNode>();

function playAudio(audio: HTMLAudioElement) {
  // const source = audioContext.createMediaElementSource(audio);
  // source.connect(audioContext.destination);

  if (!audio.paused) {
    audio.pause();
  }
  if (mediaElementSources.has(audio)) {
    return;
  }

  const sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(audioContext.destination);

  mediaElementSources.set(audio, sourceNode);

  audio.play();
}

playAudio(backgroundMusic);

const player: Sprite = Sprite.from("images/player.png");

player.anchor.set(0.5);
player.x = app.screen.width / 2;
player.y = app.screen.height / 2;

app.stage.addChild(player);
player.scale.set(4, 4);

type KeyState = {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
  Enter: boolean; 
};

const keys: KeyState = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  Enter: false, 
};

window.addEventListener("keydown", (event) => {
  if (event.key in keys) {
    keys[event.key as keyof KeyState] = true;
    if (event.key === "Enter") {
      handleEnterKey();
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key in keys) {
    keys[event.key as keyof KeyState] = false;
  }
});

const maxSpeed = 5;
const acceleration = 0.2;
const deceleration = 0.1;
let velocity = { x: 0, y: 0 };
let targetRotation = 0;

const appWidth = app.screen.width;
const appHeight = app.screen.height;

// Update player position within the screen boundaries
function updatePlayerPosition() {
  if (player.x < player.width / 2) {
    player.x = player.width / 2;
  } else if (player.x > appWidth - player.width / 2) {
    player.x = appWidth - player.width / 2;
  }

  if (player.y < player.height / 2) {
    player.y = player.height / 2;
  } else if (player.y > appHeight - player.height / 2) {
    player.y = appHeight - player.height / 2;
  }
}


// Initial obstacle speed
let obstacleSpeed = maxSpeed / 2;

// Score variable
let score = 0;
const scoreText = new Text(
  `Score: ${score}`,
  new TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "white",
  })
);
scoreText.x = 10;
scoreText.y = 10;
app.stage.addChild(scoreText);

// Linear interpolation function
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

const obstacleTextures = [
  "images/tree.png",
  "images/burg.png",
  "images/ice.png",
  "images/brunch.png",
  "images/burg.png",
];
const obstacles: Sprite[] = [];
const obstacleCount = 10;

const collectibleTextures = [
  "images/star.png",
  "images/coin.png",
  "images/gem.png",
  "images/gemBlue.png",
  "images/gemRed.png",
];
const collectibles: Sprite[] = [];
const collectibleCount = 5;

// Function to create a random obstacle
function createRandomObstacle(): Sprite {
  const texture =
    obstacleTextures[Math.floor(Math.random() * obstacleTextures.length)];
  const obstacle = Sprite.from(texture);
  obstacle.anchor.set(0.5);
  obstacle.x = Math.random() * app.screen.width;
  obstacle.y = app.screen.height + Math.random() * app.screen.height;
  return obstacle;
}

// Function to create a random collectible
function createRandomCollectible(): Sprite {
  const texture =
    collectibleTextures[Math.floor(Math.random() * collectibleTextures.length)];
  const collectible = Sprite.from(texture);
  collectible.anchor.set(0.5);
  collectible.x = Math.random() * app.screen.width;
  collectible.y = app.screen.height + Math.random() * app.screen.height;
  return collectible;
}

// Create initial obstacles
for (let i = 0; i < obstacleCount; i++) {
  const obstacle = createRandomObstacle();
  obstacles.push(obstacle);
  app.stage.addChild(obstacle);
  obstacle.scale.set(0.6, 0.6);
}

// Create initial collectibles
for (let i = 0; i < collectibleCount; i++) {
  const collectible = createRandomCollectible();
  collectibles.push(collectible);
  app.stage.addChild(collectible);
  //collectible.scale.set(2, 2);
}

// Collision detection function
function isColliding(a: Sprite, b: Sprite): boolean {
  const aBounds = a.getBounds();
  const bBounds = b.getBounds();
  return (
    aBounds.x < bBounds.x + bBounds.width &&
    aBounds.x + aBounds.width > bBounds.x &&
    aBounds.y < bBounds.y + bBounds.height &&
    aBounds.y + aBounds.height > bBounds.y
  );
}

let gameState: "start" | "pause" | "play" | "gameOver" = "start";

function updateGameState(newState: "start" | "pause" | "play" | "gameOver") {
  gameState = newState;

  if (newState === "play") {
    player.tint = 0xffffff; // Reset player color
  }

  startButtonContainer.visible = newState === "start";
  playButtonContainer.visible = newState === "pause";
  pauseButtonContainer.visible = newState === "play";
  gameOverText.visible = newState === "gameOver";
  playAgainContainer.visible = newState === "gameOver";
}

function resetGame() {
  score = 0;
  scoreText.text = `Score: ${score}`;
  player.x = app.screen.width / 2;
  player.y = app.screen.height / 2;
  velocity = { x: 0, y: 0 };
  obstacleSpeed = maxSpeed / 2;
  player.tint = 0xffffff; // Reset player color

  for (const obstacle of obstacles) {
    obstacle.x = Math.random() * app.screen.width;
    obstacle.y = app.screen.height + Math.random() * app.screen.height;
  }

  for (const collectible of collectibles) {
    collectible.x = Math.random() * app.screen.width;
    collectible.y = app.screen.height + Math.random() * app.screen.height;
  }

  updateGameState("play");
}

app.ticker.add(() => {
  if (gameState === "play") {
    player.x += velocity.x;
    player.y += velocity.y;
    
    // Ensure the player stays within the boundaries
    updatePlayerPosition();
    score += 0.1;
    scoreText.text = `Score: ${Math.round(score)}`;

    // Acceleration
    if (keys.ArrowUp) {
      velocity.y = Math.max(velocity.y - acceleration, -maxSpeed);
    }
    if (keys.ArrowDown) {
      velocity.y = Math.min(velocity.y + acceleration, maxSpeed);
    }
    if (keys.ArrowLeft) {
      velocity.x = Math.max(velocity.x - acceleration, -maxSpeed);
    }
    if (keys.ArrowRight) {
      velocity.x = Math.min(velocity.x + acceleration, maxSpeed);
    }

    // Deceleration
    if (!keys.ArrowUp && !keys.ArrowDown) {
      if (velocity.y > 0) {
        velocity.y = Math.max(velocity.y - deceleration, 0);
      } else {
        velocity.y = Math.min(velocity.y + deceleration, 0);
      }
    }

    if (!keys.ArrowLeft && !keys.ArrowRight) {
      if (velocity.x > 0) {
        velocity.x = Math.max(velocity.x - deceleration, 0);
      } else {
        velocity.x = Math.min(velocity.x + deceleration, 0);
      }
    }

    player.x += velocity.x;
    player.y += velocity.y;

    // Update player rotation based on horizontal velocity
    if (velocity.x < 0) {
      targetRotation = 0.349;
    } else if (velocity.x > 0) {
      targetRotation = -0.349;
    } else {
      targetRotation = 0;
    }

    player.rotation = lerp(player.rotation, targetRotation, 0.1);

    // Move obstacles upwards
    for (const obstacle of obstacles) {
      obstacle.y -= obstacleSpeed;

      // Recycle obstacle if it goes out of screen
      if (obstacle.y < -obstacle.height) {
        obstacle.y = app.screen.height + Math.random() * app.screen.height;
        obstacle.x = Math.random() * app.screen.width;
      }

      // Check for collision with player
      if (isColliding(player, obstacle)) {
        console.log("Collision detected!");
        playAudio(collectSound);
        // Handle collision (reduce speed and mark red)
        velocity.x *= 0.5;
        velocity.y *= 0.5;
        player.tint = 0xff0000; // Mark player red
        setTimeout(() => {
          player.tint = 0xffffff;
        }, 200);
        score -= 5;
        scoreText.text = `Score: ${Math.round(score)}`;
      }
    }

    // Move collectibles upwards
    for (const collectible of collectibles) {
      collectible.y -= obstacleSpeed;

      // Recycle collectible if it goes out of screen
      if (collectible.y < -collectible.height) {
        collectible.y = app.screen.height + Math.random() * app.screen.height;
        collectible.x = Math.random() * app.screen.width;
      }

      // Check for collision with player
      if (isColliding(player, collectible)) {
        console.log("Collectible collected!");
        // Handle collectible collection (remove and reset position)
        collectible.y = app.screen.height + Math.random() * app.screen.height;
        collectible.x = Math.random() * app.screen.width;
        score += 5;
        scoreText.text = `Score: ${score}`;
      }
    }

    if (score < 0) {
      updateGameState("gameOver");
      playAudio(gameOverSound);
    }
  }
});

setInterval(() => {
  if (gameState === "play") {
    obstacleSpeed += 0.1;
  }
}, 5000);

window.addEventListener("resize", () => {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  player.x = app.screen.width / 2;
  player.y = app.screen.height / 2;
});

const joystickSettings: JoystickSettings = {
  width: 120,
  height: 120,
  speed: maxSpeed,
  onChange: (event: JoystickChangeEvent) => {
    if (gameState === "play") {
      const angle = Math.atan2(event.velocity.y, event.velocity.x);
      const speed = Math.sqrt(
        event.velocity.x * event.velocity.x +
          event.velocity.y * event.velocity.y
      );
      velocity.x = Math.cos(angle) * speed;
      velocity.y = Math.sin(angle) * speed;

      if (velocity.x < 0) {
        targetRotation = 0.349;
      } else if (velocity.x > 0) {
        targetRotation = -0.349;
      } else {
        targetRotation = 0;
      }
    }
  },

  onStart: () => {
    console.log("Joystick started");
  },

  onEnd: () => {
    console.log("Joystick ended");

    const slowDownInterval = setInterval(() => {
      if (
        Math.abs(velocity.x) <= deceleration &&
        Math.abs(velocity.y) <= deceleration
      ) {
        velocity.x = 0;
        velocity.y = 0;
        clearInterval(slowDownInterval);
      } else {
        if (velocity.x > 0) {
          velocity.x = Math.max(velocity.x - deceleration, 0);
        } else {
          velocity.x = Math.min(velocity.x + deceleration, 0);
        }
        if (velocity.y > 0) {
          velocity.y = Math.max(velocity.y - deceleration, 0);
        } else {
          velocity.y = Math.min(velocity.y + deceleration, 0);
        }
      }
    }, 16);
  },
};

const joystick = new Joystick(joystickSettings);
joystick.position.set(
  joystick.width / 2 + 20,
  app.screen.height - joystick.height / 2 - 20
);
app.stage.addChild(joystick);

const uiContainer = new Container();
app.stage.addChild(uiContainer);

const buttonStyle = new TextStyle({
  fontFamily: "Arial",
  fontSize: 24,
  fill: "white",
  stroke: "black",
  strokeThickness: 4,
});

function createButton(
  text: string,
  x: number,
  y: number,
  onClick: () => void
): Container {
  const button = new Container();
  const buttonBackground = new Graphics()
    .beginFill(0x000000, 0.5)
    .drawRoundedRect(0, 0, 120, 50, 10)
    .endFill();
  const buttonText = new Text(text, buttonStyle);
  buttonText.anchor.set(0.5);
  buttonText.x = 60;
  buttonText.y = 25;

  button.addChild(buttonBackground);
  button.addChild(buttonText);

  buttonBackground.eventMode = 'dynamic';
  buttonBackground.on("pointerdown", onClick);

  button.x = x;
  button.y = y;

  return button;
}


const startButtonContainer = createButton(
  "Start",
  app.screen.width / 2 - 60,
  app.screen.height / 2 - 25,
  () => updateGameState("play")
);
uiContainer.addChild(startButtonContainer);
startButtonContainer.addEventListener("click", () => {
  playAudio(backgroundMusic);
});

const pauseButtonContainer = createButton(
  "Pause",
  app.screen.width - 140,
  20,
  () => updateGameState("pause")
);
pauseButtonContainer.visible = false;
uiContainer.addChild(pauseButtonContainer);

const playButtonContainer = createButton(
  "Play",
  app.screen.width - 140,
  20,
  () => updateGameState("play")
);
playButtonContainer.visible = false;
uiContainer.addChild(playButtonContainer);

const gameOverText = new Text(
  "Game Over",
  new TextStyle({
    fontFamily: "Arial",
    fontSize: 48,
    fill: "red",
    stroke: "black",
    strokeThickness: 6,
  })
);
gameOverText.x = app.screen.width / 2 - gameOverText.width / 2;
gameOverText.y = app.screen.height / 2 - gameOverText.height / 2;
gameOverText.visible = false;
uiContainer.addChild(gameOverText);

const playAgainContainer = new Container();
playAgainContainer.visible = false;
uiContainer.addChild(playAgainContainer);

const playAgainText = new Text(
  "Play Again?",
  new TextStyle({
    fontFamily: "Arial",
    fontSize: 36,
    fill: "white",
    stroke: "black",
    strokeThickness: 4,
  })
);
playAgainText.anchor.set(0.5);
playAgainText.x = app.screen.width / 2;
playAgainText.y = app.screen.height / 2 - 50;
playAgainContainer.addChild(playAgainText);

const yesButton = createButton(
  "Yes",
  app.screen.width / 2 - 100,
  app.screen.height / 2 + 20,
  () => {
    resetGame();
    updateGameState("play");
  }
);
playAgainContainer.addChild(yesButton);

const noButton = createButton(
  "No",
  app.screen.width / 2 + 32,
  app.screen.height / 2 + 20,
  () => {
    playAgainContainer.visible = false;
  }
);
playAgainContainer.addChild(noButton);

function handleEnterKey() {
  if (gameState === "start") {
    updateGameState("play");
  } else if (gameState === "play") {
    updateGameState("pause");
  } else if (gameState === "pause") {
    updateGameState("play");
  } else if (gameState === "gameOver") {
    updateGameState("start");
  }
}
