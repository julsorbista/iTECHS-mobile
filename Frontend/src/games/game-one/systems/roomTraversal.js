export const shouldUsePortalOnlyRoomTraversal = (levelData, worldObjectsData = {}) => {
  if (levelData?.roomTraversalMode === 'PORTAL_ONLY') {
    return true;
  }

  const roomCount = Array.isArray(levelData?.grid?.cells)
    ? levelData.grid.cells.length
    : (Array.isArray(levelData?.rooms) ? levelData.rooms.length : 0);
  const portalConfigs = Array.isArray(worldObjectsData?.portal)
    ? worldObjectsData.portal
    : (worldObjectsData?.portal && typeof worldObjectsData.portal === 'object'
      ? [worldObjectsData.portal]
      : []);

  if (roomCount > 1 && portalConfigs.length > 0) {
    return true;
  }

  return portalConfigs.some((portalConfig) => (
    typeof portalConfig?.targetRoomId === 'string' && Boolean(portalConfig.targetRoomId.trim())
  ));
};
