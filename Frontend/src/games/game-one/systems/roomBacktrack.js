import { getCellRecordAtWorldPoint } from './roomFlow';

export const getPortalRoomId = (worldLayout, portal) => {
  if (!worldLayout || !portal) {
    return '';
  }

  const portalRecord = getCellRecordAtWorldPoint(worldLayout, Number(portal.x || 0), Number(portal.y || 0));
  return portalRecord?.cellId || '';
};

export const isReturnToBlockedRoom = (blockedReturnRoomId, roomId) => {
  const normalizedRoomId = typeof roomId === 'string' ? roomId.trim() : '';
  return Boolean(normalizedRoomId) && normalizedRoomId === blockedReturnRoomId;
};
