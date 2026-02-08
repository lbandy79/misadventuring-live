/**
 * GameIcons.tsx - RPG-style icons from game-icons.net
 * 
 * All icons are CC BY 3.0 licensed from https://game-icons.net
 * Credits: Lorc, Delapouite, and other contributors
 * 
 * Used for villager items in Beast of Ridgefall.
 */

import React from 'react';

interface GameIconProps {
  size?: number;
  color?: string;
  className?: string;
}

// Base wrapper for all game icons
const GameIconBase: React.FC<GameIconProps & { path: string }> = ({ 
  size = 24, 
  color = 'currentColor', 
  className = '',
  path 
}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 512 512"
    width={size}
    height={size}
    className={`game-icon ${className}`}
    style={{ fill: color }}
  >
    <path d={path} />
  </svg>
);

// ============ SOUND-BASED ITEMS ============

// Bell icon - by Lorc
export const IconBell: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 25c-8.3 0-15 6.7-15 15v18.4c-57.8 7.4-103 54.8-103 112.6v96c0 48-24 96-48 128h332c-24-32-48-80-48-128v-96c0-57.8-45.2-105.2-103-112.6V40c0-8.3-6.7-15-15-15zm-48 400c0 26.5 21.5 48 48 48s48-21.5 48-48h-96z" />
);

// Whistle/Horn - by Delapouite  
export const IconHorn: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M119.4 32.95c-15.6 0-31.7 6.9-44.5 19.7-12.8 12.8-19.8 28.9-19.7 44.6.1 15.6 7 31.6 19.8 44.45 12.8 12.8 28.9 19.7 44.5 19.7 15.6-.1 31.7-7 44.5-19.8l8.5-8.5 174.7 174.7c-16.8 25.3-15.4 59.5 4.2 83.4l-64.8 64.8 12.8 12.8 64.8-64.8c23.9 19.6 58.1 21 83.4 4.2l-174.7-174.7 8.5-8.5c12.8-12.8 19.7-28.9 19.8-44.5 0-15.6-6.9-31.7-19.7-44.5-12.85-12.8-28.85-19.7-44.45-19.8-15.7 0-31.7 6.9-44.6 19.7l-8.5 8.5-19.5-19.5 8.5-8.5c12.8-12.8 19.8-28.9 19.7-44.5 0-15.7-6.9-31.7-19.7-44.55-12.8-12.8-28.9-19.7-44.5-19.7zm0 18c10.7 0 22 4.9 31.7 14.6 9.7 9.7 14.6 21 14.6 31.7 0 10.7-5 22-14.7 31.7l-8.5 8.5-63.3-63.3 8.5-8.5c9.7-9.7 21-14.7 31.7-14.7zm137.8 50.2c10.7 0 22 4.9 31.65 14.6 9.8 9.7 14.7 21 14.7 31.7 0 10.7-4.9 22-14.7 31.65l-8.5 8.5-63.3-63.3 8.5-8.5c9.7-9.7 21-14.6 31.65-14.65z" />
);

// Explosion/Thunder - by Lorc
export const IconThunder: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M280 16L140 256h100L136 496l280-304H280L384 16H280z" />
);

// Drum - by Delapouite
export const IconDrum: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 89c-100.2 0-183 25.4-183 57v220c0 31.6 82.8 57 183 57s183-25.4 183-57V146c0-31.6-82.8-57-183-57zm0 18c89.5 0 165 22.8 165 39s-75.5 39-165 39-165-22.8-165-39 75.5-39 165-39zm-165 89c35.7 19.8 97.1 32 165 32s129.3-12.2 165-32v44c0 16.2-75.5 39-165 39s-165-22.8-165-39v-44zm0 88c35.7 19.8 97.1 32 165 32s129.3-12.2 165-32v44c0 16.2-75.5 39-165 39s-165-22.8-165-39v-44zm0 88c35.7 19.8 97.1 32 165 32s129.3-12.2 165-32v44c0 16.2-75.5 39-165 39s-165-22.8-165-39v-44z" />
);

