/**
 * Global type declarations for the TMP Live App
 */

// Fix framer-motion className type issue
// This extends the motion component types to properly accept className
import 'framer-motion';

declare module 'framer-motion' {
  export interface MotionProps {
    className?: string;
  }
}
