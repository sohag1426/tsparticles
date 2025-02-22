import type { Container } from "../Container";
import type { Particle } from "../Particle";
import { calculateBounds, clamp, getValue, isPointInside, randomInRange, setRangeValue } from "../../Utils";
import { AnimationStatus, DestroyType, OutMode, OutModeDirection, OutModeAlt } from "../../Enums";
import type { IColorAnimation } from "../../Options/Interfaces/IColorAnimation";
import type { IHslAnimation } from "../../Options/Interfaces/IHslAnimation";
import type { IAnimatableColor } from "../../Options/Interfaces/Particles/IAnimatableColor";
import { IBounds, ICoordinates, IDelta, IDimension, IParticleValueAnimation } from "../Interfaces";

interface IBounceData {
    particle: Particle;
    outMode: OutMode | OutModeAlt | keyof typeof OutMode;
    direction: OutModeDirection;
    bounds: IBounds;
    canvasSize: IDimension;
    offset: ICoordinates;
    size: number;
}

function bounceHorizontal(data: IBounceData): void {
    if (
        !(
            data.outMode === OutMode.bounce ||
            data.outMode === OutMode.bounceHorizontal ||
            data.outMode === "bounceHorizontal" ||
            data.outMode === OutMode.split
        )
    ) {
        return;
    }

    const velocity = data.particle.velocity.x;

    if (
        !(
            (data.direction === OutModeDirection.right && data.bounds.right >= data.canvasSize.width && velocity > 0) ||
            (data.direction === OutModeDirection.left && data.bounds.left <= 0 && velocity < 0)
        )
    ) {
        return;
    }

    const newVelocity = getValue(data.particle.options.bounce.horizontal);

    data.particle.velocity.x *= -newVelocity;

    const minPos = data.offset.x + data.size;

    if (data.bounds.right >= data.canvasSize.width) {
        data.particle.position.x = data.canvasSize.width - minPos;
    } else if (data.bounds.left <= 0) {
        data.particle.position.x = minPos;
    }

    if (data.outMode === OutMode.split) {
        data.particle.destroy();
    }
}

function bounceVertical(data: IBounceData): void {
    if (
        !(
            data.outMode === OutMode.bounce ||
            data.outMode === OutMode.bounceVertical ||
            data.outMode === "bounceVertical" ||
            data.outMode === OutMode.split
        )
    ) {
        return;
    }

    const velocity = data.particle.velocity.y;

    if (
        !(
            (data.direction === OutModeDirection.bottom &&
                data.bounds.bottom >= data.canvasSize.height &&
                velocity > 0) ||
            (data.direction === OutModeDirection.top && data.bounds.top <= 0 && velocity < 0)
        )
    ) {
        return;
    }

    const newVelocity = getValue(data.particle.options.bounce.vertical);

    data.particle.velocity.y *= -newVelocity;

    const minPos = data.offset.y + data.size;

    if (data.bounds.bottom >= data.canvasSize.height) {
        data.particle.position.y = data.canvasSize.height - minPos;
    } else if (data.bounds.top <= 0) {
        data.particle.position.y = minPos;
    }

    if (data.outMode === OutMode.split) {
        data.particle.destroy();
    }
}

function checkDestroy(
    particle: Particle,
    destroy: DestroyType | keyof typeof DestroyType,
    value: number,
    minValue: number,
    maxValue: number
): void {
    switch (destroy) {
        case DestroyType.max:
            if (value >= maxValue) {
                particle.destroy();
            }
            break;
        case DestroyType.min:
            if (value <= minValue) {
                particle.destroy();
            }
            break;
    }
}

/**
 * Particle updater, it manages movement
 * @category Core
 */
export class Updater {
    constructor(private readonly container: Container, private readonly particle: Particle) {}

    update(delta: IDelta): void {
        if (this.particle.destroyed) {
            return;
        }

        this.updateLife(delta);

        if (this.particle.destroyed || this.particle.spawning) {
            return;
        }

        /* change opacity status */
        this.updateOpacity(delta);

        /* change size */
        this.updateSize(delta);

        /* change rotation */
        this.updateAngle(delta);

        /* change tilt */
        this.updateTilt(delta);

        /* change roll */
        this.updateRoll(delta);

        /* change wobble */
        this.updateWobble(delta);

        /* change color */
        this.updateColor(delta);

        /* change stroke color */
        this.updateStrokeColor(delta);

        /* out of canvas modes */
        this.updateOutModes(delta);
    }

