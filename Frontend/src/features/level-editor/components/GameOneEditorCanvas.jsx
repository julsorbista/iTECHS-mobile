import React, { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Crosshair, Minus, Move, Plus } from 'lucide-react';

import EditorBootScene from '../../../games/game-one/editor/EditorBootScene';
import EditorPreloadScene from '../../../games/game-one/editor/EditorPreloadScene';
import EditorScene from '../../../games/game-one/editor/EditorScene';

const getFallbackPoint = (event, container, viewport) => {
  const bounds = container.getBoundingClientRect();
  const scaleX = viewport.width / bounds.width;
  const scaleY = viewport.height / bounds.height;

  return {
    x: (event.clientX - bounds.left) * scaleX,
    y: (event.clientY - bounds.top) * scaleY,
  };
};

const buildEditorPayload = ({
  runtimeAssets,
  levelData,
  selectedCellId,
  selectedObjectIds,
  settings,
  callbacks,
}) => ({
  runtimeAssets,
  levelData,
  selectedCellId,
  selectedObjectIds,
  settings,
  callbacks,
});

const GameOneEditorCanvas = ({
  className = '',
  levelData,
  runtimeAssets,
  selectedCellId,
  selectedObjectIds,
  settings,
  editorMode = 'components',
  mapTiles = [],
  selectedMapTileIds = [],
  selectedMapTileId = '',
  mapTileToolMode = 'select',
  mapTileSnap = 40,
  mapTileBrush = null,
  mapTileBrushSize = 96,
  mapTileBrushRotationDeg = 0,
  mapTileBrushFlipX = false,
  mapTileBrushFlipY = false,
  showCameraHints = true,
  showCameraControls = true,
  allowCameraNavigation = true,
  onSelectionChange,
  onCellSelect,
  onBackgroundClick,
  onAddCell,
  onAddObject,
  onMoveObjects,
  onResizeObject,
  onMapTileAction,
  onMapTileSelect,
  onMapTileMove,
  onMapTileResize,
  onMapTileDrop,
  onTriggerPlatformAction,
}) => {
  const hostRef = useRef(null);
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [canPan, setCanPan] = useState(false);

  const normalizedSelectedMapTileIds = useMemo(() => {
    if (Array.isArray(selectedMapTileIds) && selectedMapTileIds.length) {
      return selectedMapTileIds
        .filter((tileId) => typeof tileId === 'string' && tileId.trim())
        .map((tileId) => tileId.trim());
    }

    if (typeof selectedMapTileId === 'string' && selectedMapTileId.trim()) {
      return [selectedMapTileId.trim()];
    }

    return [];
  }, [selectedMapTileId, selectedMapTileIds]);

  const mergedSettings = useMemo(() => ({
    ...(settings || {}),
    allowCameraNavigation,
    editorMode,
    mapTileToolMode,
    mapTileSnap,
    selectedMapTileId: normalizedSelectedMapTileIds[0] || '',
    selectedMapTileIds: normalizedSelectedMapTileIds,
    mapTileBrush,
    mapTileBrushSize,
    mapTileBrushRotationDeg,
    mapTileBrushFlipX,
    mapTileBrushFlipY,
    mapTiles,
  }), [
    allowCameraNavigation,
    editorMode,
    mapTileBrush,
    mapTileBrushFlipX,
    mapTileBrushFlipY,
    mapTileBrushRotationDeg,
    mapTileBrushSize,
    mapTileSnap,
    mapTileToolMode,
    mapTiles,
    normalizedSelectedMapTileIds,
    selectedMapTileId,
    settings,
  ]);

  const externalGridOverlayEnabled = Boolean(mergedSettings.showGrid)
    && !allowCameraNavigation
    && Number(levelData?.viewport?.width) > 0
    && Number(levelData?.viewport?.height) > 0;

  const editorSettings = useMemo(() => ({
    ...mergedSettings,
    // In static editor mode we draw a deterministic SVG grid to avoid Phaser FIT scaling artifacts.
    showGrid: externalGridOverlayEnabled ? false : mergedSettings.showGrid,
  }), [externalGridOverlayEnabled, mergedSettings]);

  const gridOverlay = useMemo(() => {
    if (!externalGridOverlayEnabled) {
      return {
        width: 1,
        height: 1,
        verticalLines: [],
        horizontalLines: [],
      };
    }

    const width = Math.max(1, Math.round(Number(levelData?.viewport?.width) || 1280));
    const height = Math.max(1, Math.round(Number(levelData?.viewport?.height) || 720));
    const gridSize = Math.max(1, Math.round(Number(mergedSettings.gridSize || 20)));

    const verticalLines = [];
    for (let x = 0; x <= width; x += gridSize) {
      verticalLines.push(x);
    }
    if (verticalLines[verticalLines.length - 1] !== width) {
      verticalLines.push(width);
    }

    const horizontalLines = [];
    for (let y = 0; y <= height; y += gridSize) {
      horizontalLines.push(y);
    }
    if (horizontalLines[horizontalLines.length - 1] !== height) {
      horizontalLines.push(height);
    }

    return {
      width,
      height,
      verticalLines,
      horizontalLines,
    };
  }, [externalGridOverlayEnabled, levelData?.viewport?.height, levelData?.viewport?.width, mergedSettings.gridSize]);

  const callbacks = useMemo(() => ({
    onSelectionChange,
    onCellSelect,
    onBackgroundClick,
    onAddCell,
    onMoveObjects,
    onResizeObject,
    onMapTileAction,
    onMapTileSelect,
    onMapTileMove,
    onMapTileResize,
    onTriggerPlatformAction,
    onCameraChange: ({ zoom, canPan: nextCanPan }) => {
      setCameraZoom(zoom);
      setCanPan(Boolean(nextCanPan));
    },
  }), [
    onAddCell,
    onBackgroundClick,
    onCellSelect,
    onMapTileAction,
    onMapTileMove,
    onMapTileResize,
    onMapTileSelect,
    onMoveObjects,
    onResizeObject,
    onSelectionChange,
    onTriggerPlatformAction,
  ]);

  const payload = useMemo(() => buildEditorPayload({
    runtimeAssets,
    levelData,
    selectedCellId,
    selectedObjectIds,
    settings: editorSettings,
    callbacks,
  }), [callbacks, editorSettings, levelData, runtimeAssets, selectedCellId, selectedObjectIds]);

  useEffect(() => {
    if (!hostRef.current || !runtimeAssets || gameRef.current) {
      return undefined;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: '#0f172a',
      scene: [EditorBootScene, EditorPreloadScene, EditorScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: levelData?.viewport?.width || 1280,
        height: levelData?.viewport?.height || 720,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true,
      },
    });

    game.__ITECHS_EDITOR__ = payload;
    gameRef.current = game;

    return () => {
      gameRef.current = null;
      game.destroy(true);
    };
  }, [runtimeAssets]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) {
      return;
    }

    game.__ITECHS_EDITOR__ = payload;

    if (levelData?.viewport?.width && levelData?.viewport?.height) {
      game.scale.setGameSize(levelData.viewport.width, levelData.viewport.height);
    }

    const editorScene = game.scene.keys?.GameOneEditorScene;
    if (editorScene?.scene?.isActive?.()) {
      editorScene.applyEditorState(payload);
    }
  }, [levelData?.viewport?.height, levelData?.viewport?.width, payload]);

  const getEditorScene = () => {
    const game = gameRef.current;
    if (!game) {
      return null;
    }

    const editorScene = game.scene.keys?.GameOneEditorScene;
    return editorScene?.scene?.isActive?.() ? editorScene : null;
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event) => {
    event.preventDefault();

    if (!containerRef.current || !levelData?.viewport) {
      return;
    }

    const scene = getEditorScene();
    const point = scene?.toWorldPoint?.(event.clientX, event.clientY)
      || getFallbackPoint(event, containerRef.current, levelData.viewport);

    if (editorMode === 'mapTiles') {
      const tileKey = event.dataTransfer.getData('application/x-itechs-map-tile')
        || event.dataTransfer.getData('text/plain');
      const insertSizeRaw = event.dataTransfer.getData('application/x-itechs-insert-size');
      const parsedInsertSize = Number(insertSizeRaw);
      const insertSize = Number.isFinite(parsedInsertSize) ? parsedInsertSize : undefined;

      if (!tileKey) {
        return;
      }

      onMapTileDrop?.(tileKey, point, insertSize);
      return;
    }

    const type = event.dataTransfer.getData('application/x-itechs-level-object')
      || event.dataTransfer.getData('text/plain');
    const insertSizeRaw = event.dataTransfer.getData('application/x-itechs-insert-size');
    const parsedInsertSize = Number(insertSizeRaw);
    const insertSize = Number.isFinite(parsedInsertSize) ? parsedInsertSize : undefined;

    if (!type) {
      return;
    }

    onAddObject?.(type, point, insertSize);
  };

  const runSceneCommand = (callback) => {
    const scene = getEditorScene();
    if (scene) {
      callback(scene);
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-inner ${className}`}
      style={{
        aspectRatio: `${levelData.viewport.width} / ${levelData.viewport.height}`,
      }}
    >
      <div ref={hostRef} className="absolute inset-0" />

      {externalGridOverlayEnabled && (
        <svg
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          viewBox={`0 0 ${gridOverlay.width} ${gridOverlay.height}`}
          preserveAspectRatio="none"
        >
          {gridOverlay.verticalLines.map((x) => (
            <line
              key={`grid-v-${x}`}
              x1={x}
              y1={0}
              x2={x}
              y2={gridOverlay.height}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              shapeRendering="crispEdges"
            />
          ))}
          {gridOverlay.horizontalLines.map((y) => (
            <line
              key={`grid-h-${y}`}
              x1={0}
              y1={y}
              x2={gridOverlay.width}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              shapeRendering="crispEdges"
            />
          ))}
        </svg>
      )}

      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/8" />

      {showCameraHints && (
        <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-100 backdrop-blur">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
            Zoom {Math.round(cameraZoom * 100)}%
          </span>
          <span className="text-slate-300">Scroll to zoom</span>
          <span className="text-slate-300">Space or right-drag to pan</span>
          <span className="text-slate-300">Zoom out to reveal adjacent Add Cell tiles</span>
          {!canPan && (
            <span className="text-amber-300">Pan unlocks after zooming past fitted view</span>
          )}
        </div>
      )}

      {showCameraControls && (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white backdrop-blur">
          <button
            type="button"
            onClick={() => runSceneCommand((scene) => scene.zoomOut())}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
            title="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => runSceneCommand((scene) => scene.fitToCell())}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-100 transition hover:bg-white/10"
            title="Fit selected cell"
          >
            Cell
          </button>
          <button
            type="button"
            onClick={() => runSceneCommand((scene) => scene.fitToSelection())}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-100 transition hover:bg-white/10"
            title="Fit selected objects"
          >
            Sel
          </button>
          <button
            type="button"
            onClick={() => runSceneCommand((scene) => scene.fitToWorld())}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
            title="Fit whole map"
          >
            <Crosshair className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => runSceneCommand((scene) => scene.zoomIn())}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
            title="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="hidden h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-200 sm:inline-flex">
            <Move className="h-4 w-4" />
            Pan
          </div>
        </div>
      )}
    </div>
  );
};

export default GameOneEditorCanvas;
