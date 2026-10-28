import React, { forwardRef, useMemo } from 'react';

import { PLATFORM_TILE_BY_KEY } from '../../../features/level-editor/platformTileCatalog';
import { gameOneRuntimeAssets } from '../assets/manifest/runtimeAssets';
import { prepareGameOneRuntimeLevelData } from '../runtime/prepareGameOneRuntimeLevelData';
import GameCanvas from './GameCanvas';

const GameOnePlayMode = forwardRef(({
  levelData,
  runtimeAssets = gameOneRuntimeAssets,
  platformTileByKey = PLATFORM_TILE_BY_KEY,
  ...canvasProps
}, ref) => {
  const preparedLevelData = useMemo(
    () => prepareGameOneRuntimeLevelData(levelData, { platformTileByKey }),
    [levelData, platformTileByKey],
  );

  if (!preparedLevelData?.viewport) {
    return null;
  }

  return (
    <GameCanvas
      ref={ref}
      {...canvasProps}
      levelData={preparedLevelData}
      runtimeAssets={runtimeAssets}
    />
  );
});

export default GameOnePlayMode;
