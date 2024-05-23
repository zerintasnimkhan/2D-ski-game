import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
  Sprite,
} from "pixi.js";

export class Joystick extends Container {
  settings: JoystickSettings;

  outerRadius: number = 0;
  innerRadius: number = 0;

  outer!: Sprite | Graphics | Container;
  inner!: Sprite | Graphics | Container;

  innerAlphaStandby = 0.5;

  constructor(settings: JoystickSettings) {
    super();

    this.cursor = "pointer";

    this.settings = Object.assign(
      {
        outerScale: { x: 1, y: 1 },
        innerScale: { x: 1, y: 1 },
      },
      settings
    );

    this.width = settings.width;
    this.height = settings.height;

    if (!this.settings.outer) {
      const outer = new Graphics();
      outer.beginFill(0x000000);
      outer.drawCircle(0, 0, 60);
      outer.alpha = 0.5;
      this.settings.outer = outer;
    }

    if (!this.settings.inner) {
      const inner = new Graphics();
      inner.beginFill(0x000000);
      inner.drawCircle(0, 0, 35);
      inner.alpha = this.innerAlphaStandby;
      this.settings.inner = inner;
    }

    this.initialize();
  }

  initialize() {
    this.outer = this.settings.outer!;
    this.inner = this.settings.inner!;

    this.outer.scale.set(
      this.settings.outerScale!.x,
      this.settings.outerScale!.y
    );
    this.inner.scale.set(
      this.settings.innerScale!.x,
      this.settings.innerScale!.y
    );

    if ("anchor" in this.outer) {
      this.outer.anchor.set(0.5);
    }
    if ("anchor" in this.inner) {
      this.inner.anchor.set(0.5);
    }

    this.addChild(this.outer);
    this.addChild(this.inner);

    this.outerRadius = this.width / 2.5;
    this.innerRadius = this.inner.width / 2;

    this.bindEvents();
  }

  protected bindEvents() {
    let that = this;
    this.eventMode = "dynamic";

    let dragging: boolean = false;
    let power: number;
    let startPosition: Point;
    let velocity: { x: number; y: number } = { x: 0, y: 0 };

    function onDragStart(event: FederatedPointerEvent) {
      startPosition = event.getLocalPosition(that);
      //startPosition = new Point(0, 0);
      dragging = true;
      that.inner.alpha = 1;
      that.settings.onStart?.();
    }

    function onDragEnd(_event: FederatedPointerEvent) {
      if (dragging == false) {
        return;
      }

      that.inner.position.set(0, 0);
      dragging = false;
      that.inner.alpha = that.innerAlphaStandby;
      that.settings.onEnd?.();
    }

    function onDragMove(event: FederatedPointerEvent) {
      if (dragging == false) {
        return;
      }

      let newPosition = event.getLocalPosition(that);

      let sideX = newPosition.x - startPosition.x;
      let sideY = newPosition.y - startPosition.y;

      let centerPoint = new Point(0, 0);

      if (
        Math.abs(sideX) > that.outerRadius ||
        Math.abs(sideY) > that.outerRadius
      ) {
        let radian = Math.atan2(sideY, sideX);
        centerPoint.set(
          Math.cos(radian) * that.outerRadius,
          Math.sin(radian) * that.outerRadius
        );
      } else {
        centerPoint.set(sideX, sideY);
      }

      that.inner.position.set(centerPoint.x, centerPoint.y);
      power = that.getPower(centerPoint);
      velocity = that.getVelocity(startPosition, newPosition, power);

      let angle = Math.atan2(centerPoint.y, centerPoint.x);
      let direction = that.getDirection(centerPoint);

      that.settings.onChange?.({ angle, direction, power, velocity });
    }

    this.on("pointerdown", onDragStart)
      .on("pointerup", onDragEnd)
      .on("pointerupoutside", onDragEnd)
      .on("pointermove", onDragMove);
  }

  protected getVelocity(
    startPosition: Point,
    newPosition: Point,
    power: number
  ): { x: number; y: number } {
    const angle = Math.atan2(
      newPosition.y - startPosition.y,
      newPosition.x - startPosition.x
    );
    return {
      x: Math.cos(angle) * this.settings.speed * power,
      y: Math.sin(angle) * this.settings.speed * power,
    };
  }

  protected getPower(centerPoint: Point) {
    const a = centerPoint.x - 0;
    const b = centerPoint.y - 0;
    return Math.min(1, Math.sqrt(a * a + b * b) / this.outerRadius);
  }

  protected getDirection(center: Point) {
    let rad = Math.atan2(center.y, center.x); // [-PI, PI]
    if ((rad >= -Math.PI / 8 && rad < 0) || (rad >= 0 && rad < Math.PI / 8)) {
      return Direction.RIGHT;
    } else if (rad >= Math.PI / 8 && rad < (3 * Math.PI) / 8) {
      return Direction.BOTTOM_RIGHT;
    } else if (rad >= (3 * Math.PI) / 8 && rad < (5 * Math.PI) / 8) {
      return Direction.BOTTOM;
    } else if (rad >= (5 * Math.PI) / 8 && rad < (7 * Math.PI) / 8) {
      return Direction.BOTTOM_LEFT;
    } else if (
      (rad >= (7 * Math.PI) / 8 && rad < Math.PI) ||
      (rad >= -Math.PI && rad < (-7 * Math.PI) / 8)
    ) {
      return Direction.LEFT;
    } else if (rad >= (-7 * Math.PI) / 8 && rad < (-5 * Math.PI) / 8) {
      return Direction.TOP_LEFT;
    } else if (rad >= (-5 * Math.PI) / 8 && rad < (-3 * Math.PI) / 8) {
      return Direction.TOP;
    } else {
      return Direction.TOP_RIGHT;
    }
  }
}

export interface JoystickChangeEvent {
  angle: number;
  direction: Direction;
  power: number;
  velocity: { x: number; y: number };
}

export enum Direction {
  NONE = "none",
  LEFT = "left",
  TOP = "top",
  BOTTOM = "bottom",
  RIGHT = "right",
  TOP_LEFT = "top_left",
  TOP_RIGHT = "top_right",
  BOTTOM_LEFT = "bottom_left",
  BOTTOM_RIGHT = "bottom_right",
}

export interface JoystickSettings {
  outer?: Sprite | Graphics | Container;
  inner?: Sprite | Graphics | Container;
  outerScale?: { x: number; y: number };
  innerScale?: { x: number; y: number };
  onChange?: (data: JoystickChangeEvent) => void;
  onStart?: () => void;
  onEnd?: () => void;
  width: number;
  height: number;
  speed: number;
}