// ============ LIGHT-BASED ITEMS ============

// Lantern - by Lorc
export const IconLantern: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 16c-8.8 0-16 7.2-16 16v32h-48v32h128V64h-48V32c0-8.8-7.2-16-16-16zM160 112v48c0 17.7 14.3 32 32 32h128c17.7 0 32-14.3 32-32v-48H160zm16 96v176c0 35.3 28.7 64 64 64h32c35.3 0 64-28.7 64-64V208h-32v176c0 17.6-14.4 32-32 32h-32c-17.6 0-32-14.4-32-32V208h-32zm64 32c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32z" />
);

// Mirror - by Lorc
export const IconMirror: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 48c-88.4 0-160 71.6-160 160s71.6 160 160 160 160-71.6 160-160S344.4 48 256 48zm0 32c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zm0 16c-61.9 0-112 50.1-112 112 0 7.3.7 14.4 2.1 21.3C166.8 187.5 207.3 160 256 160c48.7 0 89.2 27.5 109.9 69.3 1.4-6.9 2.1-14 2.1-21.3 0-61.9-50.1-112-112-112zM176 384v80h160v-80H176z" />
);

// Sunburst/Sunrod - by Lorc
export const IconSunrod: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 96c-88.4 0-160 71.6-160 160s71.6 160 160 160 160-71.6 160-160S344.4 96 256 96zm0 32c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zM256 16v48h18V16h-18zm0 432v48h18v-48h-18zM112.4 61.6l-12.8 12.8 33.9 33.9 12.8-12.8-33.9-33.9zm287.2 0l-33.9 33.9 12.8 12.8 33.9-33.9-12.8-12.8zM16 247v18h48v-18H16zm432 0v18h48v-18h-48zM133.5 378.7l-33.9 33.9 12.8 12.8 33.9-33.9-12.8-12.8zm245 0l-12.8 12.8 33.9 33.9 12.8-12.8-33.9-33.9z" />
);

// Candle - by Lorc
export const IconCandle: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M240 32c0 48 32 80 32 128s-16 48-16 80h-48c0-32-16-32-16-80s32-80 32-128h16zm-64 224v32h160v-32H176zm16 48v176h128V304H192z" />
);

// ============ WATER/COLD ITEMS ============

// Bucket - by Delapouite
export const IconBucket: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M160 64v48H96l32 336h256l32-336h-64V64H160zm16 16h160v32H176V80zm-64 64h288l-24 256H136l-24-256z" />
);

// Frost/Ice Potion - by Lorc
export const IconFrostPotion: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M192 32v128c-35.3 0-64 28.7-64 64v224h256V224c0-35.3-28.7-64-64-64V32H192zm16 16h96v112h-96V48zm-48 144h176c26.5 0 48 21.5 48 48v64H160v-64c0-26.5 21.5-48 48-48zm-16 128h224v112H144V320zm64 16v80h16v-80h-16zm48 0v80h16v-80h-16zm48 0v80h16v-80h-16z" />
);

// Ice cube - by Lorc
export const IconIce: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 48L96 160v192l160 112 160-112V160L256 48zm0 38.4L368 176v160l-112 89.6L144 336V176l112-89.6zM256 192c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64z" />
);

// Horseshoe - by Delapouite
export const IconHorseshoe: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32c-88.4 0-160 71.6-160 160v128h64V192c0-53 43-96 96-96s96 43 96 96v128h64V192c0-88.4-71.6-160-160-160zm-96 304v128h64V336h-64zm128 0v128h64V336h-64z" />
);

// ============ FIRE ITEMS ============

// Torch - by Lorc
export const IconTorch: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32c-32 0-48 48-48 96s32 64 32 128c0-16 8-32 16-32s16 16 16 32c0-64 32-80 32-128s-16-96-48-96zm-32 240v192h64V272h-64z" />
);

