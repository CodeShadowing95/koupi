'use client';
// Point d'entrée unique de GSAP côté client : on enregistre les plugins une seule fois.
// Toutes les animations passent par gsap.matchMedia() pour respecter prefers-reduced-motion.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin, Physics2DPlugin, ScrambleTextPlugin, SplitText);

export const MOTION_OK = '(prefers-reduced-motion: no-preference)';
export const MOTION_REDUCED = '(prefers-reduced-motion: reduce)';

export { gsap, ScrollTrigger, SplitText, useGSAP };
