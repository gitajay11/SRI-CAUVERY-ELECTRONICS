// The App Router's <Link> accepts unstable_dynamicOnHover — a full prefetch
// on hover or touch — but the public next/link types do not list it yet.
import 'next/link';

declare module 'next/dist/client/link' {
  // Type parameters must match the original declaration exactly to merge.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  interface LinkProps<RouteInferType = any> {
    unstable_dynamicOnHover?: boolean;
  }
}
