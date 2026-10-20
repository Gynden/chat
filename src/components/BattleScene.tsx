"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

export interface BattleSceneProps {
  phase: number;
  heroHp: number;
  heroMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  heroDamage: number;
  enemyName: string;
  boss: boolean;
  active: boolean;
  reducedMotion?: boolean;
  area?: number;
}

/** The battle is a view of the simulation. No combat state is decided here. */
export default function BattleScene(props: BattleSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const snapshot = useRef(props);
  snapshot.current = props;

  useEffect(() => {
    let disposed = false;
    let game: Phaser.Game | undefined;

    void import("phaser").then(({ default: P }) => {
      if (disposed || !host.current) return;

      class ForestScene extends P.Scene {
        private hero!: Phaser.GameObjects.Image;
        private enemy!: Phaser.GameObjects.Image;
        private motes: { image: Phaser.GameObjects.Rectangle; x: number; y: number; speed: number; offset: number }[] = [];
        private portalLights: Phaser.GameObjects.Rectangle[] = [];
        private last = { ...snapshot.current };
        private hitUntil = 0;
        private enemyHitUntil = 0;
        private rngState = 17043;
        private heroX = 361;
        private enemyX = 711;

        constructor() {
          super("the-hollow");
        }

        private random() {
          this.rngState = (this.rngState * 16807) % 2147483647;
          return (this.rngState - 1) / 2147483646;
        }

        private pixel(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, width: number, height: number, alpha = 1) {
          g.fillStyle(color, alpha).fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
        }

        private polygon(g: Phaser.GameObjects.Graphics, color: number, points: number[], alpha = 1) {
          g.fillStyle(color, alpha);
          g.beginPath();
          g.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
          g.closePath();
          g.fillPath();
        }

        private pine(g: Phaser.GameObjects.Graphics, x: number, bottom: number, height: number, color: number, width = 0.29) {
          const w = height * width;
          this.pixel(g, color, x - 3, bottom - height * 0.8, 6, height * 0.8);
          for (let i = 0; i < 5; i++) {
            const y = bottom - height + i * height * 0.145;
            const spread = w * (0.38 + i * 0.15);
            this.polygon(g, color, [x, y, x - spread, y + height * 0.35, x - spread * 0.65, y + height * 0.35, x - spread * 0.95, y + height * 0.41, x + spread * 0.95, y + height * 0.41, x + spread * 0.65, y + height * 0.35, x + spread, y + height * 0.35]);
          }
        }

        private fern(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number) {
          this.pixel(g, color, x, y - size, 2, size);
          for (let j = 1; j <= 5; j++) {
            const spread = size * (0.53 - j * 0.065);
            const dy = y - j * size * 0.17;
            this.polygon(g, color, [x, dy, x - spread, dy - size * 0.22, x - spread, dy - size * 0.1, x, dy + 3]);
            this.polygon(g, color, [x + 2, dy, x + spread, dy - size * 0.22, x + spread, dy - size * 0.1, x + 2, dy + 3]);
          }
        }

        private makeWorld() {
          const g = this.add.graphics();
          // Horizontal bands make the atmosphere feel like an old painted game background.
          const bands = [0x101c1d, 0x122424, 0x142c2b, 0x173330, 0x1b3c35, 0x20463c, 0x254d40, 0x284f40];
          bands.forEach((c, i) => this.pixel(g, c, 0, i * 42, 1060, 43));
          this.pixel(g, 0x142b29, 0, 310, 1060, 120);
          this.polygon(g, 0x3b6450, [432, 0, 625, 0, 784, 324, 298, 324], 0.14);
          this.polygon(g, 0x779672, [486, 0, 548, 0, 652, 325, 386, 325], 0.08);
          this.polygon(g, 0x183a33, [0, 165, 39, 147, 74, 155, 150, 83, 209, 122, 262, 75, 318, 128, 380, 100, 426, 144, 488, 107, 546, 142, 605, 103, 674, 121, 719, 65, 767, 85, 827, 145, 907, 104, 961, 144, 1019, 126, 1060, 151, 1060, 320, 0, 320]);
          // Three receding forest layers, with deliberately varied silhouettes.
          for (let i = 0; i < 38; i++) this.pine(g, i * 31 - 30, 284 + this.random() * 13, 78 + this.random() * 133, 0x23463b, 0.2);
          for (let i = 0; i < 27; i++) this.pine(g, i * 44 - 12, 315, 105 + this.random() * 151, 0x183c32, 0.26);
          for (let i = 0; i < 13; i++) {
            const x = i * 91 - 20;
            this.pine(g, x, 334, 147 + this.random() * 147, 0x12342c, 0.25);
          }
          // Distant broken aqueducts and columns.
          const ruin = 0x315246;
          this.pixel(g, ruin, 197, 218, 107, 12);
          this.pixel(g, ruin, 201, 225, 13, 70);
          this.pixel(g, ruin, 260, 225, 15, 72);
          this.pixel(g, ruin, 287, 214, 15, 98);
          this.pixel(g, 0x416150, 198, 215, 37, 4);
          this.pixel(g, 0x416150, 257, 215, 48, 4);
          this.pixel(g, ruin, 818, 198, 17, 106);
          this.pixel(g, ruin, 806, 194, 39, 10);
          this.pixel(g, 0x223e33, 813, 218, 29, 8);
          this.pixel(g, ruin, 866, 228, 16, 85);
          this.pixel(g, ruin, 856, 225, 36, 9);
          // Mist sits behind the gateway and creatures.
          for (let i = 0; i < 19; i++) {
            const x = this.random() * 1060;
            this.pixel(g, 0x6e9a77, x, 246 + this.random() * 64, 40 + this.random() * 190, 1 + this.random() * 3, 0.07);
          }
          this.gateway(g);
          // Raised, overgrown road. Broken surfaces preserve a useful combat silhouette.
          this.polygon(g, 0x162d26, [0, 335, 137, 326, 276, 332, 423, 322, 568, 325, 711, 318, 860, 329, 1060, 320, 1060, 430, 0, 430]);
          this.polygon(g, 0x304235, [0, 354, 203, 344, 345, 345, 468, 339, 676, 341, 854, 344, 1060, 337, 1060, 368, 881, 361, 650, 363, 457, 361, 225, 367, 0, 375]);
          this.polygon(g, 0x3c4b3a, [67, 352, 230, 349, 322, 351, 348, 357, 227, 359, 90, 363]);
          this.polygon(g, 0x3c4b3a, [455, 348, 601, 347, 679, 350, 644, 357, 486, 355]);
          this.polygon(g, 0x394836, [747, 349, 875, 347, 974, 345, 1008, 350, 842, 357]);
          for (let i = 0; i < 75; i++) {
            const x = this.random() * 1060;
            const y = 345 + this.random() * 35;
            this.pixel(g, i % 3 === 0 ? 0x566148 : 0x1e3329, x, y, 3 + this.random() * 17, 1 + this.random() * 2, 0.6);
          }
          // Small flagstones with chipped rims.
          [[244, 362, 51], [425, 372, 74], [554, 360, 42], [786, 366, 64], [913, 375, 52], [111, 378, 68]].forEach(([x, y, w]) => {
            this.polygon(g, 0x182c25, [x, y + 2, x + w - 7, y, x + w, y + 5, x + w - 4, y + 10, x - 7, y + 9]);
            this.pixel(g, 0x43503b, x, y, w - 7, 2);
          });
          // Tiny plants in the playable plane.
          for (let i = 0; i < 155; i++) {
            const x = this.random() * 1060;
            const y = 325 + this.random() * 73;
            const height = 3 + this.random() * 8;
            this.pixel(g, i % 3 === 0 ? 0x4e6942 : 0x294a33, x, y - height, 2, height);
            if (i % 5 === 0) this.pixel(g, 0x749d63, x - 1, y - height - 1, 4, 2);
          }
          // Tall framing trees are intentionally outside the central fight.
          this.tree(g, 69, false);
          this.tree(g, 997, true);
          // Front ferns, roots, luminous fungi and flowers.
          this.polygon(g, 0x091b17, [0, 398, 104, 386, 188, 400, 283, 397, 357, 411, 491, 403, 608, 410, 766, 398, 856, 403, 954, 390, 1060, 399, 1060, 430, 0, 430]);
          for (let i = 0; i < 42; i++) {
            const x = this.random() * 1060;
            const y = 408 + this.random() * 23;
            this.fern(g, x, y, 8 + this.random() * 23, i % 3 ? 0x16392b : 0x254b33);
          }
          [[146, 379], [179, 394], [899, 386], [926, 391], [952, 377]].forEach(([x, y], i) => {
            this.pixel(g, 0x79aaa0, x, y - 7, 2, 10);
            this.pixel(g, 0x366f67, x - 5, y - 10, 12, 4);
            this.pixel(g, 0x78b5a0, x - 3, y - 12, 8, 3);
            this.pixel(g, 0xa5d8ac, x - 2, y - 12, 3, 1);
            if (i % 2 === 0) this.pixel(g, 0x6b9a72, x + 15, y + 4, 4, 3);
          });
          [[216, 391], [196, 380], [817, 398], [860, 384], [895, 407]].forEach(([x, y]) => {
            this.pixel(g, 0x345e3b, x, y - 14, 2, 16);
            this.pixel(g, 0x68c5a4, x - 2, y - 15, 6, 4);
            this.pixel(g, 0xb0e4bb, x, y - 16, 2, 3);
          });
          // Pale seed motes are lit by the rupture, never an input target.
          for (let i = 0; i < 46; i++) {
            const x = 100 + this.random() * 860;
            const y = 72 + this.random() * 280;
            const mote = this.add.rectangle(x, y, i % 8 === 0 ? 3 : 2, 2, i % 4 === 0 ? 0xd2ce81 : 0x82c39b, 0.3);
            this.motes.push({ image: mote, x, y, speed: 0.3 + this.random() * 0.7, offset: this.random() * 10 });
          }
        }

        private gateway(g: Phaser.GameObjects.Graphics) {
          const x = 535;
          // A restrained square-pixel halo rather than a smooth vector glow.
          [88, 76, 63, 52].forEach((radius, i) => {
            this.polygon(g, 0xa8a66a, [x - radius, 276, x - radius, 221, x - radius + 13, 189, x - 22, 168 - i * 2, x + 24, 168 - i * 2, x + radius - 13, 191, x + radius, 222, x + radius, 276], 0.025 + i * 0.012);
          });
          this.polygon(g, 0x102a23, [x - 45, 314, x - 45, 228, x - 35, 199, x - 17, 184, x + 20, 184, x + 40, 203, x + 47, 229, x + 47, 314]);
          this.polygon(g, 0x486044, [x - 63, 319, x - 63, 221, x - 55, 194, x - 36, 174, x - 15, 166, x + 22, 166, x + 47, 182, x + 62, 207, x + 64, 318, x + 47, 318, x + 47, 228, x + 39, 207, x + 20, 192, x - 16, 192, x - 33, 205, x - 45, 229, x - 45, 319]);
          this.pixel(g, 0x687251, x - 61, 220, 6, 83);
          this.pixel(g, 0x738064, x - 53, 195, 9, 18);
          this.pixel(g, 0x687453, x - 34, 177, 23, 5);
          this.pixel(g, 0x273e2f, x - 67, 259, 25, 5);
          this.pixel(g, 0x273e2f, x + 43, 238, 24, 5);
          this.pixel(g, 0x253c2e, x + 46, 284, 21, 4);
          this.pixel(g, 0x6c7550, x + 49, 218, 4, 64);
          this.pixel(g, 0x93a063, x - 22, 171, 18, 4);
          this.pixel(g, 0x263f2d, x + 15, 167, 4, 21);
          // The pale gold seam is the visual anchor of the entire forest.
          this.pixel(g, 0xb8ab66, x - 3, 200, 7, 102, 0.13);
          this.pixel(g, 0xd6c47b, x - 1, 206, 3, 88, 0.5);
          this.pixel(g, 0xeee0a6, x, 212, 1, 75, 0.9);
          this.pixel(g, 0x8d9a60, x - 24, 216, 2, 62, 0.4);
          this.pixel(g, 0x8d9a60, x + 26, 220, 2, 67, 0.4);
          [[-56, 239], [-56, 282], [55, 257], [55, 300], [-21, 180], [29, 185]].forEach(([dx, dy], i) => {
            this.pixel(g, 0xa6b777, x + dx, dy, 3, 9, 0.65);
            this.pixel(g, 0xa6b777, x + dx - 2, dy + (i % 2 ? 6 : 2), 7, 2, 0.65);
          });
          this.pixel(g, 0x48583a, x - 80, 313, 155, 9);
          this.pixel(g, 0x5c6544, x - 65, 312, 125, 3);
          this.pixel(g, 0x243b2a, x - 90, 322, 178, 8);
          for (let i = 0; i < 11; i++) {
            const spark = this.add.rectangle(x - 27 + this.random() * 54, 215 + this.random() * 88, 2, 3, 0xd2c887, 0.5).setDepth(1);
            this.portalLights.push(spark);
          }
          this.fern(g, x - 65, 325, 24, 0x41633b);
          this.fern(g, x + 64, 325, 30, 0x325332);
        }

        private tree(g: Phaser.GameObjects.Graphics, x: number, mirror: boolean) {
          const s = mirror ? -1 : 1;
          const pts = [-28, 428, -19, 321, -30, 232, -25, 169, -41, 94, -36, 0, 24, 0, 22, 89, 39, 151, 28, 223, 38, 299, 31, 365, 77, 410, 44, 410, 10, 388, -3, 425];
          this.polygon(g, 0x0b221c, pts.map((v, i) => i % 2 === 0 ? x + v * s : v));
          this.polygon(g, 0x0b221c, [x + 8 * s, 188, x + 73 * s, 119, x + 91 * s, 68, x + 96 * s, 70, x + 86 * s, 130, x + 26 * s, 212]);
          this.polygon(g, 0x0b221c, [x - 8 * s, 114, x - 73 * s, 75, x - 113 * s, 66, x - 113 * s, 56, x - 70 * s, 61, x + 6 * s, 96]);
          this.pixel(g, 0x15392a, x - 13, 162, 6, 101);
          this.pixel(g, 0x1a3e2d, x - 18, 263, 7, 67);
          this.pixel(g, 0x20452e, x + 11, 68, 5, 67);
          this.pixel(g, 0x17412d, x - 17, 338, 4, 34);
          for (let i = 0; i < 12; i++) {
            const leafX = x + s * (this.random() * 215 - 108);
            const leafY = this.random() * 76 - 21;
            this.pixel(g, i % 2 ? 0x0b241c : 0x0c291f, leafX, leafY, 32 + this.random() * 66, 13 + this.random() * 22);
          }
          // Hanging moss has a few lit green tips.
          for (let i = 0; i < 11; i++) {
            const mx = x + s * (20 + i * 9);
            const my = 44 + this.random() * 35;
            const len = 12 + this.random() * 35;
            this.pixel(g, 0x254a30, mx, my, 2, len);
            this.pixel(g, 0x355939, mx - 2, my + len - 6, 4, 6);
          }
        }

        private creatures() {
          const h = this.make.graphics({ x: 0, y: 0 });
          const b = (c: number, x: number, y: number, w: number, z: number) => this.pixel(h, c, x, y, w, z);
          // O Devorador: a moss-covered stone maw with one warm, inquisitive eye.
          b(0x0a211b, 17, 20, 30, 35); b(0x0a211b, 11, 27, 44, 24); b(0x0a211b, 15, 51, 35, 6);
          b(0x0a211b, 10, 42, 7, 15); b(0x0a211b, 45, 47, 10, 11);
          b(0x2c4b35, 15, 26, 36, 24); b(0x3e5c3c, 19, 21, 25, 29); b(0x5a6d41, 21, 23, 18, 12);
          b(0x456640, 16, 31, 32, 19); b(0x304c34, 12, 33, 7, 14); b(0x6d7848, 17, 28, 9, 7);
          b(0x263e2b, 46, 28, 5, 20); b(0x6a7950, 18, 23, 4, 4); b(0x80935c, 23, 21, 7, 3);
          // Forked root horns and sprouting clover.
          b(0x122d23, 15, 13, 5, 14); b(0x38553a, 16, 14, 3, 10); b(0x274a32, 11, 11, 6, 5);
          b(0x122d23, 43, 12, 5, 16); b(0x44603b, 43, 15, 3, 9); b(0x254630, 47, 10, 5, 7);
          b(0x345d34, 31, 15, 2, 9); b(0x65824a, 26, 14, 6, 4); b(0x80944e, 32, 11, 6, 4);
          b(0x364e32, 23, 18, 7, 4); b(0x6b8650, 22, 18, 5, 2);
          // A single recessed golden eye.
          b(0x162e24, 28, 24, 15, 12); b(0x95965b, 30, 25, 11, 9); b(0xe3bf68, 32, 26, 8, 7);
          b(0xf2d993, 33, 26, 5, 2); b(0x182820, 35, 27, 3, 7); b(0xf4e5ae, 33, 27, 2, 2);
          b(0x91a163, 26, 24, 3, 4); b(0x5a7145, 42, 27, 4, 3);
          // Black maw, irregular ivory teeth and mossy gums.
          b(0x192e23, 17, 37, 33, 16); b(0x081b19, 20, 39, 28, 12); b(0x0b1816, 18, 42, 30, 7);
          b(0xa3ac79, 20, 38, 5, 5); b(0xc5c59a, 21, 39, 3, 5); b(0xc5c59a, 29, 39, 3, 4);
          b(0xa9b286, 37, 38, 4, 5); b(0xd0cca0, 44, 39, 3, 4); b(0xaab28b, 24, 47, 4, 5);
          b(0xc5c59a, 34, 48, 4, 4); b(0xc5c59a, 43, 47, 3, 4); b(0x476045, 19, 52, 25, 3);
          b(0x718854, 16, 36, 4, 3); b(0x29492f, 49, 43, 6, 8);
          // Little root feet keep the creature grounded and personable.
          b(0x213c2c, 17, 53, 8, 6); b(0x182f25, 14, 57, 13, 4); b(0x567145, 18, 54, 5, 3);
          b(0x213c2c, 40, 53, 8, 6); b(0x182f25, 39, 57, 13, 4); b(0x567145, 42, 54, 5, 3);
          b(0x65874a, 12, 30, 5, 3); b(0x84a15e, 13, 29, 2, 2); b(0x5a7d44, 47, 21, 5, 5);
          b(0x98aa6f, 16, 48, 2, 2); b(0x789159, 47, 33, 2, 3);
          h.generateTexture("devourer", 68, 68); h.destroy();

          const e = this.make.graphics({ x: 0, y: 0 });
          const r = (c: number, x: number, y: number, w: number, z: number) => this.pixel(e, c, x, y, w, z);
          // Espinheiro Oco: an abandoned, thorn-covered forest husk.
          r(0x111f20, 25, 17, 19, 40); r(0x111f20, 20, 26, 29, 23); r(0x111f20, 18, 36, 9, 21);
          r(0x34443a, 26, 20, 15, 34); r(0x465244, 24, 28, 19, 19); r(0x293b33, 40, 27, 7, 25);
          r(0x697154, 27, 24, 4, 15); r(0x58614b, 31, 20, 5, 7); r(0x53614b, 26, 44, 5, 11);
          r(0x263a31, 31, 41, 4, 17); r(0x627055, 38, 45, 3, 9);
          // Its thin crown has broken branches instead of horns.
          r(0x122821, 24, 11, 4, 16); r(0x3c4d39, 25, 12, 2, 12); r(0x122821, 20, 7, 5, 8);
          r(0x122821, 22, 7, 3, 4); r(0x122821, 37, 9, 4, 16); r(0x3d513d, 38, 10, 2, 12);
          r(0x122821, 40, 5, 6, 6); r(0x122821, 44, 1, 3, 7);
          r(0x193629, 18, 18, 9, 3); r(0x2b4e34, 16, 15, 4, 4);
          // Branch arms and thorns.
          r(0x132a23, 12, 30, 13, 5); r(0x132a23, 10, 24, 4, 12); r(0x132a23, 7, 23, 5, 4);
          r(0x46563e, 14, 31, 9, 2); r(0x132a23, 46, 35, 10, 5); r(0x132a23, 54, 26, 4, 12);
          r(0x132a23, 57, 23, 5, 5); r(0x314b35, 48, 35, 7, 2); r(0x192e24, 50, 40, 4, 6);
          // The hollow holds a cool, unnatural glow.
          r(0x102c29, 28, 29, 15, 12); r(0x316b5a, 29, 30, 13, 9); r(0x78b999, 30, 31, 5, 4);
          r(0x88caac, 37, 31, 4, 4); r(0xb3dfb7, 31, 31, 2, 2); r(0xb3dfb7, 38, 31, 2, 2);
          r(0x132723, 34, 34, 3, 6); r(0x90baa0, 32, 38, 6, 2);
          // Splintered feet, trailing roots and damp purple fungal caps.
          r(0x1f342a, 22, 52, 7, 9); r(0x142b24, 18, 59, 12, 3); r(0x1e352a, 39, 52, 6, 10);
          r(0x142b24, 40, 59, 13, 3); r(0x426045, 22, 53, 3, 5); r(0x3d5d42, 40, 53, 2, 5);
          r(0x52724c, 41, 20, 7, 3); r(0x846c8d, 40, 18, 9, 3); r(0xa28ba6, 42, 17, 5, 2);
          r(0x4e6a41, 19, 41, 4, 7); r(0x668247, 17, 42, 4, 3); r(0x728953, 29, 17, 7, 4);
          e.generateTexture("hollow", 68, 68); e.destroy();

          this.add.ellipse(this.heroX + 2, 351, 92, 12, 0x061b15, 0.7);
          this.add.ellipse(this.enemyX, 350, 82, 11, 0x061b15, 0.7);
          this.hero = this.add.image(this.heroX, 350, "devourer").setOrigin(0.5, 1).setScale(1.82).setDepth(5);
          this.enemy = this.add.image(this.enemyX, 350, "hollow").setOrigin(0.5, 1).setScale(1.8).setDepth(5);
        }

        create() {
          this.makeWorld();
          this.creatures();
          this.cameras.main.setRoundPixels(true);
          this.last = { ...snapshot.current };
        }

        private impact(x: number, y: number, damage: number, friendly: boolean) {
          if (snapshot.current.reducedMotion) {
            const label = this.add.text(x, y - 43, `−${Math.round(damage)}`, { fontFamily: "monospace", fontSize: "18px", fontStyle: "bold", color: friendly ? "#e9d8a8" : "#e2a895", stroke: "#101e18", strokeThickness: 4 }).setOrigin(0.5).setDepth(13);
            this.time.delayedCall(850, () => label.destroy());
            return;
          }
          const effect = this.add.graphics().setDepth(12);
          const color = friendly ? 0xe9d496 : 0x9fd4b9;
          this.polygon(effect, color, [x - 29, y + 21, x - 9, y - 4, x + 30, y - 24, x + 8, y - 2, x - 11, y + 5], 0.9);
          this.polygon(effect, 0xf7eaca, [x - 16, y + 10, x - 5, y - 3, x + 23, y - 20, x + 3, y - 2], 1);
          this.tweens.add({ targets: effect, alpha: 0, duration: 220, onComplete: () => effect.destroy() });
          for (let i = 0; i < 8; i++) {
            const particle = this.add.rectangle(x + (this.random() - 0.5) * 15, y - 7, 3, 3, color).setDepth(12);
            this.tweens.add({ targets: particle, x: particle.x + (this.random() - 0.5) * 70, y: particle.y - 12 - this.random() * 30, alpha: 0, duration: 360 + this.random() * 180, onComplete: () => particle.destroy() });
          }
          const text = this.add.text(x, y - 43, `−${Math.round(damage)}`, { fontFamily: "monospace", fontSize: "18px", fontStyle: "bold", color: friendly ? "#e9d8a8" : "#e2a895", stroke: "#101e18", strokeThickness: 4 }).setOrigin(0.5).setDepth(13);
          this.tweens.add({ targets: text, y: y - 83, alpha: 0, delay: 250, duration: 700, onComplete: () => text.destroy() });
        }

        update(time: number) {
          if (!this.hero || !this.enemy) return;
          const now = snapshot.current;
          const motion = !now.reducedMotion;
          this.hero.y = 350 + (motion ? Math.sin(time / 560) * 1.5 : 0);
          this.enemy.y = 350 + (motion ? Math.sin(time / 740 + 2) * 2 : 0);
          this.hero.scaleY = 1.82 + (motion ? Math.sin(time / 560) * 0.012 : 0);
          this.enemy.scaleY = (now.boss ? 2.15 : 1.8) + (motion ? Math.sin(time / 740) * 0.015 : 0);
          this.enemy.scaleX = now.boss ? 2.15 : 1.8;
          this.enemy.setTint(now.boss ? 0xe0afba : 0xffffff);
          this.hero.setTint(motion && time < this.hitUntil ? 0xf3b4a0 : 0xffffff);
          if (motion && time < this.enemyHitUntil) this.enemy.setTint(0xffe9b8);
          this.motes.forEach((m, i) => {
            m.image.x = m.x + (motion ? Math.sin(time / (2800 + i * 37) + m.offset) * 12 : 0);
            m.image.y = m.y - (motion ? (time / 120 * m.speed) % 38 : 0);
            m.image.alpha = motion ? 0.1 + (Math.sin(time / 1100 + m.offset) + 1) * 0.18 : 0.28;
          });
          this.portalLights.forEach((light, i) => {
            light.alpha = motion ? 0.2 + (Math.sin(time / 800 + i * 1.7) + 1) * 0.24 : 0.44;
          });
          if (now.phase !== this.last.phase || now.enemyName !== this.last.enemyName) {
            this.enemy.alpha = motion ? 0 : 1;
            if (motion) this.tweens.add({ targets: this.enemy, alpha: 1, duration: 420 });
          } else if (now.enemyHp < this.last.enemyHp && now.active) {
            const damage = this.last.enemyHp - now.enemyHp;
            this.enemyHitUntil = time + 120;
            this.impact(this.enemyX - 7, 299, damage, true);
            if (motion) this.tweens.add({ targets: this.hero, x: this.heroX + 25, duration: 95, yoyo: true, ease: "Cubic.Out", onComplete: () => { this.hero.x = this.heroX; } });
          }
          if (now.heroHp < this.last.heroHp && now.active) {
            this.hitUntil = time + 140;
            this.impact(this.heroX + 4, 299, this.last.heroHp - now.heroHp, false);
            if (motion) this.tweens.add({ targets: this.enemy, x: this.enemyX - 19, duration: 110, yoyo: true, ease: "Cubic.Out", onComplete: () => { this.enemy.x = this.enemyX; } });
          }
          this.last = { ...now };
        }
      }

      game = new P.Game({
        type: P.AUTO,
        parent: host.current,
        width: 1060,
        height: 430,
        backgroundColor: "#10241d",
        pixelArt: true,
        roundPixels: true,
        transparent: false,
        banner: false,
        audio: { noAudio: true },
        render: { antialias: false, pixelArt: true, roundPixels: true },
        scale: { mode: P.Scale.ENVELOP, autoCenter: P.Scale.CENTER_BOTH },
        scene: ForestScene,
      });
    });

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={host} className="phaser-host" aria-label="Combate automático entre O Devorador e uma criatura da floresta, nas ruínas da Floresta dos Ecos." role="img" style={{ width: "100%", height: "100%", inset: 0, overflow: "hidden", position: "absolute", imageRendering: "pixelated" }} />;
}
