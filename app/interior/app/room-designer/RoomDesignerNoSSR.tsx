'use client';

import dynamic from 'next/dynamic';

const RoomDesignerClient = dynamic(() => import('./RoomDesignerClient'), {
  ssr: false,
  loading: () => null,
});

export default function RoomDesignerNoSSR() {
  return <RoomDesignerClient />;
}