    private updateLife(delta: IDelta): void {
        const particle = this.particle;
        let justSpawned = false;

        if (particle.spawning) {
            particle.life.delayTime += delta.value;

            if (particle.life.delayTime >= particle.life.delay) {
                justSpawned = true;
                particle.spawning = false;
                particle.life.delayTime = 0;
                particle.life.time = 0;
            }
        }

        if (particle.life.duration === -1) {
            return;
        }

        if (particle.spawning) {
            return;
        }

        if (justSpawned) {
            particle.life.time = 0;
        } else {
            particle.life.time += delta.value;
        }

        if (particle.life.time < particle.life.duration) {
            return;
        }

        particle.life.time = 0;

        if (particle.life.count > 0) {
            particle.life.count--;
        }

        if (particle.life.count === 0) {
            particle.destroy();
            return;
        }

        const canvasSize = this.container.canvas.size;

        particle.position.x = randomInRange(setRangeValue(0, canvasSize.width));
        particle.position.y = randomInRange(setRangeValue(0, canvasSize.height));
        particle.spawning = true;
        particle.life.delayTime = 0;
        particle.life.time = 0;
        particle.reset();

        const lifeOptions = particle.options.life;

        particle.life.delay = getValue(lifeOptions.delay) * 1000;
        particle.life.duration = getValue(lifeOptions.duration) * 1000;
    }

    private updateOpacity(delta: IDelta): void {
        const particle = this.particle;
        const opacityOpt = particle.options.opacity;
        const opacityAnim = opacityOpt.animation;
        const minValue = particle.opacity.min;
        const maxValue = particle.opacity.max;

        if (
            !(
                !particle.destroyed &&
                opacityAnim.enable &&
                (opacityAnim.count <= 0 || particle.loops.opacity < opacityAnim.count)
            )
        ) {
            return;
        }

        switch (particle.opacity.status) {
            case AnimationStatus.increasing:
                if (particle.opacity.value >= maxValue) {
                    particle.opacity.status = AnimationStatus.decreasing;
                    particle.loops.opacity++;
                } else {
                    particle.opacity.value += (particle.opacity.velocity ?? 0) * delta.factor;
                }

                break;
            case AnimationStatus.decreasing:
                if (particle.opacity.value <= minValue) {
                    particle.opacity.status = AnimationStatus.increasing;
                    particle.loops.opacity++;
                } else {
                    particle.opacity.value -= (particle.opacity.velocity ?? 0) * delta.factor;
                }

                break;
        }

        checkDestroy(particle, opacityAnim.destroy, particle.opacity.value, minValue, maxValue);

        if (!particle.destroyed) {
            particle.opacity.value = clamp(particle.opacity.value, minValue, maxValue);
        }
    }

    private updateSize(delta: IDelta): void {
        const particle = this.particle;
        const sizeOpt = particle.options.size;
        const sizeAnim = sizeOpt.animation;
        const sizeVelocity = (particle.size.velocity ?? 0) * delta.factor;
        const minValue = particle.size.min;
        const maxValue = particle.size.max;

        if (
            !(!particle.destroyed && sizeAnim.enable && (sizeAnim.count <= 0 || particle.loops.size < sizeAnim.count))
        ) {
            return;
        }

        switch (particle.size.status) {
            case AnimationStatus.increasing:
                if (particle.size.value >= maxValue) {
                    particle.size.status = AnimationStatus.decreasing;
                    particle.loops.size++;
                } else {
                    particle.size.value += sizeVelocity;
                }

                break;
            case AnimationStatus.decreasing:
                if (particle.size.value <= minValue) {
                    particle.size.status = AnimationStatus.increasing;
                    particle.loops.size++;
                } else {
                    particle.size.value -= sizeVelocity;
                }
        }

        checkDestroy(particle, sizeAnim.destroy, particle.size.value, minValue, maxValue);

        if (!particle.destroyed) {
            particle.size.value = clamp(particle.size.value, minValue, maxValue);
        }
    }

    private updateAngle(delta: IDelta): void {
        const particle = this.particle;
        const rotate = particle.options.rotate;
        const rotateAnimation = rotate.animation;
        const speed = (particle.rotate.velocity ?? 0) * delta.factor;
        const max = 2 * Math.PI;

        if (!rotateAnimation.enable) {
            return;
        }

        switch (particle.rotate.status) {
            case AnimationStatus.increasing:
                particle.rotate.value += speed;

                if (particle.rotate.value > max) {
                    particle.rotate.value -= max;
                }

                break;
            case AnimationStatus.decreasing:
            default:
                particle.rotate.value -= speed;

                if (particle.rotate.value < 0) {
                    particle.rotate.value += max;
                }

                break;
        }
    }