// Oil Flask - by Lorc
export const IconOilFlask: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M224 32v64c-35.3 0-64 28.7-64 64v256c0 35.3 28.7 64 64 64h64c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64V32h-64zm16 16h32v48h-32V48zm-48 80h128c26.5 0 48 21.5 48 48v16H144v-16c0-26.5 21.5-48 48-48zm-48 80h224v208c0 26.5-21.5 48-48 48h-64c-26.5 0-48-21.5-48-48V208h-64z" />
);

// Sword/Blade - by Lorc
export const IconBlade: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M373.5 27.5L256 145l-27.5-27.5L201 145l27.5 27.5L128 273l32 32 100.5-100.5L288 232l27.5-27.5L288 177l117.5-117.5-32-32zM105 305l-64 64 102 102 64-64-102-102z" />
);

// Campfire/Burning Brand - by Lorc
export const IconBurningBrand: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 48c-24 24-40 56-40 96 0 16 8 40 24 40s24-24 24-40c16 32 24 56 24 88 0 48-32 88-80 88 48 16 80 0 112-32 0 48-16 80-48 112h112c-32-32-48-64-48-112 32 32 64 48 112 32-48 0-80-40-80-88 0-32 8-56 24-88 0 16 8 40 24 40s24-24 24-40c0-40-16-72-40-96l-24 24-24-24zM160 416v48h192v-48H160z" />
);

// ============ TRAPS/TOOLS ============

// Bear Trap - by Lorc
export const IconTrap: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 80l-48 48h96l-48-48zm-128 64l-64 64 64 64 64-64-64-64zm256 0l-64 64 64 64 64-64-64-64zm-176 80v64h96v-64h-96zm-80 80l-64 64 64 64h256l64-64-64-64H128z" />
);

// Caltrops - by Lorc
export const IconCaltrops: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 64l-64 128h128L256 64zm-128 144l-64 128h128l-64-128zm256 0l-64 128h128l-64-128zm-128 80l-64 128h128l-64-128z" />
);

// Net - by Lorc
export const IconNet: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 48L96 208v176l160 80 160-80V208L256 48zm0 38l128 128v144l-128 64-128-64V214L256 86zm0 58c-53 0-96 43-96 96s43 96 96 96 96-43 96-96-43-96-96-96zm0 32c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64z" />
);

// Pickaxe - by Lorc
export const IconPickaxe: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M400 32L272 160l-32-32L32 336l144 144 208-208-32-32L480 112l-80-80zM272 192l48 48-176 176-48-48 176-176z" />
);

// Spear - by Lorc
export const IconSpear: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M384 32L256 160l-32-32-192 192 128 128 192-192-32-32L448 96l-64-64zM224 192l96 96-160 160-96-96 160-160z" />
);

// Club/Mace - by Lorc
export const IconClub: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M336 48c-53 0-96 43-96 96 0 17.8 4.8 34.4 13.2 48.7L105 341l66 66 148.3-148.2c14.3 8.4 30.9 13.2 48.7 13.2 53 0 96-43 96-96s-43-96-96-96-32-32-32-32zm0 32c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM105 373l-64 64 34 34 64-64-34-34z" />
);

// ============ PSYCHOLOGICAL ITEMS ============

// Skull - by Lorc
export const IconSkull: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 48c-79.5 0-144 64.5-144 144 0 54.7 30.6 102.3 75.6 126.5L176 432h160l-11.6-113.5c45-24.2 75.6-71.8 75.6-126.5 0-79.5-64.5-144-144-144zm-48 112c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zm96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zm-48 80c26.5 0 48 14.3 48 32h-96c0-17.7 21.5-32 48-32z" />
);

// Cape - by Delapouite
export const IconCape: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M160 48v416c48-32 96-48 96-48s48 16 96 48V48c-32 32-96 48-96 48s-64-16-96-48z" />
);

