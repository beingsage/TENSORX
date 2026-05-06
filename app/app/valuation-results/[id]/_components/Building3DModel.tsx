'use client';

import { Building3DModel as LiveBuilding3DModel } from './ValuationResults/Building3DModel';

interface Building3DModelProps {
  propertyId: string;
  buildingAge: number;
  propertyType: string;
  conditionScore: number;
}

function inferBedrooms(propertyType: string) {
  const match = propertyType.match(/^(\d+)/);
  if (match) {
    return Math.max(1, parseInt(match[1], 10));
  }
  if (/villa|townhouse/i.test(propertyType)) {
    return 4;
  }
  return 3;
}

export default function Building3DModel({
  propertyId,
  buildingAge,
  propertyType,
  conditionScore,
}: Building3DModelProps) {
  const bedrooms = inferBedrooms(propertyType);
  const bathrooms = Math.max(2, Math.min(5, bedrooms));

  return (
    <div data-property-id={propertyId}>
      <LiveBuilding3DModel
        propertyType={propertyType}
        bedrooms={bedrooms}
        bathrooms={bathrooms}
        buildingAge={buildingAge}
        hasBalcony={conditionScore >= 6}
        hasGarden={/villa|bungalow/i.test(propertyType)}
      />
    </div>
  );
}
