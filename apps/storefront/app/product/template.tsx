import { PageTransition } from '@/components/motion/PageTransition';

/**
 * Remounts on every page change below this segment, which is what lets the
 * page transition play (see PageTransition).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