// Gauntlet/Glove - by Lorc
export const IconGauntlet: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M288 32v96h-64v80h-64v112h-32v80h48v64h160v-64h48v-80h-32V208h-64v-80h64V32h-64zm-48 16h32v64h-32V48zm-80 144h48v16h-48v-16zm64 0h48v16h-48v-16zm64 0h48v16h-48v-16z" />
);

// Scarecrow - by Delapouite
export const IconScarecrow: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm0 112c-17.7 0-32 14.3-32 32v32H96v48h128v32H128v48h96v128h64V336h96v-48H288v-32h128v-48H288v-32c0-17.7-14.3-32-32-32z" />
);

// ============ SPECIES ICONS ============

// Human - by Delapouite
export const IconHuman: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 48c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64zm-96 192c-17.7 0-32 14.3-32 32v176h64V304h128v144h64V272c0-17.7-14.3-32-32-32H160z" />
);

// Dwarf - by Lorc
export const IconDwarf: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 48c-35.3 0-64 28.7-64 64 0 17.7 7.2 33.7 18.7 45.3-6.5 8.3-14.7 19-14.7 34.7 0 35.3 28.7 48 60 48s60-12.7 60-48c0-15.7-8.2-26.4-14.7-34.7C312.8 145.7 320 129.7 320 112c0-35.3-28.7-64-64-64zm-112 208v208h224V256H144zm48 48h128v32H192v-32zm0 64h128v32H192v-32z" />
);

// Elf - by Lorc
export const IconElf: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32c-8 0-16 4-24 12l-64 80c-8 10-8 24 0 34l16 20c-48 16-72 48-72 86v172c0 17.7 14.3 32 32 32h224c17.7 0 32-14.3 32-32V264c0-38-24-70-72-86l16-20c8-10 8-24 0-34l-64-80c-8-8-16-12-24-12zm0 48l40 50-40 30-40-30 40-50z" />
);

// Halfling/Hobbit - by Delapouite
export const IconHalfling: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 80c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm-80 144c-17.7 0-32 14.3-32 32v128h48v80h128v-80h48V256c0-17.7-14.3-32-32-32H176z" />
);

// Orc - by Lorc
export const IconOrc: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32c-44.2 0-80 35.8-80 80 0 17.3 5.5 33.3 14.8 46.4L160 176v32l-48 48v80l48-16v128h192V320l48 16v-80l-48-48v-32l-30.8-17.6c9.3-13.1 14.8-29.1 14.8-46.4 0-44.2-35.8-80-80-80zm-32 80c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16zm64 0c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16z" />
);

// Gnome - by Lorc
export const IconGnome: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32l-48 96c-16 0-32 16-32 48 0 16 8 32 24 40v32c-48 16-72 48-72 80v136h256V328c0-32-24-64-72-80v-32c16-8 24-24 24-40 0-32-16-48-32-48l-48-96zm0 80c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32z" />
);

// Tiefling/Devil - by Lorc
export const IconTiefling: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M176 32l32 64h-16l-48-48-16 48 32 32c-26.5 17.7-48 53-48 96v64h48c0 32 24 64 48 80v80h64v-80c24-16 48-48 48-80h48v-64c0-43-21.5-78.3-48-96l32-32-16-48-48 48h-16l32-64h-48l-32 48-32-48h-48zm80 112c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32z" />
);

// Dragonborn/Dragon - by Lorc
export const IconDragonborn: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M384 64l-64 32-32-32-32 32-64-32c-32 32-48 80-48 128 0 32 8 64 24 88l-40 40v80l48 48h80v-64h48v64h80l48-48v-80l-40-40c16-24 24-56 24-88 0-48-16-96-48-128zm-176 96c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zm96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32z" />
);

// ============ BACKGROUND/OCCUPATION ICONS ============

// Trapper - by Lorc
export const IconTrapper: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64zM160 176l-80 80 80 80 32-32-32-32h64v-64h-64l32-32h-32zm192 0l-32 32 32 32h-64v64h64l-32 32 80-80-48-80zM192 368l-32 96h192l-32-96H192z" />
);

