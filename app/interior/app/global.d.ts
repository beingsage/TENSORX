// Temporary workaround for React Three Fiber component typings in this repo.
// This allows JSX elements such as <meshStandardMaterial /> and <meshPhysicalMaterial />.

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

export {}
