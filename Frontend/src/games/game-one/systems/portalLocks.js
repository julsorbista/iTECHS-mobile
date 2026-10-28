import { getCellRecordAtWorldPoint } from './roomFlow';

const normalizeQuestionId = (value) => (typeof value === 'string' ? value.trim() : '');

export const resolvePortalQuestionId = (portalConfig, villainConfigs = [], worldLayout = null) => {
  const explicitQuestionId = normalizeQuestionId(portalConfig?.questionId);
  if (explicitQuestionId) {
    return explicitQuestionId;
  }

  const targetRoomId = typeof portalConfig?.targetRoomId === 'string' ? portalConfig.targetRoomId.trim() : '';
  const linkName = typeof portalConfig?.linkName === 'string' ? portalConfig.linkName.trim() : '';
  const isProgressionPortal = Boolean(targetRoomId)
    || Boolean(linkName)
    || portalConfig?.endsLevel === false;

  if (!isProgressionPortal || !worldLayout) {
    return '';
  }

  const portalCell = getCellRecordAtWorldPoint(
    worldLayout,
    Number(portalConfig?.x || 0),
    Number(portalConfig?.y || 0),
  );

  if (!portalCell) {
    return '';
  }

  const matchingVillain = villainConfigs.find((villainConfig) => {
    const questionId = normalizeQuestionId(villainConfig?.questionId);
    if (!questionId) {
      return false;
    }

    const villainCell = getCellRecordAtWorldPoint(
      worldLayout,
      Number(villainConfig?.x || 0),
      Number(villainConfig?.y || 0),
    );

    return villainCell?.cellId === portalCell.cellId;
  });

  return normalizeQuestionId(matchingVillain?.questionId);
};
