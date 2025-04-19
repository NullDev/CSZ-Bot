export class Vec2 {
    static readonly zero = new Vec2(0, 0);

    readonly x: number;
    readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    toString(): string {
        return `<${this.x}, ${this.y}>`;
    }
    add(v: Vec2): Vec2 {
        return new Vec2(this.x + v.x, this.y + v.y);
    }
    minus(v: Vec2): Vec2 {
        return new Vec2(this.x - v.x, this.y - v.y);
    }
    divide(s: number) {
        return new Vec2(this.x / s, this.y / s);
    }
    scale(s: number) {
        return new Vec2(this.x * s, this.y * s);
    }
    dot(v: Vec2) {
        return this.x * v.x + this.y * v.y;
    }
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }
    length(): number {
        return Math.sqrt(this.lengthSquared());
    }
    normalize(): Vec2 {
        return this.divide(this.length());
    }
}

export class Vec3 {
    static readonly zero = new Vec3(0, 0, 0);

    readonly x: number;
    readonly y: number;
    readonly z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toString(): string {
        return `<${this.x}, ${this.y}, ${this.z}>`;
    }
    add(v: Vec3): Vec3 {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }
    minus(v: Vec3): Vec3 {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }
    divide(s: number): Vec3 {
        return new Vec3(this.x / s, this.y / s, this.z / s);
    }
    scale(s: number): Vec3 {
        return new Vec3(this.x * s, this.y * s, this.z * s);
    }
    multiply(v: Vec3): Vec3 {
        return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
    }
    dot(v: Vec3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    cross(v: Vec3): Vec3 {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x,
        );
    }
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    length(): number {
        return Math.sqrt(this.lengthSquared());
    }
    normalize(): Vec3 {
        return this.divide(this.length());
    }

    clamp(min: number, max: number): Vec3 {
        return new Vec3(
            Math.min(Math.max(this.x, min), max),
            Math.min(Math.max(this.y, min), max),
            Math.min(Math.max(this.z, min), max),
        );
    }
}

export class Vec4 {
    static readonly zezo = new Vec4(0, 0, 0, 0);

    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;

    constructor(x: number, y: number, z: number, w: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    toString(): string {
        return `<${this.x}, ${this.y}, ${this.z}, ${this.w}>`;
    }
    add(v: Vec4): Vec4 {
        return new Vec4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
    }
    minus(v: Vec4): Vec4 {
        return new Vec4(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
    }
    multiply(v: Vec4): Vec4 {
        return new Vec4(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w);
    }
    divide(s: number): Vec4 {
        return new Vec4(this.x / s, this.y / s, this.z / s, this.w / s);
    }
    dot(v: Vec4): number {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }
    scale(s: number) {
        return new Vec4(this.x * s, this.y * s, this.z * s, this.w * s);
    }
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    }
    length(): number {
        return Math.sqrt(this.lengthSquared());
    }
    normalize(): Vec4 {
        return this.divide(this.length());
    }
}

/**
 * Once https://github.com/tc39/proposal-math-clamp is a thing, we can use that instead.
 */
export function clamp(number: number, minimum: number, maximum: number) {
    if (number < minimum) {
        return minimum;
    }
    if (number > maximum) {
        return maximum;
    }
    return number;
}