// Merchant - by Delapouite
export const IconMerchant: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M176 32v48h160V32H176zM128 96v64h256V96H128zm0 80v48c0 26.5 21.5 48 48 48h16v192h128V272h16c26.5 0 48-21.5 48-48v-48H128z" />
);

// Traveler - by Lorc
export const IconTraveler: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 48c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64zm-48 160c-35.3 0-64 28.7-64 64v48l48 32v96h128v-96l48-32v-48c0-35.3-28.7-64-64-64h-96zm-80 0l-48 240h48l32-160-32-80zm208 0l-32 80 32 160h48l-48-240z" />
);

// Farmer - by Delapouite
export const IconFarmer: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64zm-112 176l-48 48v112h48V256l32 32h160l32-32v112h48V256l-48-48H144zm112 80c35.3 0 64 28.7 64 64v96H192v-96c0-35.3 28.7-64 64-64z" />
);

// Blacksmith/Anvil - by Lorc
export const IconBlacksmith: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M128 64v64h256V64H128zm32 80v48h192v-48H160zm-64 64v48h320v-48H96zm32 64v80c0 35.3 28.7 64 64 64h128c35.3 0 64-28.7 64-64v-80H128z" />
);

// Herbalist - by Lorc
export const IconHerbalist: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32c-8 0-16 8-16 16v80c-48 0-96 32-96 96h-32c-17.7 0-32 14.3-32 32v32c0 17.7 14.3 32 32 32h32v64c0 35.3 28.7 64 64 64h96c35.3 0 64-28.7 64-64v-64h32c17.7 0 32-14.3 32-32v-32c0-17.7-14.3-32-32-32h-32c0-64-48-96-96-96V48c0-8-8-16-16-16zm0 128c26.5 0 48 21.5 48 48v80h-96v-80c0-26.5 21.5-48 48-48z" />
);

// Hunter/Bow - by Lorc
export const IconHunter: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M416 32c-80 0-144 64-144 144 0 32 10.7 61.5 28.5 85.5L192 370l-32-32-64 64 64 64 64-64-32-32 108.5-108.5c24 17.8 53.5 28.5 85.5 28.5 80 0 144-64 144-144h-32c0 61.9-50.1 112-112 112s-112-50.1-112-112S354.1 64 416 64V32zM80 128v256h48V128H80z" />
);

// Miller/Wheat - by Lorc
export const IconMiller: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M256 32l-32 64 32 32 32-32-32-64zm-64 96l-32 64 32 32 32-32-32-64zm128 0l-32 64 32 32 32-32-32-64zm-64 80l-48 48v80l48 48 48-48v-80l-48-48zm-128 48l-32 64 32 32 32-32-32-64zm256 0l-32 64 32 32 32-32-32-64zM192 384v80h128v-80H192z" />
);

// Innkeeper/Tankard - by Lorc
export const IconInnkeeper: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M128 64v48c0 26.5 21.5 48 48 48h160c26.5 0 48-21.5 48-48V64H128zm0 112v240c0 26.5 21.5 48 48 48h160c26.5 0 48-21.5 48-48V176h-16v240c0 17.7-14.3 32-32 32H176c-17.7 0-32-14.3-32-32V176h-16zm256 0v80c26.5 0 48-21.5 48-48v-32h-48z" />
);

// Shepherd/Crook - by Delapouite
export const IconShepherd: React.FC<GameIconProps> = (props) => (
  <GameIconBase {...props} path="M320 32c-53 0-96 43-96 96 0 35.3 19.1 66.1 47.5 82.7L240 464h32l32-256c35.2-16.6 56-47.4 56-80 0-53-43-96-96-96h56zm0 48c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zM128 192c-17.7 0-32 14.3-32 32v240h64V224c0-17.7-14.3-32-32-32z" />
);

