import { Application, Sprite, TilingSprite, Texture } from "pixi.js";
import { Joystick, JoystickSettings, JoystickChangeEvent } from "./control/joystick"; 

const app = new Application<HTMLCanvasElement>({
  view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  backgroundColor: 0xb0e0e6,
  width: window.innerWidth,
  height: window.innerHeight,
});

// Add snowy background texture
const snowyTexture = Texture.from("snowy-background.png");
const background = new TilingSprite(
  snowyTexture,
  app.screen.width,
  app.screen.height
);
app.stage.addChild(background);

const player: Sprite = Sprite.from("player.png");

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
};

const keys: KeyState = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

window.addEventListener("keydown", (event) => {
  if (event.key in keys) {
    keys[event.key as keyof KeyState] = true;
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
let isCollidingWithObstacle = false;

// Linear interpolation function
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Obstacle textures
const obstacleTextures = ["tree.png", "burg.png", "petal.png", "ice.png", "brunch.png"]; 
const obstacles: Sprite[] = [];
const obstacleCount = 10;

// Function to create a random obstacle
function createRandomObstacle(): Sprite {
  const texture = obstacleTextures[Math.floor(Math.random() * obstacleTextures.length)];
  const obstacle = Sprite.from(texture);
  obstacle.anchor.set(0.5);
  obstacle.x = Math.random() * app.screen.width;
  obstacle.y = app.screen.height + Math.random() * app.screen.height;
  return obstacle;
}

// Create initial obstacles
for (let i = 0; i < obstacleCount; i++) {
  const obstacle = createRandomObstacle();
  obstacles.push(obstacle);
  app.stage.addChild(obstacle);
  obstacle.scale.set(0.6, 0.6);
}

// Collision detection function
function isColliding(a: Sprite, b: Sprite): boolean {
  const aBounds = a.getBounds();
  const bBounds = b.getBounds();
  return aBounds.x < bBounds.x + bBounds.width &&
         aBounds.x + aBounds.width > bBounds.x &&
         aBounds.y < bBounds.y + bBounds.height &&
         aBounds.y + aBounds.height > bBounds.y;
}

app.ticker.add(() => {
  if (!isCollidingWithObstacle) {
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
  }

  // Move obstacles upwards
  for (const obstacle of obstacles) {
    obstacle.y -= maxSpeed / 2; 

    // Recycle obstacle if it goes out of screen
    if (obstacle.y < -obstacle.height) {
      obstacle.y = app.screen.height + Math.random() * app.screen.height;
      obstacle.x = Math.random() * app.screen.width;
    }

    // Check for collision with player
    if (isColliding(player, obstacle)) {
      console.log("Collision detected!");
      // Handle collision (stop player movement and mark red)
      velocity.x = 0;
      velocity.y = 0;
      isCollidingWithObstacle = true;
      player.tint = 0xff0000; // Mark player red
    }
  }

  // Reset collision state if no collision detected
  if (isCollidingWithObstacle) {
    isCollidingWithObstacle = obstacles.some(obstacle => isColliding(player, obstacle));
    if (!isCollidingWithObstacle) {
      player.tint = 0xffffff; // Reset player color
    }
  }

  // Move background to create a scrolling effect
  background.tilePosition.y += maxSpeed / 2;
});

window.addEventListener("resize", () => {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  background.width = app.screen.width;
  background.height = app.screen.height;
  player.x = app.screen.width / 2;
  player.y = app.screen.height / 2;
});

const joystickSettings: JoystickSettings = {
  width: 120,
  height: 120,
  speed: maxSpeed,
  onChange: (event: JoystickChangeEvent) => {
    const angle = Math.atan2(event.velocity.y, event.velocity.x);
    const speed = Math.sqrt(event.velocity.x * event.velocity.x + event.velocity.y * event.velocity.y);
    velocity.x = Math.cos(angle) * speed;
    velocity.y = Math.sin(angle) * speed;

    if (velocity.x < 0) {
      targetRotation = 0.349;
    } else if (velocity.x > 0) {
      targetRotation = -0.349; 
    } else {
      targetRotation = 0;
    }
  },

  onStart: () => {
    console.log("Joystick started");
  },

  onEnd: () => {
    console.log("Joystick ended");
    
    const slowDownInterval = setInterval(() => {
      if (Math.abs(velocity.x) <= deceleration && Math.abs(velocity.y) <= deceleration) {
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
joystick.position.set(joystick.width / 2 + 20, app.screen.height - joystick.height / 2 - 20);
app.stage.addChild(joystick);
