'use client';

import React, { useEffect, useState } from 'react';

interface VirtualTourRoom {
  name: string;
  icon: string;
  imageUrl?: string;
  features: string[];
}

interface VirtualTourPhoto {
  url: string;
  label: string;
}

interface VirtualTour360Props {
  propertyName: string;
  rooms?: VirtualTourRoom[];
  photos?: VirtualTourPhoto[];
}

export function VirtualTour360({
  propertyName,
  rooms = [],
  photos = [],
}: VirtualTour360Props) {
  const [activeRoom, setActiveRoom] = useState(0);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (activeRoom >= rooms.length) {
      setActiveRoom(0);
    }
  }, [activeRoom, rooms.length]);

  useEffect(() => {
    if (activePhoto >= photos.length) {
      setActivePhoto(0);
    }
  }, [activePhoto, photos.length]);

  const currentRoom = rooms[activeRoom];
  const currentPhoto = photos[activePhoto];

  return (
    <div className="bg-[#071008] p-6 text-[#edf9eb]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-bold text-lg text-white">Captured Property Media</h3>
          <p className="text-sm text-[#9fb29d]">{propertyName}</p>
        </div>
        <span className="bg-white/10 px-3 py-1 text-xs font-semibold text-[#cfe2ca]">
          {photos.length > 0 ? `${photos.length} uploaded` : 'No media attached'}
        </span>
      </div>

      {currentPhoto ? (
        <div className="space-y-4 mb-6">
          <div className="overflow-hidden border border-[#27cf6c]/25 bg-black">
            <img
              src={currentPhoto.url}
              alt={currentPhoto.label}
              className="h-72 w-full object-cover"
              loading="lazy"
            />
          </div>
          {photos.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <button
                  key={`${photo.url}-${index}`}
                  onClick={() => setActivePhoto(index)}
                  className={`overflow-hidden border transition ${
                    activePhoto === index
                      ? 'border-[#27cf6c] ring-2 ring-[#27cf6c]/20'
                      : 'border-white/10 hover:border-[#27cf6c]/45'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="h-20 w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mb-6 border border-dashed border-[#27cf6c]/30 bg-white/5 p-6 text-sm text-[#cfe2ca]">
          No 360 capture or room photos are attached to this property yet. Upload property imagery
          to replace this placeholder state with real media.
        </div>
      )}

      {rooms.length > 0 ? (
        <>
          <div className="mb-4">
            <div className="font-semibold text-sm text-white mb-3">Property layout checklist</div>
            <div className="flex flex-wrap gap-2">
              {rooms.map((room, index) => (
                <button
                  key={`${room.name}-${index}`}
                  onClick={() => setActiveRoom(index)}
                  className={`border px-3 py-2 text-sm transition ${
                    activeRoom === index
                      ? 'border-[#27cf6c] bg-[#27cf6c]/10 text-white'
                      : 'border-white/10 text-[#cfe2ca] hover:border-[#27cf6c]/45'
                  }`}
                >
                  <span className="mr-2">{room.icon}</span>
                  {room.name}
                </button>
              ))}
            </div>
          </div>

          {currentRoom ? (
            <div className="bg-white/5 p-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="text-lg font-semibold text-white">
                  {currentRoom.icon} {currentRoom.name}
                </div>
                <span className="text-xs font-semibold text-[#9fb29d]">
                  {activeRoom + 1} / {rooms.length}
                </span>
              </div>
              <ul className="space-y-2 text-sm text-[#cfe2ca]">
                {currentRoom.features.map((feature, index) => (
                  <li key={`${currentRoom.name}-${feature}-${index}`} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
