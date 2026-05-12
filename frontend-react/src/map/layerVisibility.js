export function setLayerGroupVisibility({
  map,
  groupRef,
  visible
}) {
  if (!map || !groupRef?.current) return;

  const group = groupRef.current;

  if (visible) {
    if (!map.hasLayer(group)) {
      group.addTo(map);
    }
    return;
  }

  if (map.hasLayer(group)) {
    map.removeLayer(group);
  }
}