// ============ ITEM ID TO ICON MAPPING ============

export const ITEM_ICONS: Record<string, React.FC<GameIconProps>> = {
  // Sound-based
  'brass-bell': IconBell,
  'shepherds-whistle': IconHorn,
  'thunderstone': IconThunder,
  'drum': IconDrum,
  
  // Light-based
  'lantern': IconLantern,
  'polished-mirror': IconMirror,
  'sunrod': IconSunrod,
  'spotlight-candle': IconCandle,
  
  // Water/Cold
  'bucket-of-water': IconBucket,
  'frost-potion': IconFrostPotion,
  'ice-block': IconIce,
  'cold-iron-horseshoe': IconHorseshoe,
  
  // Fire
  'torch': IconTorch,
  'fire-oil-flask': IconOilFlask,
  'heated-blade': IconBlade,
  'burning-brand': IconBurningBrand,
  
  // Traps/Tools
  'leg-trap': IconTrap,
  'caltrops': IconCaltrops,
  'net': IconNet,
  'pickaxe': IconPickaxe,
  'spear': IconSpear,
  'club': IconClub,
  
  // Psychological
  'skull-totem': IconSkull,
  'red-cape': IconCape,
  'challenge-glove': IconGauntlet,
  'decoy-scarecrow': IconScarecrow,
};

// ============ SPECIES ICON MAPPING ============

export const SPECIES_ICONS: Record<string, React.FC<GameIconProps>> = {
  'Human': IconHuman,
  'Dwarf': IconDwarf,
  'Elf': IconElf,
  'Halfling': IconHalfling,
  'Half-Orc': IconOrc,
  'Gnome': IconGnome,
  'Tiefling': IconTiefling,
  'Dragonborn': IconDragonborn,
};

// ============ BACKGROUND ICON MAPPING ============

export const BACKGROUND_ICONS: Record<string, React.FC<GameIconProps>> = {
  'Trapper': IconTrapper,
  'Merchant': IconMerchant,
  'Traveler': IconTraveler,
  'Farmer': IconFarmer,
  'Blacksmith': IconBlacksmith,
  'Herbalist': IconHerbalist,
  'Hunter': IconHunter,
  'Miller': IconMiller,
  'Innkeeper': IconInnkeeper,
  'Shepherd': IconShepherd,
};

// Helper to get icon component by item ID
export function getItemIcon(itemId: string): React.FC<GameIconProps> | null {
  return ITEM_ICONS[itemId] || null;
}

// Component that renders the appropriate icon for a species
export const SpeciesIcon: React.FC<{ species: string } & GameIconProps> = ({ 
  species, 
  size = 24,
  color,
  className 
}) => {
  const IconComponent = SPECIES_ICONS[species];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} className={className} />;
};

// Component that renders the appropriate icon for a background
export const BackgroundIcon: React.FC<{ background: string } & GameIconProps> = ({ 
  background, 
  size = 24,
  color,
  className 
}) => {
  const IconComponent = BACKGROUND_ICONS[background];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} className={className} />;
};

// Component that renders the appropriate icon for an item
export const ItemIcon: React.FC<{ itemId: string } & GameIconProps> = ({ 
  itemId, 
  size = 24,
  color,
  className 
}) => {
  const IconComponent = ITEM_ICONS[itemId];
  
  if (!IconComponent) {
    // Fallback to question mark for unknown items
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 512 512"
        width={size}
        height={size}
        className={`game-icon ${className || ''}`}
        style={{ fill: color || 'currentColor' }}
      >
        <path d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm0 336c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm32-128c0 17.7-14.3 32-32 32s-32-14.3-32-32v-16c0-35.3 28.7-64 64-64 17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32h-32c0-35.3 28.7-64 64-64s64 28.7 64 64c0 29.8-20.4 54.9-48 62v18z" />
      </svg>
    );
  }
  
  return <IconComponent size={size} color={color} className={className} />;
};
