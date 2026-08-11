const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const hasValidPosition = (position) => Number.isFinite(Number(position?.x)) && Number.isFinite(Number(position?.y));

export const resolveRespawnPosition = (savedPosition, fallbackPosition) => {
  if (hasValidPosition(savedPosition)) {
    return {
      x: Number(savedPosition.x),
      y: Number(savedPosition.y),
    };
  }

  return {
    x: Number(fallbackPosition?.x || 0),
    y: Number(fallbackPosition?.y || 0),
  };
};

export const resolveRoomStartPosition = ({
  savedRoomStartPosition,
  entryPosition,
  fallbackPosition,
}) => {
  if (hasValidPosition(savedRoomStartPosition)) {
    return resolveRespawnPosition(savedRoomStartPosition, fallbackPosition);
  }

  if (hasValidPosition(entryPosition)) {
    return resolveRespawnPosition(entryPosition, fallbackPosition);
  }

  return resolveRespawnPosition(null, fallbackPosition);
};

export const resolveQuestionRestartPosition = ({
  checkpointPosition,
  triggerPosition,
  fallbackPosition,
}) => {
  return resolveRoomStartPosition({
    savedRoomStartPosition: checkpointPosition,
    entryPosition: triggerPosition,
    fallbackPosition,
  });
};

export const resolveLevelRestartPosition = ({
  firstRoomStartPosition,
  firstRoomSpawnPosition,
}) => resolveRoomStartPosition({
  savedRoomStartPosition: firstRoomStartPosition,
  entryPosition: null,
  fallbackPosition: firstRoomSpawnPosition,
});

export const getPortalExitPosition = (worldBounds, fromPortal, toPortal) => {
  const bounds = worldBounds || {
    left: Number.NEGATIVE_INFINITY,
    right: Number.POSITIVE_INFINITY,
  };
  const horizontalOffset = Number(fromPortal?.x || 0) <= Number(toPortal?.x || 0) ? 56 : -56;

  return {
    x: clamp(
      Number(toPortal?.x || 0) + horizontalOffset,
      Number(bounds.left || 0) + 24,
      Number(bounds.right || 0) - 24,
    ),
    y: Number(toPortal?.y || 0) - 8,
  };
};

export const getLocalCellSpawn = (cellRecord) => {
  const localSpawn = cellRecord?.cell?.spawn && typeof cellRecord.cell.spawn === 'object'
    ? cellRecord.cell.spawn
    : { x: 140, y: 560 };

  return {
    x: Number(cellRecord?.origin?.x || 0) + Number(localSpawn.x || 140),
    y: Number(cellRecord?.origin?.y || 0) + Number(localSpawn.y || 560),
  };
};

export const resolveTargetRoomEntryPosition = ({
  targetRecord,
}) => {
  return getLocalCellSpawn(targetRecord);
};