    private updateTilt(delta: IDelta): void {
        const particle = this.particle;
        const tilt = particle.options.tilt;
        const tiltAnimation = tilt.animation;
        const speed = (particle.tilt.velocity ?? 0) * delta.factor;
        const max = 2 * Math.PI;

        if (!tiltAnimation.enable) {
            return;
        }

        switch (particle.tilt.status) {
            case AnimationStatus.increasing:
                particle.tilt.value += speed;

                if (particle.tilt.value > max) {
                    particle.tilt.value -= max;
                }

                break;
            case AnimationStatus.decreasing:
            default:
                particle.tilt.value -= speed;

                if (particle.tilt.value < 0) {
                    particle.tilt.value += max;
                }

                break;
        }
    }

    private updateRoll(delta: IDelta): void {
        const particle = this.particle;
        const roll = particle.options.roll;
        const speed = particle.rollSpeed * delta.factor;
        const max = 2 * Math.PI;

        if (!roll.enable) {
            return;
        }

        particle.rollAngle += speed;

        if (particle.rollAngle > max) {
            particle.rollAngle -= max;
        }
    }

    private updateWobble(delta: IDelta): void {
        const particle = this.particle;
        const wobble = particle.options.wobble;
        const speed = particle.wobbleSpeed * delta.factor;
        const distance = (particle.wobbleDistance * delta.factor) / (1000 / 60);
        const max = 2 * Math.PI;

        if (!wobble.enable) {
            return;
        }

        particle.wobbleAngle += speed;

        if (particle.wobbleAngle > max) {
            particle.wobbleAngle -= max;
        }

        particle.position.x += distance * Math.cos(particle.wobbleAngle);
        particle.position.y += distance * Math.abs(Math.sin(particle.wobbleAngle));
    }

    private updateColor(delta: IDelta): void {
        const particle = this.particle;
        const animationOptions = particle.options.color.animation;

        if (particle.color?.h !== undefined) {
            this.updateColorValue(particle, delta, particle.color.h, animationOptions.h, 360, false);
        }

        if (particle.color?.s !== undefined) {
            this.updateColorValue(particle, delta, particle.color.s, animationOptions.s, 100, true);
        }

        if (particle.color?.l !== undefined) {
            this.updateColorValue(particle, delta, particle.color.l, animationOptions.l, 100, true);
        }
    }

    private updateStrokeColor(delta: IDelta): void {
        const particle = this.particle;

        if (!particle.stroke.color) {
            return;
        }

        const animationOptions = (particle.stroke.color as IAnimatableColor).animation;
        const valueAnimations = animationOptions as IColorAnimation;

        if (valueAnimations.enable !== undefined) {
            const hue = particle.strokeColor?.h ?? particle.color?.h;

            if (hue) {
                this.updateColorValue(particle, delta, hue, valueAnimations, 360, false);
            }
        } else {
            const hslAnimations = animationOptions as IHslAnimation;

            const h = particle.strokeColor?.h ?? particle.color?.h;

            if (h) {
                this.updateColorValue(particle, delta, h, hslAnimations.h, 360, false);
            }

            const s = particle.strokeColor?.s ?? particle.color?.s;

            if (s) {
                this.updateColorValue(particle, delta, s, hslAnimations.s, 100, true);
            }

            const l = particle.strokeColor?.l ?? particle.color?.l;

            if (l) {
                this.updateColorValue(particle, delta, l, hslAnimations.l, 100, true);
            }
        }
    }

    updateColorValue(
        particle: Particle,
        delta: IDelta,
        value: IParticleValueAnimation<number>,
        valueAnimation: IColorAnimation,
        max: number,
        decrease: boolean
    ): void {
        const colorValue = value;

        if (!colorValue || !valueAnimation.enable) {
            return;
        }

        const offset = randomInRange(valueAnimation.offset);
        const velocity = (value.velocity ?? 0) * delta.factor + offset * 3.6;

        if (!decrease || colorValue.status === AnimationStatus.increasing) {
            colorValue.value += velocity;

            if (decrease && colorValue.value > max) {
                colorValue.status = AnimationStatus.decreasing;
                colorValue.value -= colorValue.value % max;
            }
        } else {
            colorValue.value -= velocity;

            if (colorValue.value < 0) {
                colorValue.status = AnimationStatus.increasing;
                colorValue.value += colorValue.value;
            }
        }

        if (colorValue.value > max) {
            colorValue.value %= max;
        }
    }

