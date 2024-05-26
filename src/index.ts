import { Application, Sprite } from "pixi.js";
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

// Linear interpolation function
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Create and position obstacles
const obstacleTexture = "obstacle.png";
const obstacles: Sprite[] = [];
const obstacleCount = 5;

for (let i = 0; i < obstacleCount; i++) {
  const obstacle = Sprite.from(obstacleTexture);
  obstacle.anchor.set(0.5);
  obstacle.x = Math.random() * app.screen.width;
  obstacle.y = app.screen.height + Math.random() * app.screen.height;
  obstacles.push(obstacle);
  app.stage.addChild(obstacle);
}

app.ticker.add(() => {
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
    obstacle.y -= maxSpeed / 2;

    // Recycle obstacle if it goes out of screen
    if (obstacle.y < -obstacle.height) {
      obstacle.y = app.screen.height + Math.random() * app.screen.height;
      obstacle.x = Math.random() * app.screen.width;
    }
  }
});

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
    const angle = Math.atan2(event.velocity.y, event.velocity.x);
    const speed = Math.sqrt(
      event.velocity.x * event.velocity.x + event.velocity.y * event.velocity.y
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
