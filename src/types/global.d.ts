/**
 * Global type declarations for the TMP Live App
 */

// Fix framer-motion types - extend MotionProps to accept standard HTML attributes
import 'framer-motion';
import type { HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

declare module 'framer-motion' {
  export interface MotionProps extends HTMLAttributes<HTMLElement> {
    className?: string;
  }
  
  // Fix motion.button to accept onClick and other button props
  export interface HTMLMotionProps<T extends keyof HTMLElementTagNameMap> {
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
    disabled?: boolean;
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
    value?: InputHTMLAttributes<HTMLInputElement>['value'];
    placeholder?: InputHTMLAttributes<HTMLInputElement>['placeholder'];
    maxLength?: InputHTMLAttributes<HTMLInputElement>['maxLength'];
  }
}