    private updateOutModes(delta: IDelta): void {
        const outModes = this.particle.options.move.outModes;

        this.updateOutMode(delta, outModes.bottom ?? outModes.default, OutModeDirection.bottom);
        this.updateOutMode(delta, outModes.left ?? outModes.default, OutModeDirection.left);
        this.updateOutMode(delta, outModes.right ?? outModes.default, OutModeDirection.right);
        this.updateOutMode(delta, outModes.top ?? outModes.default, OutModeDirection.top);
    }

    private updateOutMode(
        delta: IDelta,
        outMode: OutMode | keyof typeof OutMode | OutModeAlt,
        direction: OutModeDirection
    ) {
        const container = this.container;
        const particle = this.particle;

        switch (outMode) {
            case OutMode.bounce:
            case OutMode.bounceVertical:
            case OutMode.bounceHorizontal:
            case "bounceVertical":
            case "bounceHorizontal":
            case OutMode.split:
                this.updateBounce(delta, direction, outMode);

                break;
            case OutMode.destroy:
                if (!isPointInside(particle.position, container.canvas.size, particle.getRadius(), direction)) {
                    container.particles.remove(particle, undefined, true);
                }

                break;
            case OutMode.out:
                if (!isPointInside(particle.position, container.canvas.size, particle.getRadius(), direction)) {
                    this.fixOutOfCanvasPosition(direction);
                }

                break;
            case OutMode.none:
                this.bounceNone(direction);

                break;
        }
    }

    private fixOutOfCanvasPosition(direction: OutModeDirection): void {
        const container = this.container;
        const particle = this.particle;
        const wrap = particle.options.move.warp;
        const canvasSize = container.canvas.size;
        const newPos = {
            bottom: canvasSize.height + particle.getRadius() - particle.offset.y,
            left: -particle.getRadius() - particle.offset.x,
            right: canvasSize.width + particle.getRadius() + particle.offset.x,
            top: -particle.getRadius() - particle.offset.y,
        };

        const sizeValue = particle.getRadius();
        const nextBounds = calculateBounds(particle.position, sizeValue);

        if (direction === OutModeDirection.right && nextBounds.left > canvasSize.width - particle.offset.x) {
            particle.position.x = newPos.left;

            if (!wrap) {
                particle.position.y = Math.random() * canvasSize.height;
            }
        } else if (direction === OutModeDirection.left && nextBounds.right < -particle.offset.x) {
            particle.position.x = newPos.right;

            if (!wrap) {
                particle.position.y = Math.random() * canvasSize.height;
            }
        }

        if (direction === OutModeDirection.bottom && nextBounds.top > canvasSize.height - particle.offset.y) {
            if (!wrap) {
                particle.position.x = Math.random() * canvasSize.width;
            }

            particle.position.y = newPos.top;
        } else if (direction === OutModeDirection.top && nextBounds.bottom < -particle.offset.y) {
            if (!wrap) {
                particle.position.x = Math.random() * canvasSize.width;
            }

            particle.position.y = newPos.bottom;
        }
    }

    private updateBounce(
        delta: IDelta,
        direction: OutModeDirection,
        outMode: OutMode | OutModeAlt | keyof typeof OutMode
    ): void {
        const container = this.container;
        const particle = this.particle;
        let handled = false;

        for (const [, plugin] of container.plugins) {
            if (plugin.particleBounce !== undefined) {
                handled = plugin.particleBounce(particle, delta, direction);
            }

            if (handled) {
                break;
            }
        }

        if (handled) {
            return;
        }

        const pos = particle.getPosition(),
            offset = particle.offset,
            size = particle.getRadius(),
            bounds = calculateBounds(pos, size),
            canvasSize = container.canvas.size;

        bounceHorizontal({ particle, outMode, direction, bounds, canvasSize, offset, size });
        bounceVertical({ particle, outMode, direction, bounds, canvasSize, offset, size });
    }

    private bounceNone(direction: OutModeDirection): void {
        const particle = this.particle;

        if (
            (particle.options.move.distance.horizontal &&
                (direction === OutModeDirection.left || direction === OutModeDirection.right)) ||
            (particle.options.move.distance.vertical &&
                (direction === OutModeDirection.top || direction === OutModeDirection.bottom))
        ) {
            return;
        }

        const gravityOptions = particle.options.move.gravity;
        const container = this.container;

        if (!gravityOptions.enable) {
            if (!isPointInside(particle.position, container.canvas.size, particle.getRadius(), direction)) {
                container.particles.remove(particle);
            }
        } else {
            const position = particle.position;

            if (
                (!gravityOptions.inverse &&
                    position.y > container.canvas.size.height &&
                    direction === OutModeDirection.bottom) ||
                (gravityOptions.inverse && position.y < 0 && direction === OutModeDirection.top)
            ) {
                container.particles.remove(particle);
            }
        }
    }
}
