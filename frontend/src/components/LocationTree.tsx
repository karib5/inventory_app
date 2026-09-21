import React from 'react';
import { Location, LocationType } from '../api';

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  zone: 'Area',
  aisle: 'Area',
  rack: 'Rack',
  shelf: 'Shelf',
  bin: 'Bin',
};

function LocationNode({
  location,
  childrenByParent,
  depth,
  canManage,
  onAddChild,
  onEdit,
  onToggleActive,
}: {
  location: Location;
  childrenByParent: Map<number | null, Location[]>;
  depth: number;
  canManage: boolean;
  onAddChild: (parentId: number) => void;
  onEdit: (location: Location) => void;
  onToggleActive: (location: Location) => void;
}) {
  const children = childrenByParent.get(location.id) ?? [];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 0',
          paddingLeft: depth * 24,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ color: '#a8b0bd' }}>{depth > 0 ? '└─' : ''}</span>
        <span style={{ fontWeight: 600 }}>{location.code}</span>
        <span>{location.name}</span>
        {location.location_type && (
          <span className="badge badge-active">{LOCATION_TYPE_LABELS[location.location_type]}</span>
        )}
        {!location.is_active && <span className="badge badge-inactive">Inactive</span>}
        {canManage && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => onAddChild(location.id)}>+ Child</button>
            <button onClick={() => onEdit(location)}>Edit</button>
            <button onClick={() => onToggleActive(location)}>
              {location.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </span>
        )}
      </div>
      {children.map(child => (
        <LocationNode
          key={child.id}
          location={child}
          childrenByParent={childrenByParent}
          depth={depth + 1}
          canManage={canManage}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}

export default function LocationTree({
  locations,
  canManage,
  onAddChild,
  onEdit,
  onToggleActive,
}: {
  locations: Location[];
  canManage: boolean;
  onAddChild: (parentId: number) => void;
  onEdit: (location: Location) => void;
  onToggleActive: (location: Location) => void;
}) {
  const childrenByParent = new Map<number | null, Location[]>();
  for (const loc of locations) {
    const key = loc.parent_id;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(loc);
  }
  const roots = childrenByParent.get(null) ?? [];

  if (locations.length === 0) {
    return <p>No locations in this warehouse yet.</p>;
  }

  return (
    <div>
      {roots.map(root => (
        <LocationNode
          key={root.id}
          location={root}
          childrenByParent={childrenByParent}
          depth={0}
          canManage={canManage}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
