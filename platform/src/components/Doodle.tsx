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
import detailedPurpleMonsterImg from '../../../src/images/Your paragraph text/deatiled_purple_monster.png';
import orangePumpkinDoodleImg from '../../../src/images/Your paragraph text/orange_pumpkin_doodle.png';
import spiderWebImg from '../../../src/images/Your paragraph text/spicer_web.png';
import spiderImg from '../../../src/images/Your paragraph text/spider.png';
import orangeScaryPumpkinImg from '../../../src/images/Your paragraph text/orange_scary_pumpkin.png';
import orangeJellyMonsterImg from '../../../src/images/Your paragraph text/orange_jelly_monster.png';
import monsterDoodleImg from '../../../src/images/Your paragraph text/monster_doodle.png';
import hauntedHouseImg from '../../../src/images/Your paragraph text/haunted_house.png';
import scarySpecterImg from '../../../src/images/Your paragraph text/scary_specter.png';
import fullMoonWithBatsImg from '../../../src/images/Your paragraph text/full_moon_with_bats.png';
import vampireFangsImg from '../../../src/images/Your paragraph text/vampire_fangs.png';

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
  detailed_purple_monster: detailedPurpleMonsterImg,
  orange_pumpkin_doodle: orangePumpkinDoodleImg,
  spider_web: spiderWebImg,
  spider: spiderImg,
  orange_scary_pumpkin: orangeScaryPumpkinImg,
  orange_jelly_monster: orangeJellyMonsterImg,
  monster_doodle: monsterDoodleImg,
  haunted_house: hauntedHouseImg,
  scary_specter: scarySpecterImg,
  full_moon_with_bats: fullMoonWithBatsImg,
  vampire_fangs: vampireFangsImg,
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
