/**
 * Doodle — absolutely-positioned decorative image.
 *
 * Enhances the notebook/marginalia aesthetic with show-specific PNGs.
 * Purely decorative: aria-hidden, pointer-events: none, hidden on mobile (≤600px).
 * Parent must have position: relative — .page-card already provides this.
 *
 * Usage:
 *   <Doodle name="bear" top="-24px" right="-28px" rotation={15} opacity={0.8} width="112px" />
 *
 * Place as first children inside the wrapper so doodles sit behind content (z-index: 0).
 * Negative position values let images peek over card edges — do not add overflow: hidden to the parent.
 *
 * Full docs: docs/doodle-system.md
 */
import './Doodle.css';

import bearImg from '../../../src/images/Your paragraph text/bear.png';
import bearFaceImg from '../../../src/images/Your paragraph text/bear_face.png';
import blueBearImg from '../../../src/images/Your paragraph text/blue_bear.png';
import beesImg from '../../../src/images/Your paragraph text/bees.png';
import diamondsImg from '../../../src/images/Your paragraph text/diamonds.png';
import starsImg from '../../../src/images/Your paragraph text/stars.png';
import shineImg from '../../../src/images/Your paragraph text/shine.png';
import squiggleImg from '../../../src/images/Your paragraph text/squiggle.png';
import tapeImg from '../../../src/images/Your paragraph text/tape.png';
import lightBulbImg from '../../../src/images/Your paragraph text/light_bulb.png';
import nat1DiceImg from '../../../src/images/Your paragraph text/nat1_dice.png';
import nat20DiceImg from '../../../src/images/Your paragraph text/nat20_dice.png';
import arcadeImg from '../../../src/images/Your paragraph text/arcade.png';
import cerealImg from '../../../src/images/Your paragraph text/cereal.png';
import shipwreckImg from '../../../src/images/Your paragraph text/shipwreck.png';

const IMAGES = {
  bear: bearImg,
  bear_face: bearFaceImg,
  blue_bear: blueBearImg,
  bees: beesImg,
  diamonds: diamondsImg,
  stars: starsImg,
  shine: shineImg,
  squiggle: squiggleImg,
  tape: tapeImg,
  light_bulb: lightBulbImg,
  nat1_dice: nat1DiceImg,
  nat20_dice: nat20DiceImg,
  arcade: arcadeImg,
  cereal: cerealImg,
  shipwreck: shipwreckImg,
} as const;

export type DoodleName = keyof typeof IMAGES;

interface DoodleProps {
  name: DoodleName;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotation?: number;
  opacity?: number;
  scale?: number;
  width?: string;
}

export function Doodle({
  name,
  top,
  bottom,
  left,
  right,
  rotation = 0,
  opacity = 0.85,
  scale = 1,
  width = '100px',
}: DoodleProps) {
  return (
    <img
      className="doodle"
      src={IMAGES[name]}
      alt=""
      aria-hidden="true"
      style={{
        top,
        bottom,
        left,
        right,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        opacity,
        width,
      }}
    />
  );
}
