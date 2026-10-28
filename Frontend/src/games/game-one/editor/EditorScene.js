import Phaser from 'phaser';
import Player from '../entities/Player';
import Coin from '../entities/Coin';
import Portal from '../entities/Portal';
import GhostMinion from '../entities/GhostMinion';
import SlimeEnemy from '../entities/SlimeEnemy';
import VillainTrigger from '../entities/VillainTrigger';
import ProjectileCaster from '../entities/ProjectileCaster';
import { freezeAnimatedObject } from '../systems/animations';
import {
  getGameOneSurfaceGeometry,
  getGameOneSurfaceMetricsFromGeometry,
} from '../systems/surfaceGeometry';
import {
  INVISIBLE_PLATFORM_MAX_HEIGHT,
  normalizeInvisiblePlatformDimension,
  normalizeInvisiblePlatformLocalFrame,
} from '../systems/invisiblePlatformGrid';
import { triggerPlatformCellToWorldPoint } from '../systems/triggerPlatformUtils';
import { buildWorldGridLayout, getAdjacentEmptyCells, getCellWorldBounds } from '../systems/roomFlow';
import { collectWorldObjects } from '../../../features/level-editor/levelEditorUtils';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const ADD_CELL_ZOOM_THRESHOLD = 0.72;
const HANDLE_RADIUS = 10;
const MAP_TILE_DEFAULT_SNAP = 40;
const MAP_TILE_DEFAULT_SIZE = 16;
const MAP_TILE_MIN_SIZE = 16;
const MAP_TILE_MAX_SIZE = 1024;
const MARQUEE_DRAG_THRESHOLD = 6;
const MAP_TILE_BACK_DEPTH_BASE = -8;
const MAP_TILE_FRONT_DEPTH_BASE = 8;
const COMPONENT_BACK_DEPTH = -2;
const COMPONENT_FRONT_DEPTH = 6;
const SPAWN_REFERENCE_DEPTH = 2;
const TRIGGER_PLATFORM_FILL = 0xf97316;
const TRIGGER_PLATFORM_STROKE = 0xfb923c;
const TRIGGER_PLATFORM_TARGET_CORRECT = 0x22d3ee;
const TRIGGER_PLATFORM_TARGET_WRONG = 0xf59e0b;

const clampZoom = (zoom) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));
const roundCoordinate = (value) => Math.round(Number(value) || 0);
const crispLineCoordinate = (value) => roundCoordinate(value) + 0.5;
const isRectEntry = (entry) => entry?.definition?.shape === 'rect';
const destroyAll = (items = []) => items.filter(Boolean).forEach((item) => item.destroy?.());
const rectFromBounds = (left, top, width, height) => new Phaser.Geom.Rectangle(left, top, width, height);

const combineBounds = (objects = []) => {
  const bounds = objects.filter(Boolean).filter((item) => item.visible !== false && item.getBounds).map((item) => item.getBounds());
  if (!bounds.length) {
    return rectFromBounds(0, 0, 0, 0);
  }
  return bounds.slice(1).reduce((combined, current) => Phaser.Geom.Rectangle.Union(combined, current), bounds[0]);
};

const isPanGesture = (pointer, keySpace) => Boolean(keySpace?.isDown) || pointer.middleButtonDown() || pointer.rightButtonDown();
const normalizeIdList = (value) => {
  const list = Array.isArray(value) ? value : [];
  return list
    .filter((entry) => typeof entry === 'string' && entry.trim())
    .map((entry) => entry.trim());
};
const areIdListsEqual = (left, right) => {
  if (left === right) {
    return true;
  }

  const leftIds = normalizeIdList(left);
  const rightIds = normalizeIdList(right);
  if (leftIds.length !== rightIds.length) {
    return false;
  }

  for (let index = 0; index < leftIds.length; index += 1) {
    if (leftIds[index] !== rightIds[index]) {
      return false;
    }
  }

  return true;
};
const buildMarqueeRect = (origin, current) => {
  const left = Math.min(Number(origin?.x) || 0, Number(current?.x) || 0);
  const top = Math.min(Number(origin?.y) || 0, Number(current?.y) || 0);
  const right = Math.max(Number(origin?.x) || 0, Number(current?.x) || 0);
  const bottom = Math.max(Number(origin?.y) || 0, Number(current?.y) || 0);

  return rectFromBounds(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
};

const normalizeCharacterRenderLayer = (value, fallback = 'back') => {
  const normalized = typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';

  if (normalized === 'front') {
    return 'front';
  }

  if (normalized === 'back') {
    return 'back';
  }

  return fallback === 'front' ? 'front' : 'back';
};

const normalizeProjectileEnemyType = (value) => {
  if (typeof value !== 'string') {
    return 'elemental';
  }

  const normalized = value.trim().toLowerCase();
  if (['elemental', 'hunter', 'boss', 'villain1', 'spiritboss'].includes(normalized)) {
    return normalized;
  }

  if (normalized === 'spirit-boss' || normalized === 'boss6') {
    return 'spiritboss';
  }

  return 'elemental';
};

const normalizeGhostEnemyType = (value) => {
  if (typeof value !== 'string') {
    return 'ghost';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'slimegreen' || normalized === 'slime-green') {
    return 'slimegreen';
  }

  if (normalized === 'slimeorange' || normalized === 'slime-orange' || normalized === 'slimepurple' || normalized === 'slime-purple') {
    return 'slimeorange';
  }

  return 'ghost';
};

const buildEditorFrameKeys = (manifestEntry) => {
  const textureKey = typeof manifestEntry?.key === 'string' ? manifestEntry.key.trim() : '';
  if (!textureKey) {
    return [];
  }

  const frameCount = Math.max(1, Number(manifestEntry?.frameCount || 1));
  if (frameCount <= 1) {
    return [textureKey];
  }

  return Array.from({ length: frameCount }, (_, index) => `${textureKey}-frame-${String(index).padStart(2, '0')}`);
};

const resolveEditorGhostManifest = (manifest, enemyType) => {
  if (enemyType === 'slimegreen') {
    return manifest.slimeGreen || manifest.ghost;
  }

  if (enemyType === 'slimeorange') {
    return manifest.slimeOrange || manifest.slimePurple || manifest.ghost;
  }

  return manifest.ghost;
};

const resolveEditorGhostAnimation = (manifest, enemyType) => {
  if (enemyType === 'slimegreen') {
    return {
      animationKey: 'game-one-slime-green-move',
      frameKeys: buildEditorFrameKeys(manifest.slimeGreen),
    };
  }

  if (enemyType === 'slimeorange') {
    return {
      animationKey: 'game-one-slime-orange-move',
      frameKeys: buildEditorFrameKeys(manifest.slimeOrange || manifest.slimePurple),
    };
  }

  return {
    animationKey: 'game-one-ghost-float',
    frameKeys: [],
  };
};

const resolveEditorProjectileEnemyManifest = (manifest, enemyType) => {
  if (enemyType === 'villain1') {
    return manifest.villain1Enemy || manifest.projectileCaster;
  }

  if (enemyType === 'spiritboss') {
    return manifest.spiritBossEnemy || manifest.bossEnemy || manifest.projectileCaster;
  }

  if (enemyType === 'hunter') {
    return manifest.hunterEnemy || manifest.projectileCaster;
  }

  if (enemyType === 'boss') {
    return manifest.bossEnemy || manifest.projectileCaster;
  }

  return manifest.projectileCaster;
};

const resolveEditorProjectileEnemyAnimations = (enemyType) => {
  if (enemyType === 'villain1') {
    return {
      animationKey: 'game-one-villain1-hover',
      warningAnimationKey: null,
      baseTint: null,
      warningTint: 0xfacc15,
    };
  }

  if (enemyType === 'spiritboss') {
    return {
      animationKey: 'game-one-spirit-boss-run',
      warningAnimationKey: 'game-one-spirit-boss-attack',
      baseTint: 0x67e8f9,
      warningTint: 0x22d3ee,
    };
  }

  return {
    animationKey: undefined,
    warningAnimationKey: null,
    baseTint: undefined,
    warningTint: undefined,
  };
};

const resolveEditorPortalManifest = (manifest, variant = '') => {
  return manifest.portal3 || manifest.portal;
};

const resolveEditorPortalAnimationKey = (variant = '') => {
  return 'game-one-portal3-spin';
};

export default class EditorScene extends Phaser.Scene {
  constructor() {
    super('GameOneEditorScene');
  }

  create() {
    this.input.mouse.disableContextMenu();
    this.input.setTopOnly(true);
    this.callbacks = {};
    this.editorState = null;
    this.manifest = null;
    this.worldLayout = null;
    this.objectRecords = new Map();
    this.mapTileRecords = new Map();
    this.sceneObjects = [];
    this.handleObjects = [];
    this.dragState = null;
    this.pendingPayload = null;
    this.mapTileLastActionKey = '';
    this.mapTileLastMoveKey = '';
    this.triggerPlatformLastActionKey = '';
    this.triggerPlatformPointerPoint = null;
    this.pendingTileTextureLoads = new Set();
    this.gridGraphics = this.add.graphics().setDepth(20);
    this.selectionGraphics = this.add.graphics().setDepth(28);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.handleWindowBlur = () => this.cancelDragState();

    this.input.on('wheel', this.handleWheel, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
    this.input.on('pointercancel', this.handlePointerUp, this);
    this.game.events.on('blur', this.handleWindowBlur);
    this.game.events.on('hidden', this.handleWindowBlur);
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', this.handleWindowBlur);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('wheel', this.handleWheel, this);
      this.input.off('pointermove', this.handlePointerMove, this);
      this.input.off('pointerup', this.handlePointerUp, this);
      this.input.off('pointerupoutside', this.handlePointerUp, this);
      this.input.off('pointercancel', this.handlePointerUp, this);
      this.game.events.off('blur', this.handleWindowBlur);
      this.game.events.off('hidden', this.handleWindowBlur);
      if (typeof window !== 'undefined') {
        window.removeEventListener('blur', this.handleWindowBlur);
      }
      destroyAll(this.sceneObjects);
      destroyAll(this.handleObjects);
    });

    this.applyEditorState(this.game.__ITECHS_EDITOR__, { resetCamera: true });
  }

  cancelDragState() {
    this.dragState = null;
    this.mapTileLastMoveKey = '';
    this.triggerPlatformLastActionKey = '';
    if (this.pendingPayload) {
      const nextPayload = this.pendingPayload;
      this.pendingPayload = null;
      this.applyEditorState(nextPayload);
    }
  }

  applyEditorState(payload = this.game.__ITECHS_EDITOR__, { resetCamera = false } = {}) {
    if (!payload) {
      return;
    }
    if (this.dragState) {
      this.pendingPayload = payload;
      return;
    }

    this.callbacks = payload.callbacks || this.callbacks || {};
    this.manifest = payload.runtimeAssets?.manifest || this.manifest;
    this.editorState = {
      levelData: payload.levelData,
      selectedCellId: payload.selectedCellId,
      selectedObjectIds: payload.selectedObjectIds || [],
      settings: payload.settings || {},
    };
    if (!this.isTriggerPlatformMovePickTool()) {
      this.triggerPlatformPointerPoint = null;
    }
    if (!this.editorState.levelData || !this.manifest) {
      return;
    }

    this.worldLayout = buildWorldGridLayout(this.editorState.levelData);
    const { left, top, width, height } = this.worldLayout.bounds;
    this.physics.world.setBounds(left, top, width, height);
    this.cameras.main.setBounds(left, top, width, height);

    if (resetCamera) {
      this.worldLayout.cells.length > 1 ? this.fitToWorld() : this.fitToCell();
    }

    this.renderWorld();
    this.emitCameraChange();
  }

  getSelectedCellRecord() {
    return this.worldLayout?.byId?.get(this.editorState?.selectedCellId) || this.worldLayout?.cells?.[0] || null;
  }

  isCameraNavigationEnabled() {
    return this.editorState?.settings?.allowCameraNavigation !== false;
  }

  isMapTileMode() {
    return this.editorState?.settings?.editorMode === 'mapTiles';
  }

  isInteractionLocked() {
    return this.isMapTileMode() && Boolean(this.editorState?.settings?.interactionLock);
  }

  getMapTileToolMode() {
    return this.editorState?.settings?.mapTileToolMode || 'select';
  }

  getSelectedMapTileIds() {
    const selected = this.editorState?.settings?.selectedMapTileIds;
    if (Array.isArray(selected)) {
      return normalizeIdList(selected);
    }

    const singleId = typeof this.editorState?.settings?.selectedMapTileId === 'string'
      ? this.editorState.settings.selectedMapTileId.trim()
      : '';
    return singleId ? [singleId] : [];
  }

  setMapTileSelection(nextSelection) {
    const normalized = normalizeIdList(nextSelection);
    this.callbacks.onMapTileSelect?.(normalized);
  }

  startObjectSelectionMarquee(pointer, cellId) {
    this.callbacks.onCellSelect?.(cellId);
    this.dragState = {
      mode: 'marquee-components',
      origin: { x: pointer.worldX, y: pointer.worldY },
      current: { x: pointer.worldX, y: pointer.worldY },
      started: false,
      additive: Boolean(pointer.event?.shiftKey),
      initialSelection: [...(this.editorState?.selectedObjectIds || [])],
    };
  }

  startMapTileSelectionMarquee(pointer) {
    this.dragState = {
      mode: 'marquee-map-tiles',
      origin: { x: pointer.worldX, y: pointer.worldY },
      current: { x: pointer.worldX, y: pointer.worldY },
      started: false,
      additive: Boolean(pointer.event?.shiftKey),
      initialSelection: [...this.getSelectedMapTileIds()],
    };
  }

  isComponentResizeHandlesEnabled() {
    return Boolean(this.editorState?.settings?.componentResizeHandlesEnabled);
  }

  isMapTileResizeHandlesEnabled() {
    return Boolean(this.editorState?.settings?.mapTileResizeHandlesEnabled);
  }

  getMapTileSnapSize() {
    const rawValue = Number(this.editorState?.settings?.mapTileSnap);
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return 0;
    }

    return clampNumber(Math.round(rawValue), 8, 320);
  }

  toSnappedTilePoint(rawPoint, snapEnabled = true) {
    const snapSize = snapEnabled ? this.getMapTileSnapSize() : 0;
    if (!snapSize) {
      return {
        x: clampNumber(Math.round(rawPoint.x), 0, this.worldLayout.viewport.width),
        y: clampNumber(Math.round(rawPoint.y), 0, this.worldLayout.viewport.height),
      };
    }

    return {
      x: clampNumber(Math.round((Math.floor(rawPoint.x / snapSize) * snapSize) + (snapSize * 0.5)), 0, this.worldLayout.viewport.width),
      y: clampNumber(Math.round((Math.floor(rawPoint.y / snapSize) * snapSize) + (snapSize * 0.5)), 0, this.worldLayout.viewport.height),
    };
  }

  getTileBrushConfig() {
    return this.editorState?.settings?.mapTileBrush || null;
  }

  requestMapTileAction(point, erase = false) {
    if (!point || !this.callbacks?.onMapTileAction) {
      return;
    }

    const snappedPoint = this.toSnappedTilePoint(point);
    const actionKey = `${snappedPoint.x}:${snappedPoint.y}:${erase ? 'erase' : 'paint'}`;
    if (actionKey === this.mapTileLastActionKey) {
      return;
    }

    this.mapTileLastActionKey = actionKey;
    this.callbacks.onMapTileAction({ point: snappedPoint, erase });
  }

  getTriggerPlatformToolMode() {
    return this.editorState?.settings?.triggerPlatformToolMode || '';
  }

  isTriggerPlatformMovePickTool() {
    return ['set-correct-move', 'set-wrong-move'].includes(this.getTriggerPlatformToolMode());
  }

  hasActiveTriggerPlatformTool() {
    return !this.isMapTileMode()
      && Boolean(this.editorState?.settings?.triggerPlatformComponentId)
      && Boolean(this.getTriggerPlatformToolMode())
      && typeof this.callbacks?.onTriggerPlatformAction === 'function';
  }

  requestTriggerPlatformAction(point) {
    if (!point || !this.hasActiveTriggerPlatformTool()) {
      return;
    }

    if (this.isTriggerPlatformMovePickTool()) {
      this.triggerPlatformPointerPoint = { x: Number(point.x || 0), y: Number(point.y || 0) };
      this.renderOverlay();
    }

    const gridSize = Math.max(1, Math.round(Number(this.editorState?.settings?.gridSize || 48)));
    const snappedX = Math.floor(Number(point.x || 0) / gridSize);
    const snappedY = Math.floor(Number(point.y || 0) / gridSize);
    const toolMode = this.getTriggerPlatformToolMode();
    const actionKey = `${toolMode}:${snappedX}:${snappedY}`;
    if (actionKey === this.triggerPlatformLastActionKey) {
      return;
    }

    this.triggerPlatformLastActionKey = actionKey;
    this.callbacks.onTriggerPlatformAction({ point });
  }

  getSelectedTriggerPlatformRecord() {
    const selectedIds = this.editorState?.selectedObjectIds || [];
    const selectedId = selectedIds[0];
    const record = selectedId ? this.objectRecords.get(selectedId) : null;
    return record?.entry?.type === 'triggerPlatforms' ? record : null;
  }

  resolveTriggerPlatformTargetPoint(target, record = null) {
    if (!target || typeof target !== 'object') {
      return null;
    }

    const targetX = Number(target.x);
    const targetY = Number(target.y);
    if (Number.isFinite(targetX) && Number.isFinite(targetY)) {
      return { x: targetX, y: targetY };
    }

    if (Number.isFinite(Number(target.col)) && Number.isFinite(Number(target.row))) {
      const gridSize = Math.max(1, Math.round(Number(record?.entry?.object?.cellSize || this.editorState?.settings?.gridSize || 48)));
      return triggerPlatformCellToWorldPoint(target, { gridSize });
    }

    return null;
  }

  drawTriggerPlatformTargetGuide(record, target, color, { live = false } = {}) {
    const targetPoint = this.resolveTriggerPlatformTargetPoint(target, record);
    if (!record || !targetPoint) {
      return;
    }

    const bounds = record.getBodyBounds?.() || record.getVisualBounds?.();
    const startX = Number(bounds?.centerX ?? record.root?.x ?? 0);
    const startY = Number(bounds?.centerY ?? record.root?.y ?? 0);
    const endX = Number(targetPoint.x || 0);
    const endY = Number(targetPoint.y || 0);
    const alpha = live ? 0.86 : 0.72;
    const radius = live ? 7 : 8;

    this.selectionGraphics.lineStyle(live ? 3 : 2, color, alpha);
    this.selectionGraphics.lineBetween(startX, startY, endX, endY);
    this.selectionGraphics.strokeCircle(endX, endY, radius);
    this.selectionGraphics.fillStyle(color, live ? 0.26 : 0.18);
    this.selectionGraphics.fillCircle(endX, endY, radius - 2);

    const angle = Math.atan2(endY - startY, endX - startX);
    if (Number.isFinite(angle) && Math.hypot(endX - startX, endY - startY) > 4) {
      const headLength = live ? 14 : 12;
      const wing = headLength * 0.52;
      const baseX = endX - Math.cos(angle) * headLength;
      const baseY = endY - Math.sin(angle) * headLength;
      const leftX = baseX + Math.cos(angle + (Math.PI / 2)) * wing;
      const leftY = baseY + Math.sin(angle + (Math.PI / 2)) * wing;
      const rightX = baseX + Math.cos(angle - (Math.PI / 2)) * wing;
      const rightY = baseY + Math.sin(angle - (Math.PI / 2)) * wing;

      this.selectionGraphics.fillStyle(color, alpha);
      this.selectionGraphics.fillTriangle(endX, endY, leftX, leftY, rightX, rightY);
    }
  }

  drawSelectedTriggerPlatformMoveGuides(record) {
    if (!record?.entry?.object) {
      return;
    }

    this.drawTriggerPlatformTargetGuide(
      record,
      record.entry.object.correctMoveTo,
      TRIGGER_PLATFORM_TARGET_CORRECT,
    );
    this.drawTriggerPlatformTargetGuide(
      record,
      record.entry.object.wrongMoveTo,
      TRIGGER_PLATFORM_TARGET_WRONG,
    );
  }

  queueDynamicTileTexture(textureKey, imageUrl) {
    if (!textureKey || !imageUrl || this.textures.exists(textureKey) || this.pendingTileTextureLoads.has(textureKey)) {
      return;
    }

    this.pendingTileTextureLoads.add(textureKey);
    this.load.image(textureKey, imageUrl);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.pendingTileTextureLoads.delete(textureKey);
      this.applyEditorState(this.game.__ITECHS_EDITOR__);
    });

    if (!this.load.isLoading()) {
      this.load.start();
    }
  }

  clampCameraToWorld() {
    const camera = this.cameras.main;
    const bounds = this.worldLayout?.bounds;
    if (!bounds) {
      return;
    }
    const maxScrollX = bounds.right - (camera.width / camera.zoom);
    const maxScrollY = bounds.bottom - (camera.height / camera.zoom);
    camera.scrollX = Phaser.Math.Clamp(camera.scrollX, bounds.left, maxScrollX);
    camera.scrollY = Phaser.Math.Clamp(camera.scrollY, bounds.top, maxScrollY);
  }

  alignCameraToPixels() {
    if (this.isCameraNavigationEnabled()) {
      return;
    }

    const camera = this.cameras.main;
    camera.scrollX = roundCoordinate(camera.scrollX);
    camera.scrollY = roundCoordinate(camera.scrollY);
  }

  fitToWorld() {
    const camera = this.cameras.main;
    const bounds = this.worldLayout?.bounds;
    if (!bounds) {
      return;
    }
    const paddingFactor = this.isCameraNavigationEnabled() ? 0.94 : 1;
    camera.setZoom(clampZoom(Math.min((camera.width * paddingFactor) / bounds.width, (camera.height * paddingFactor) / bounds.height)));
    camera.centerOn(bounds.left + (bounds.width / 2), bounds.top + (bounds.height / 2));
    this.clampCameraToWorld();
    this.alignCameraToPixels();
    this.renderOverlay();
    this.emitCameraChange();
  }

  fitToCell() {
    const camera = this.cameras.main;
    const bounds = this.getSelectedCellRecord()?.bounds;
    if (!bounds) {
      this.fitToWorld();
      return;
    }
    const paddingFactor = this.isCameraNavigationEnabled() ? 0.96 : 1;
    camera.setZoom(clampZoom(Math.min((camera.width * paddingFactor) / bounds.width, (camera.height * paddingFactor) / bounds.height)));
    camera.centerOn(bounds.centerX, bounds.centerY);
    this.clampCameraToWorld();
    this.alignCameraToPixels();
    this.renderOverlay();
    this.emitCameraChange();
  }

  fitToSelection() {
    const selected = (this.editorState?.selectedObjectIds || []).map((id) => this.objectRecords.get(id)).filter(Boolean);
    if (!selected.length) {
      this.fitToCell();
      return;
    }
    const camera = this.cameras.main;
    const bounds = selected.map((record) => record.getVisualBounds()).reduce((combined, current) => Phaser.Geom.Rectangle.Union(combined, current));
    const padding = this.isCameraNavigationEnabled() ? 120 : 0;
    camera.setZoom(clampZoom(Math.min(camera.width / Math.max(120, bounds.width + padding), camera.height / Math.max(120, bounds.height + padding))));
    camera.centerOn(bounds.centerX, bounds.centerY);
    this.clampCameraToWorld();
    this.alignCameraToPixels();
    this.renderOverlay();
    this.emitCameraChange();
  }

  zoomIn() {
    this.setZoom(this.cameras.main.zoom + 0.15);
  }

  zoomOut() {
    this.setZoom(this.cameras.main.zoom - 0.15);
  }

  setZoom(nextZoom, pivotX = this.scale.width / 2, pivotY = this.scale.height / 2) {
    const camera = this.cameras.main;
    const before = camera.getWorldPoint(pivotX, pivotY);
    camera.setZoom(clampZoom(nextZoom));
    const after = camera.getWorldPoint(pivotX, pivotY);
    camera.scrollX += before.x - after.x;
    camera.scrollY += before.y - after.y;
    this.clampCameraToWorld();
    this.renderOverlay();
    this.emitCameraChange();
  }

  emitCameraChange() {
    const camera = this.cameras.main;
    const bounds = this.worldLayout?.bounds;
    const cameraNavigationEnabled = this.isCameraNavigationEnabled();
    const canPan = cameraNavigationEnabled && bounds
      ? ((camera.width / camera.zoom) < bounds.width || (camera.height / camera.zoom) < bounds.height)
      : false;
    this.sceneObjects
      .filter((item) => item?.__isAddCellAffordance)
      .forEach((item) => item.setVisible(cameraNavigationEnabled && camera.zoom <= ADD_CELL_ZOOM_THRESHOLD));
    this.callbacks.onCameraChange?.({ zoom: camera.zoom, canPan, scrollX: camera.scrollX, scrollY: camera.scrollY });
  }

  startPanDrag(pointer) {
    if (!this.isCameraNavigationEnabled()) {
      return;
    }

    if (!(pointer.leftButtonDown() || pointer.middleButtonDown() || pointer.rightButtonDown())) {
      return;
    }
    this.dragState = { mode: 'pan', origin: { x: pointer.x, y: pointer.y }, scroll: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY } };
  }

  toWorldPoint(clientX, clientY) {
    const bounds = this.game.canvas.getBoundingClientRect();
    const x = ((clientX - bounds.left) / bounds.width) * this.scale.width;
    const y = ((clientY - bounds.top) / bounds.height) * this.scale.height;
    return this.cameras.main.getWorldPoint(x, y);
  }

  renderWorld() {
    destroyAll(this.sceneObjects);
    destroyAll(this.handleObjects);
    this.sceneObjects = [];
    this.handleObjects = [];
    this.objectRecords.clear();
    this.mapTileRecords.clear();
    this.gridGraphics.clear();
    this.selectionGraphics.clear();

    this.worldLayout.cells.forEach((record) => this.createCell(record));
    this.createBackgroundTileRecords();
    collectWorldObjects(this.editorState.levelData).forEach((entry) => {
      const record = this.createRecord(entry);
      if (record) {
        this.objectRecords.set(entry.editorId, record);
      }
    });

    getAdjacentEmptyCells(this.editorState.levelData).forEach((candidate) => this.createAddCellAffordance(candidate));
    this.renderOverlay();
  }

  createCell(cellRecord) {
    const { bounds, cell } = cellRecord;
    const backgroundKey = this.manifest.backgrounds?.[cell.backgroundKey]?.key;
    if (backgroundKey && this.textures.exists(backgroundKey)) {
      this.sceneObjects.push(this.add.image(bounds.centerX, bounds.centerY, backgroundKey).setDisplaySize(bounds.width, bounds.height).setDepth(-15));
    }
    this.sceneObjects.push(this.add.rectangle(bounds.centerX, bounds.centerY, bounds.width, bounds.height, 0x0f172a, backgroundKey ? 0.08 : 0.3).setStrokeStyle(3, 0xffffff, 0.18).setDepth(-14));
    const zone = this.add.zone(bounds.centerX, bounds.centerY, bounds.width, bounds.height).setInteractive().setDepth(-13);
    zone.on('pointerdown', (pointer) => this.handleCellPointerDown(pointer, cellRecord));
    this.sceneObjects.push(zone);
    this.sceneObjects.push(this.add.text(bounds.left + 16, bounds.top + 16, `${cell.id}\n${cell.col}, ${cell.row}`, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#f8fafc',
      lineSpacing: 3,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      padding: { left: 6, right: 6, top: 4, bottom: 4 },
    }).setDepth(-12.5));
  }

  createAddCellAffordance(candidate) {
    const bounds = getCellWorldBounds(candidate, this.worldLayout.viewport);
    const panel = this.add.rectangle(bounds.centerX, bounds.centerY, bounds.width - 24, bounds.height - 24, 0x7dd3fc, 0.06).setStrokeStyle(4, 0x7dd3fc, 0.76).setDepth(-12);
    const plus = this.add.text(bounds.centerX, bounds.centerY - 12, '+', { fontFamily: 'monospace', fontSize: '56px', color: '#7dd3fc' }).setOrigin(0.5).setDepth(-11.9);
    const label = this.add.text(bounds.centerX, bounds.centerY + 28, 'Add Cell', { fontFamily: 'monospace', fontSize: '20px', color: '#e0f2fe' }).setOrigin(0.5).setDepth(-11.9);
    const zone = this.add.zone(bounds.centerX, bounds.centerY, bounds.width, bounds.height).setInteractive({ useHandCursor: true }).setDepth(-11.8);
    zone.on('pointerdown', (pointer) => {
      if (isPanGesture(pointer, this.keySpace)) {
        this.startPanDrag(pointer);
        return;
      }
      this.callbacks.onAddCell?.(candidate);
    });
    [panel, plus, label, zone].forEach((item) => {
      item.__isAddCellAffordance = true;
      this.sceneObjects.push(item);
    });
  }

  createBackgroundTileRecords() {
    const backgroundTiles = Array.isArray(this.editorState?.levelData?.worldObjects?.backgroundTiles)
      ? [...this.editorState.levelData.worldObjects.backgroundTiles]
      : [];

    backgroundTiles
      .map((tileConfig, index) => ({
        tileConfig,
        index,
        zIndex: Number.isFinite(Number(tileConfig?.zIndex)) ? Number(tileConfig.zIndex) : index,
        renderLayer: normalizeCharacterRenderLayer(tileConfig?.renderLayer),
      }))
      .sort((left, right) => {
        if (left.renderLayer !== right.renderLayer) {
          return left.renderLayer === 'front' ? 1 : -1;
        }

        if (left.zIndex !== right.zIndex) {
          return left.zIndex - right.zIndex;
        }

        return left.index - right.index;
      })
      .forEach(({ tileConfig, index, renderLayer }) => {
        const textureKey = typeof tileConfig?.textureKey === 'string' ? tileConfig.textureKey.trim() : '';
        if (!textureKey) {
          return;
        }

        if (!this.textures.exists(textureKey)) {
          const imageUrl = typeof tileConfig?.imageUrl === 'string' ? tileConfig.imageUrl.trim() : '';
          this.queueDynamicTileTexture(textureKey, imageUrl);
          return;
        }

        const runtimeTileId = typeof tileConfig?.id === 'string' && tileConfig.id.trim()
          ? tileConfig.id.trim()
          : `bg-tile-${index + 1}`;
        const editorTileId = typeof tileConfig?._editorId === 'string' && tileConfig._editorId.trim()
          ? tileConfig._editorId.trim()
          : '';
        const tileId = editorTileId || runtimeTileId;
        const depthBase = renderLayer === 'front' ? MAP_TILE_FRONT_DEPTH_BASE : MAP_TILE_BACK_DEPTH_BASE;
        const tileDepth = depthBase + (index * 0.0001);

        const tileImage = this.add
          .image(Number(tileConfig?.x) || 640, Number(tileConfig?.y) || 360, textureKey)
          .setDepth(tileDepth);

        const hitZone = this.add
          .zone(Number(tileConfig?.x) || 640, Number(tileConfig?.y) || 360, MAP_TILE_DEFAULT_SIZE, MAP_TILE_DEFAULT_SIZE)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(18);

        if (!this.isMapTileMode()) {
          hitZone.disableInteractive();
        }

        const record = {
          id: tileId,
          tile: { ...tileConfig, id: tileId, renderLayer },
          image: tileImage,
          hitZone,
          getVisualBounds: () => tileImage.getBounds(),
          setFromTile: (nextTile) => {
            const nextRenderLayer = normalizeCharacterRenderLayer(nextTile?.renderLayer);
            const nextDepthBase = nextRenderLayer === 'front' ? MAP_TILE_FRONT_DEPTH_BASE : MAP_TILE_BACK_DEPTH_BASE;
            tileImage.setDepth(nextDepthBase + (index * 0.0001));

            record.tile = { ...nextTile, id: tileId, renderLayer: nextRenderLayer };

            const tileX = Number(nextTile?.x) || 640;
            const tileY = Number(nextTile?.y) || 360;
            const size = clampNumber(Math.round(Number(nextTile?.size) || MAP_TILE_DEFAULT_SIZE), MAP_TILE_MIN_SIZE, MAP_TILE_MAX_SIZE);
            const rotationDeg = ((Math.round(Number(nextTile?.rotationDeg) || 0) % 360) + 360) % 360;
            const flipX = Boolean(nextTile?.flipX);
            const flipY = Boolean(nextTile?.flipY);
            const blendMode = String(nextTile?.blendMode || '').trim().toLowerCase();
            const sourceWidth = Number(tileImage.width) || 0;
            const sourceHeight = Number(tileImage.height) || 0;

            const targetWidth = size;
            const targetHeight = (sourceWidth > 0 && sourceHeight > 0)
              ? Math.max(1, Math.round((sourceHeight / sourceWidth) * targetWidth))
              : size;

            tileImage.setPosition(tileX, tileY);
            tileImage.setAngle(rotationDeg);
            tileImage.setFlip(flipX, flipY);
            tileImage.setDisplaySize(targetWidth, targetHeight);

            if (blendMode === 'screen') {
              tileImage.setBlendMode(Phaser.BlendModes.SCREEN);
            } else {
              tileImage.setBlendMode(Phaser.BlendModes.NORMAL);
            }

            hitZone.setPosition(tileX, tileY);
            hitZone.setSize(targetWidth, targetHeight);
          },
        };

        record.setFromTile(tileConfig);
        hitZone.on('pointerdown', (pointer, _localX, _localY, event) => this.handleMapTilePointerDown(pointer, record, event));

        this.mapTileRecords.set(tileId, record);
        this.sceneObjects.push(tileImage, hitZone);
      });
  }

  createRecord(entry) {
    let record = null;

    if (entry.definition.shape === 'rect') {
      record = this.createSurfaceRecord(entry);
    } else if (entry.type === 'spawn') {
      record = this.createSpriteRecord(entry, new Player(this, entry.object.x, entry.object.y, this.manifest.player, entry.object), (sprite) => { sprite.body.setAllowGravity(false); sprite.setCollideWorldBounds(false); freezeAnimatedObject(sprite, 0); });
    } else if (entry.type === 'coins') {
      record = this.createSpriteRecord(entry, new Coin(this, entry.object.x, entry.object.y, this.manifest.coin, entry.object), (sprite) => freezeAnimatedObject(sprite, 0));
    } else if (entry.type === 'ghosts') {
      const enemyType = normalizeGhostEnemyType(entry.object?.enemyType);
      const enemyManifest = resolveEditorGhostManifest(this.manifest, enemyType);
      const enemyAnimation = resolveEditorGhostAnimation(this.manifest, enemyType);
      const isSlimeVariant = enemyType !== 'ghost';

      record = this.createSpriteRecord(
        entry,
        isSlimeVariant
          ? new SlimeEnemy(this, entry.object.x, entry.object.y, enemyManifest, {
            ...entry.object,
            enemyType,
            animationKey: enemyAnimation.animationKey,
            frameKeys: enemyAnimation.frameKeys,
            gravityY: 0,
          })
          : new GhostMinion(this, entry.object.x, entry.object.y, enemyManifest, {
            ...entry.object,
            enemyType,
          }),
        (sprite) => {
          if (isSlimeVariant) {
            sprite.body?.setAllowGravity?.(false);
            sprite.setVelocity?.(0, 0);
            if (enemyAnimation.frameKeys.length) {
              sprite.setTexture(enemyAnimation.frameKeys[0]);
            }
            sprite.clearTint();
            return;
          }

          freezeAnimatedObject(sprite, 0);
        },
      );
    } else if (entry.type === 'projectileEnemies') {
      const enemyType = normalizeProjectileEnemyType(entry.object?.enemyType);
      const enemyManifest = resolveEditorProjectileEnemyManifest(this.manifest, enemyType);
      const enemyAnimations = resolveEditorProjectileEnemyAnimations(enemyType);
      record = this.createSpriteRecord(
        entry,
        new ProjectileCaster(this, entry.object.x, entry.object.y, enemyManifest, {
          ...entry.object,
          enemyType,
          animationKey: enemyAnimations.animationKey,
          warningAnimationKey: enemyAnimations.warningAnimationKey,
          baseTint: enemyAnimations.baseTint,
          warningTint: enemyAnimations.warningTint,
        }),
        (sprite) => { freezeAnimatedObject(sprite, 0); sprite.clearTint(); },
      );
    } else if (entry.type === 'portal') {
      record = this.createPortalRecord(entry);
    } else if (entry.type === 'villain') {
      record = this.createVillainRecord(entry);
    } else if (entry.type === 'triggerPlatforms') {
      record = this.createTriggerPlatformRecord(entry);
    }

    if (record) {
      this.applyRecordDepth(record, entry.type, entry.object?.renderLayer);
    }

    return record;
  }

  applyRecordDepth(record, entryType, renderLayer) {
    if (!record?.root?.setDepth) {
      return;
    }

    const isSpawn = entryType === 'spawn';
    const layer = normalizeCharacterRenderLayer(renderLayer);
    const baseDepth = isSpawn
      ? SPAWN_REFERENCE_DEPTH
      : (layer === 'front' ? COMPONENT_FRONT_DEPTH : COMPONENT_BACK_DEPTH);

    record.root.setDepth(baseDepth);

    if (Array.isArray(record.extras)) {
      record.extras.forEach((extra, index) => {
        extra?.setDepth?.(baseDepth + (index + 1) * 0.0001);
      });
    }
  }

  createSurfaceRecord(entry) {
    const geometry = getGameOneSurfaceGeometry(this.manifest, entry.object);
    const isInvisibleSurface = Boolean(entry.object?.invisible);
    const { visualRect, bodyRect } = geometry;
    const invisibleGuideFill = 0x38bdf8;
    const invisibleGuideAlpha = 0.22;
    const invisibleGuideStroke = 0x0369a1;

    const visual = isInvisibleSurface
      ? this.add.rectangle(visualRect.centerX, visualRect.centerY, visualRect.width, visualRect.height, invisibleGuideFill, invisibleGuideAlpha)
        .setOrigin(0.5)
        .setStrokeStyle(2, invisibleGuideStroke, 0.95)
      : this.add.tileSprite(visualRect.centerX, visualRect.centerY, visualRect.width, visualRect.height, geometry.textureMeta.key).setOrigin(0.5);
    const collisionGuide = null;
    const zone = this.add.zone(visualRect.centerX, visualRect.centerY, visualRect.width, visualRect.height).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const record = {
      entry: { ...entry, object: { ...entry.object } },
      root: visual,
      zone,
      extras: collisionGuide ? [collisionGuide] : [],
      geometry,
      metrics: getGameOneSurfaceMetricsFromGeometry(geometry),
      getVisualBounds: () => combineBounds([visual, ...(record.extras || [])]),
      getBodyBounds: () => rectFromBounds(record.geometry.bodyRect.left, record.geometry.bodyRect.top, record.geometry.bodyRect.width, record.geometry.bodyRect.height),
      setFromObject: (nextObject) => {
        record.entry.object = { ...nextObject };
        record.geometry = getGameOneSurfaceGeometry(this.manifest, nextObject);
        record.metrics = getGameOneSurfaceMetricsFromGeometry(record.geometry);
        const nextVisualRect = record.geometry.visualRect;
        const nextBodyRect = record.geometry.bodyRect;

        visual.setPosition(nextVisualRect.centerX, nextVisualRect.centerY);
        visual.setSize?.(nextVisualRect.width, nextVisualRect.height);
        visual.width = nextVisualRect.width;
        visual.height = nextVisualRect.height;

        if (!isInvisibleSurface) {
          visual.setTexture(record.geometry.textureMeta.key);
          visual.clearTint();
          visual.setAlpha(entry.type === 'unlockPlatforms' && nextObject.startsHidden ? 0.55 : 1);
          if (entry.type === 'barriers') {
            visual.setTint(0xeab308);
          }
        } else {
          visual.setFillStyle(invisibleGuideFill, invisibleGuideAlpha);
          visual.setStrokeStyle(2, invisibleGuideStroke, 0.95);
        }

        zone.setPosition(nextVisualRect.centerX, nextVisualRect.centerY);
        zone.setSize(nextVisualRect.width, nextVisualRect.height);
      },
    };
    record.setFromObject(entry.object);
    zone.on('pointerdown', (pointer) => this.handleObjectPointerDown(pointer, record));
    this.sceneObjects.push(zone, visual);
    if (collisionGuide) {
      this.sceneObjects.push(collisionGuide);
    }
    return record;
  }

  createTriggerPlatformRecord(entry) {
    const shell = this.add.rectangle(
      Number(entry.object?.x || 0),
      Number(entry.object?.y || 0),
      Math.max(1, Number(entry.object?.width || 1)),
      Math.max(1, Number(entry.object?.height || 1)),
      TRIGGER_PLATFORM_FILL,
      0.08,
    ).setStrokeStyle(2, TRIGGER_PLATFORM_STROKE, 0.92);
    const zone = this.add.zone(shell.x, shell.y, shell.width, shell.height)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const toCellWorldPosition = (cell, cellSize) => {
      const fallbackPoint = triggerPlatformCellToWorldPoint(cell, { gridSize: cellSize });
      const x = Number(cell?.x);
      const y = Number(cell?.y);

      return {
        x: Number.isFinite(x) ? x : fallbackPoint.x,
        y: Number.isFinite(y) ? y : fallbackPoint.y,
      };
    };

    const haveSameGridCells = (leftCells, rightCells) => {
      if (!leftCells.length || leftCells.length !== rightCells.length) {
        return false;
      }

      const leftKeys = leftCells.map((cell) => `${Number(cell?.col || 0)}:${Number(cell?.row || 0)}`).sort();
      const rightKeys = rightCells.map((cell) => `${Number(cell?.col || 0)}:${Number(cell?.row || 0)}`).sort();
      return leftKeys.every((key, index) => key === rightKeys[index]);
    };

    const resolveCellVisualSources = (nextObject, previousObject = null) => {
      const nextCells = Array.isArray(nextObject?.cells) ? nextObject.cells : [];
      const previousCells = Array.isArray(previousObject?.cells) ? previousObject.cells : [];
      const deltaX = Number(nextObject?.x || 0) - Number(previousObject?.x || 0);
      const deltaY = Number(nextObject?.y || 0) - Number(previousObject?.y || 0);
      const cellSize = Math.max(8, Number(nextObject?.cellSize || 48));
      const positionedCells = nextCells.map((cell) => {
        const point = toCellWorldPosition(cell, cellSize);
        return {
          ...cell,
          x: point.x,
          y: point.y,
        };
      });
      const shouldShiftExistingCells = previousCells.length
        && haveSameGridCells(previousCells, nextCells)
        && (deltaX !== 0 || deltaY !== 0);

      if (!shouldShiftExistingCells) {
        return positionedCells;
      }

      const previousPositionedCells = previousCells.map((cell) => {
        const point = toCellWorldPosition(cell, cellSize);
        return {
          ...cell,
          x: point.x,
          y: point.y,
        };
      });
      const cellsAlreadyMoved = positionedCells.some((cell, index) => {
        const previousCell = previousPositionedCells[index];
        return previousCell
          && (Math.abs((Number(cell.x) || 0) - (Number(previousCell.x) || 0)) > 0.5
            || Math.abs((Number(cell.y) || 0) - (Number(previousCell.y) || 0)) > 0.5);
      });

      if (cellsAlreadyMoved) {
        return positionedCells;
      }

      return previousPositionedCells.map((cell) => ({
        ...cell,
        x: Number(cell.x || 0) + deltaX,
        y: Number(cell.y || 0) + deltaY,
      }));
    };

    const buildCellVisuals = (sourceCells, cellSize) => (
      sourceCells.map((cell) => {
        const x = Number(cell?.x || 0);
        const y = Number(cell?.y || 0);
        return this.add.rectangle(x, y, cellSize, cellSize, TRIGGER_PLATFORM_FILL, 0.18)
          .setStrokeStyle(2, TRIGGER_PLATFORM_STROKE, 0.9)
          .setOrigin(0.5);
      })
    );

    const record = {
      entry: { ...entry, object: { ...entry.object } },
      root: shell,
      zone,
      extras: [],
      cellRects: [],
      getVisualBounds: () => combineBounds([shell, ...(record.extras || [])]),
      getBodyBounds: () => rectFromBounds(shell.x - (shell.width / 2), shell.y - (shell.height / 2), shell.width, shell.height),
      getBodyRects: () => [...record.cellRects],
      setFromObject: (nextObject) => {
        const previousObject = record.entry.object;
        const cellSize = Math.max(8, Number(nextObject?.cellSize || 48));
        const visualCells = resolveCellVisualSources(nextObject, previousObject);
        record.entry.object = { ...nextObject, cells: visualCells };
        destroyAll(record.extras);
        record.extras = buildCellVisuals(visualCells, cellSize);
        record.cellRects = record.extras.map((cellVisual) => rectFromBounds(
          cellVisual.x - (cellVisual.width / 2),
          cellVisual.y - (cellVisual.height / 2),
          cellVisual.width,
          cellVisual.height,
        ));

        shell.setPosition(Number(nextObject?.x || 0), Number(nextObject?.y || 0));
        shell.setSize(Math.max(1, Number(nextObject?.width || 1)), Math.max(1, Number(nextObject?.height || 1)));
        shell.width = Math.max(1, Number(nextObject?.width || 1));
        shell.height = Math.max(1, Number(nextObject?.height || 1));
        zone.setPosition(shell.x, shell.y);
        zone.setSize(shell.width, shell.height);
        record.extras.forEach((extra) => this.sceneObjects.push(extra));
      },
    };

    record.setFromObject(entry.object);
    zone.on('pointerdown', (pointer) => this.handleObjectPointerDown(pointer, record));
    this.sceneObjects.push(zone, shell);
    return record;
  }

  createSpriteRecord(entry, sprite, freeze) {
    freeze?.(sprite);
    const zone = this.add.zone(sprite.x, sprite.y, Math.max(sprite.displayWidth, 36), Math.max(sprite.displayHeight, 36)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const record = {
      entry: { ...entry, object: { ...entry.object } },
      root: sprite,
      zone,
      extras: [],
      getVisualBounds: () => combineBounds([sprite, ...record.extras]),
      getBodyBounds: () => sprite.body ? rectFromBounds(sprite.body.x, sprite.body.y, sprite.body.width, sprite.body.height) : null,
      setFromObject: (nextObject) => {
        record.entry.object = { ...nextObject };
        sprite.setPosition(nextObject.x, nextObject.y);
        sprite.body?.updateFromGameObject?.();
        const bounds = combineBounds([sprite, ...record.extras]);
        zone.setPosition(bounds.centerX, bounds.centerY);
        zone.setSize(Math.max(bounds.width, 36), Math.max(bounds.height, 36));
      },
    };
    record.setFromObject(entry.object);
    zone.on('pointerdown', (pointer) => this.handleObjectPointerDown(pointer, record));
    this.sceneObjects.push(zone, sprite);
    return record;
  }

  createPortalRecord(entry) {
    const variant = typeof entry.object?.variant === 'string' ? entry.object.variant.trim().toLowerCase() : '';
    const portalManifest = resolveEditorPortalManifest(this.manifest, variant);
    const animationKey = resolveEditorPortalAnimationKey(variant);
    const portal = new Portal(this, entry.object.x, entry.object.y, portalManifest, {
      ...entry.object,
      animationKey,
    });
    const record = this.createSpriteRecord(entry, portal, () => freezeAnimatedObject(portal, 0));
    record.extras = portal.lockLayers;
    portal.lockLayers.forEach((layer) => this.sceneObjects.push(layer));
    record.setFromObject = (nextObject) => {
      record.entry.object = { ...nextObject };
      const nextVariant = typeof nextObject?.variant === 'string' ? nextObject.variant.trim().toLowerCase() : '';
      portal.setPosition(nextObject.x, nextObject.y);
      portal.applyConfiguredVisual({
        ...nextObject,
        animationKey: resolveEditorPortalAnimationKey(nextVariant),
      });
      portal.setLocked(Boolean(nextObject.locked));
      portal.endsLevel = Boolean(nextObject.endsLevel);
      portal.linkName = typeof nextObject.linkName === 'string' ? nextObject.linkName.trim() : '';
      freezeAnimatedObject(portal, 0);
      portal.lockLayers.forEach((layer, index) => {
        if (index < 2) layer.setPosition(nextObject.x, nextObject.y + 8);
        else if (index < 4) layer.setPosition(nextObject.x + (index === 2 ? -14 : 14), nextObject.y + 8);
        else if (index === 4) layer.setPosition(nextObject.x, nextObject.y - 16);
        else layer.setPosition(nextObject.x, nextObject.y + 32);
      });
      const bounds = combineBounds([portal, ...portal.lockLayers]);
      record.zone.setPosition(bounds.centerX, bounds.centerY);
      record.zone.setSize(Math.max(bounds.width, 42), Math.max(bounds.height, 42));
    };
    record.setFromObject(entry.object);
    return record;
  }

  createVillainRecord(entry) {
    const villain = new VillainTrigger(this, entry.object.x, entry.object.y, this.manifest.villain, entry.object);
    villain.hoverTween?.stop();
    villain.hoverTween = null;
    const extras = [villain.pedestal, villain.pedestalCap, villain.statusBack, villain.statusLabel].filter(Boolean);
    const record = this.createSpriteRecord(entry, villain, () => freezeAnimatedObject(villain, 0));
    record.extras = extras;
    extras.forEach((extra) => this.sceneObjects.push(extra));
    record.setFromObject = (nextObject) => {
      record.entry.object = { ...nextObject };
      villain.setPosition(nextObject.x, nextObject.y);
      villain.applyConfiguredVisual(this.manifest.villain, nextObject);
      const bounds = combineBounds([villain, ...extras]);
      record.zone.setPosition(bounds.centerX, bounds.centerY);
      record.zone.setSize(Math.max(bounds.width, 42), Math.max(bounds.height, 42));
    };
    record.setFromObject(entry.object);
    return record;
  }

  handleMapTilePointerDown(pointer, record, event) {
    if (!this.isMapTileMode()) {
      return;
    }

    if (this.isInteractionLocked()) {
      event?.stopPropagation?.();
      return;
    }

    event?.stopPropagation?.();

    if (isPanGesture(pointer, this.keySpace)) {
      this.startPanDrag(pointer);
      return;
    }

    const toolMode = this.getMapTileToolMode();
    const forceErase = toolMode === 'erase' || pointer.rightButtonDown() || Boolean(pointer.event?.altKey);

    if (forceErase) {
      this.setMapTileSelection([record.id]);
      this.requestMapTileAction({ x: pointer.worldX, y: pointer.worldY }, true);
      return;
    }

    if (toolMode === 'select') {
      const additive = Boolean(pointer.event?.shiftKey);
      const currentSelection = this.getSelectedMapTileIds();
      const nextSelection = additive
        ? (currentSelection.includes(record.id)
          ? currentSelection.filter((id) => id !== record.id)
          : [...currentSelection, record.id])
        : (currentSelection.includes(record.id)
          ? currentSelection
          : [record.id]);

      this.setMapTileSelection(nextSelection);
      const isPrimaryPointer = pointer.leftButtonDown()
        || pointer.button === 0
        || pointer.event?.button === 0;

      if (isPrimaryPointer && !additive) {
        const dragSelection = nextSelection.length
          ? nextSelection
          : [record.id];
        const startPositions = Object.fromEntries(dragSelection.map((tileId) => {
          const tileRecord = this.mapTileRecords.get(tileId);
          return [
            tileId,
            {
              x: Number(tileRecord?.tile?.x) || 0,
              y: Number(tileRecord?.tile?.y) || 0,
            },
          ];
        }));

        this.dragState = {
          mode: 'map-tile-move',
          tileIds: dragSelection,
          origin: { x: pointer.worldX, y: pointer.worldY },
          startPositions,
        };
      }
      return;
    }

    this.setMapTileSelection([]);
    this.requestMapTileAction({ x: pointer.worldX, y: pointer.worldY }, false);
  }

  handleMapTileCanvasPointerDown(pointer) {
    if (this.isInteractionLocked()) {
      return;
    }

    const toolMode = this.getMapTileToolMode();
    const forceErase = toolMode === 'erase' || pointer.rightButtonDown() || Boolean(pointer.event?.altKey);

    if (toolMode === 'select' && !forceErase) {
      const isPrimaryPointer = pointer.leftButtonDown()
        || pointer.button === 0
        || pointer.event?.button === 0;
      if (isPrimaryPointer) {
        this.startMapTileSelectionMarquee(pointer);
      } else {
        this.setMapTileSelection([]);
      }
      return;
    }

    this.setMapTileSelection([]);
    this.requestMapTileAction({ x: pointer.worldX, y: pointer.worldY }, forceErase);
  }

  handleCellPointerDown(pointer, cellRecord) {
    if (this.isInteractionLocked()) {
      return;
    }

    if (isPanGesture(pointer, this.keySpace)) {
      this.startPanDrag(pointer);
      return;
    }

    if (this.isMapTileMode()) {
      this.handleMapTileCanvasPointerDown(pointer);
      return;
    }

    if (this.hasActiveTriggerPlatformTool()) {
      const isPrimaryPointer = pointer.leftButtonDown()
        || pointer.button === 0
        || pointer.event?.button === 0;
      if (isPrimaryPointer) {
        this.requestTriggerPlatformAction({ x: pointer.worldX, y: pointer.worldY });
      }
      return;
    }

    const isPrimaryPointer = pointer.leftButtonDown()
      || pointer.button === 0
      || pointer.event?.button === 0;
    if (isPrimaryPointer) {
      this.startObjectSelectionMarquee(pointer, cellRecord.cell.id);
      return;
    }

    this.callbacks.onCellSelect?.(cellRecord.cell.id);
    this.callbacks.onBackgroundClick?.({ cellId: cellRecord.cell.id, point: { x: pointer.worldX, y: pointer.worldY } });
  }

  handleObjectPointerDown(pointer, record) {
    if (this.isInteractionLocked()) {
      return;
    }

    if (isPanGesture(pointer, this.keySpace)) {
      this.startPanDrag(pointer);
      return;
    }

    if (this.isMapTileMode()) {
      this.handleMapTileCanvasPointerDown(pointer);
      return;
    }

    if (this.hasActiveTriggerPlatformTool()) {
      const isPrimaryPointer = pointer.leftButtonDown()
        || pointer.button === 0
        || pointer.event?.button === 0;
      if (isPrimaryPointer) {
        this.requestTriggerPlatformAction({ x: pointer.worldX, y: pointer.worldY });
      }
      return;
    }

    const additive = Boolean(pointer.event?.shiftKey);
    const currentSelection = this.editorState.selectedObjectIds || [];
    const nextSelection = additive
      ? (currentSelection.includes(record.entry.editorId) ? currentSelection.filter((id) => id !== record.entry.editorId) : [...currentSelection, record.entry.editorId])
      : (currentSelection.includes(record.entry.editorId) ? currentSelection : [record.entry.editorId]);
    this.callbacks.onSelectionChange?.(nextSelection);
    if (additive) {
      return;
    }
    this.dragState = {
      mode: 'move',
      origin: { x: pointer.worldX, y: pointer.worldY },
      records: nextSelection.map((id) => this.objectRecords.get(id)).filter(Boolean),
      startPositions: Object.fromEntries(nextSelection.map((id) => {
        const entry = this.objectRecords.get(id)?.entry?.object || {};
        return [id, { x: Number(entry.x || 0), y: Number(entry.y || 0) }];
      })),
    };
  }

  buildResizeState(axis, pointer) {
    const record = this.objectRecords.get(this.editorState.selectedObjectIds?.[0]);
    if (!record || !isRectEntry(record.entry)) {
      return null;
    }
    return {
      mode: axis === 'height' ? 'resize-height' : 'resize-width',
      origin: { x: pointer.worldX, y: pointer.worldY },
      record,
      startSize: { width: Number(record.entry.object.width || 120), height: Number(record.entry.object.height || record.metrics?.visualHeight || 60) },
      startPosition: { x: Number(record.entry.object.x || 0), y: Number(record.entry.object.y || 0) },
    };
  }

  buildMapTileResizeState(pointer, record) {
    if (!record) {
      return null;
    }

    const currentSize = clampNumber(
      Math.round(Number(record.tile?.size) || MAP_TILE_DEFAULT_SIZE),
      MAP_TILE_MIN_SIZE,
      MAP_TILE_MAX_SIZE,
    );

    return {
      mode: 'map-tile-resize',
      tileId: record.id,
      origin: { x: pointer.worldX, y: pointer.worldY },
      startSize: currentSize,
      lastSize: currentSize,
    };
  }

  handlePointerMove(pointer) {
    if (this.isInteractionLocked()) {
      this.cancelDragState();
      return;
    }

    if (!this.dragState && pointer.isDown && this.keySpace.isDown) {
      this.startPanDrag(pointer);
      return;
    }

    if (!this.dragState && this.isMapTileMode()) {
      const toolMode = this.getMapTileToolMode();
      const dragPainting = pointer.leftButtonDown() && (toolMode === 'paint' || toolMode === 'erase');
      if (dragPainting) {
        this.requestMapTileAction({ x: pointer.worldX, y: pointer.worldY }, toolMode === 'erase');
      }
    }

    if (!this.dragState && this.isTriggerPlatformMovePickTool()) {
      this.triggerPlatformPointerPoint = { x: pointer.worldX, y: pointer.worldY };
      this.renderOverlay();
      return;
    }

    if (!this.dragState && this.hasActiveTriggerPlatformTool()) {
      const toolMode = this.getTriggerPlatformToolMode();
      const dragPainting = pointer.leftButtonDown() && (toolMode === 'paint' || toolMode === 'erase');
      if (dragPainting) {
        this.requestTriggerPlatformAction({ x: pointer.worldX, y: pointer.worldY });
      }
    }

    if (!this.dragState) {
      return;
    }

    if (this.dragState.mode === 'pan') {
      if (!(pointer.leftButtonDown() || pointer.middleButtonDown() || pointer.rightButtonDown())) {
        this.cancelDragState();
        return;
      }
      this.cameras.main.scrollX = this.dragState.scroll.x - ((pointer.x - this.dragState.origin.x) / this.cameras.main.zoom);
      this.cameras.main.scrollY = this.dragState.scroll.y - ((pointer.y - this.dragState.origin.y) / this.cameras.main.zoom);
      this.clampCameraToWorld();
      this.emitCameraChange();
      return;
    }

    if (this.dragState.mode === 'marquee-map-tiles' || this.dragState.mode === 'marquee-components') {
      if (!pointer.leftButtonDown()) {
        this.cancelDragState();
        return;
      }

      this.dragState.current = { x: pointer.worldX, y: pointer.worldY };
      const deltaX = this.dragState.current.x - this.dragState.origin.x;
      const deltaY = this.dragState.current.y - this.dragState.origin.y;
      if (!this.dragState.started) {
        const distance = Math.hypot(deltaX, deltaY);
        if (distance < MARQUEE_DRAG_THRESHOLD) {
          return;
        }
        this.dragState.started = true;
      }

      const marqueeRect = buildMarqueeRect(this.dragState.origin, this.dragState.current);
      if (this.dragState.mode === 'marquee-map-tiles') {
        const hits = [...this.mapTileRecords.values()]
          .filter((record) => Phaser.Geom.Intersects.RectangleToRectangle(marqueeRect, record.getVisualBounds()))
          .map((record) => record.id);
        const nextSelection = this.dragState.additive
          ? [...new Set([...(this.dragState.initialSelection || []), ...hits])]
          : hits;

        if (!areIdListsEqual(nextSelection, this.getSelectedMapTileIds())) {
          this.setMapTileSelection(nextSelection);
        }
      } else {
        const hits = [...this.objectRecords.values()]
          .filter((record) => Phaser.Geom.Intersects.RectangleToRectangle(marqueeRect, record.getVisualBounds()))
          .map((record) => record.entry.editorId);
        const currentSelection = this.editorState?.selectedObjectIds || [];
        const nextSelection = this.dragState.additive
          ? [...new Set([...(this.dragState.initialSelection || []), ...hits])]
          : hits;

        if (!areIdListsEqual(nextSelection, currentSelection)) {
          this.callbacks.onSelectionChange?.(nextSelection);
        }
      }

      this.renderOverlay();
      return;
    }

    if (this.dragState.mode === 'map-tile-move') {
      if (!pointer.leftButtonDown()) {
        this.cancelDragState();
        return;
      }

      const deltaX = pointer.worldX - Number(this.dragState.origin?.x || 0);
      const deltaY = pointer.worldY - Number(this.dragState.origin?.y || 0);

      const moveChanges = (Array.isArray(this.dragState.tileIds) ? this.dragState.tileIds : [])
        .map((tileId) => {
          const startPosition = this.dragState.startPositions?.[tileId];
          const tileRecord = this.mapTileRecords.get(tileId);
          if (!startPosition) {
            return null;
          }

          const itemSnapEnabled = this.getMapTileSnapSize() > 0 && tileRecord?.tile?.snapToGrid !== false;

          return {
            id: tileId,
            point: this.toSnappedTilePoint({
              x: Number(startPosition.x || 0) + deltaX,
              y: Number(startPosition.y || 0) + deltaY,
            }, itemSnapEnabled),
          };
        })
        .filter(Boolean);

      if (!moveChanges.length) {
        return;
      }

      const moveKey = moveChanges
        .map((change) => `${change.id}:${change.point.x}:${change.point.y}`)
        .join('|');
      if (moveKey !== this.mapTileLastMoveKey) {
        this.mapTileLastMoveKey = moveKey;
        moveChanges.forEach((change) => {
          const tileRecord = this.mapTileRecords.get(change.id);
          if (!tileRecord) {
            return;
          }

          tileRecord.setFromTile({
            ...tileRecord.tile,
            x: change.point.x,
            y: change.point.y,
          });
        });
        this.renderOverlay();
        this.callbacks.onMapTileMove?.(moveChanges);
      }
      return;
    }

    if (this.dragState.mode === 'map-tile-resize') {
      if (!pointer.leftButtonDown()) {
        this.cancelDragState();
        return;
      }

      const tileRecord = this.mapTileRecords.get(this.dragState.tileId);
      if (!tileRecord) {
        this.cancelDragState();
        return;
      }

      const snapStep = this.getMapTileSnapSize() || MAP_TILE_DEFAULT_SNAP;
      const rawDelta = Math.max(
        pointer.worldX - this.dragState.origin.x,
        pointer.worldY - this.dragState.origin.y,
      );
      const rawSize = this.dragState.startSize + rawDelta;
      const snappedSize = Math.round(rawSize / snapStep) * snapStep;
      const nextSize = clampNumber(
        Number.isFinite(snappedSize) ? snappedSize : this.dragState.startSize,
        MAP_TILE_MIN_SIZE,
        MAP_TILE_MAX_SIZE,
      );

      if (nextSize === this.dragState.lastSize) {
        return;
      }

      this.dragState.lastSize = nextSize;
      tileRecord.setFromTile({
        ...tileRecord.tile,
        size: nextSize,
      });
      this.callbacks.onMapTileResize?.({ id: this.dragState.tileId, size: nextSize });
      this.renderOverlay();
      return;
    }

    if (!pointer.leftButtonDown()) {
      this.cancelDragState();
      return;
    }
    const gridSize = Math.max(1, Number(this.editorState.settings?.gridSize || 20));
    const snapEnabled = Boolean(this.editorState.settings?.snapEnabled);
    const rawDeltaX = pointer.worldX - this.dragState.origin.x;
    const rawDeltaY = pointer.worldY - this.dragState.origin.y;
    if (this.dragState.mode === 'move') {
      const changes = this.dragState.records.map((record) => {
        const itemSnapEnabled = snapEnabled && record?.entry?.object?.snapToGrid !== false;
        const deltaX = itemSnapEnabled
          ? Math.round(rawDeltaX / gridSize) * gridSize
          : Math.round(rawDeltaX);
        const deltaY = itemSnapEnabled
          ? Math.round(rawDeltaY / gridSize) * gridSize
          : Math.round(rawDeltaY);
        const nextPosition = {
          x: this.dragState.startPositions[record.entry.editorId].x + deltaX,
          y: this.dragState.startPositions[record.entry.editorId].y + deltaY,
        };

        if (record.entry.type === 'invisiblePlatforms') {
          const frame = normalizeInvisiblePlatformLocalFrame({
            ...record.entry.object,
            ...nextPosition,
          }, {
            gridSize,
            viewport: this.worldLayout.viewport,
            maxHeight: INVISIBLE_PLATFORM_MAX_HEIGHT,
          });

          return {
            editorId: record.entry.editorId,
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height,
          };
        }

        return {
          editorId: record.entry.editorId,
          x: nextPosition.x,
          y: nextPosition.y,
        };
      });
      changes.forEach((change) => this.objectRecords.get(change.editorId)?.setFromObject({
        ...this.objectRecords.get(change.editorId).entry.object,
        x: change.x,
        y: change.y,
        ...(change.width !== undefined ? { width: change.width } : {}),
        ...(change.height !== undefined ? { height: change.height } : {}),
      }));
      this.callbacks.onMoveObjects?.(changes);
      this.renderOverlay();
      return;
    }
    if (this.dragState.mode === 'resize-width') {
      const isInvisiblePlatform = this.dragState.record.entry.type === 'invisiblePlatforms';
      const startWidth = isInvisiblePlatform
        ? normalizeInvisiblePlatformDimension(this.dragState.startSize.width, {
          gridSize,
          fallback: gridSize,
          max: this.worldLayout.viewport.width,
        })
        : this.dragState.startSize.width;
      const rawNextWidth = startWidth + rawDeltaX;
      const nextWidth = isInvisiblePlatform
        ? normalizeInvisiblePlatformDimension(rawNextWidth, {
          gridSize,
          fallback: startWidth,
          max: this.worldLayout.viewport.width,
        })
        : Math.max(gridSize * 2, rawNextWidth);
      const appliedDelta = nextWidth - startWidth;
      const nextObject = {
        ...this.dragState.record.entry.object,
        width: nextWidth,
        x: this.dragState.startPosition.x + (appliedDelta / 2),
      };
      const resolvedObject = isInvisiblePlatform
        ? {
            ...nextObject,
            ...normalizeInvisiblePlatformLocalFrame(nextObject, {
              gridSize,
              viewport: this.worldLayout.viewport,
              maxHeight: INVISIBLE_PLATFORM_MAX_HEIGHT,
            }),
          }
        : nextObject;
      this.dragState.record.setFromObject(resolvedObject);
      this.callbacks.onResizeObject?.({
        editorId: this.dragState.record.entry.editorId,
        x: resolvedObject.x,
        width: resolvedObject.width,
      });
      this.renderOverlay();
      return;
    }
    const isInvisiblePlatform = this.dragState.record.entry.type === 'invisiblePlatforms';
    const startHeight = isInvisiblePlatform
      ? normalizeInvisiblePlatformDimension(this.dragState.startSize.height, {
        gridSize,
        fallback: gridSize,
        max: INVISIBLE_PLATFORM_MAX_HEIGHT,
      })
      : this.dragState.startSize.height;
    const rawNextHeight = startHeight + rawDeltaY;
    const nextHeight = isInvisiblePlatform
      ? normalizeInvisiblePlatformDimension(rawNextHeight, {
        gridSize,
        fallback: startHeight,
        max: INVISIBLE_PLATFORM_MAX_HEIGHT,
      })
      : Math.max(gridSize, rawNextHeight);
    const appliedDelta = nextHeight - startHeight;
    const nextObject = {
      ...this.dragState.record.entry.object,
      height: nextHeight,
      y: this.dragState.startPosition.y + (appliedDelta / 2),
    };
    const resolvedObject = isInvisiblePlatform
      ? {
          ...nextObject,
          ...normalizeInvisiblePlatformLocalFrame(nextObject, {
            gridSize,
            viewport: this.worldLayout.viewport,
            maxHeight: INVISIBLE_PLATFORM_MAX_HEIGHT,
          }),
        }
      : nextObject;
    this.dragState.record.setFromObject(resolvedObject);
    const resizePayload = {
      editorId: this.dragState.record.entry.editorId,
      y: resolvedObject.y,
      height: resolvedObject.height,
    };
    if (!isInvisiblePlatform) {
      resizePayload.bodyHeight = Math.min(Number(this.dragState.record.entry.object.bodyHeight || nextHeight), nextHeight);
    }
    this.callbacks.onResizeObject?.(resizePayload);
    this.renderOverlay();
  }

  handlePointerUp() {
    const activeDragState = this.dragState;
    if (activeDragState?.mode === 'marquee-map-tiles' && !activeDragState.started && !activeDragState.additive) {
      this.setMapTileSelection([]);
    }
    if (activeDragState?.mode === 'marquee-components' && !activeDragState.started && !activeDragState.additive) {
      this.callbacks.onSelectionChange?.([]);
    }

    this.mapTileLastActionKey = '';
    this.mapTileLastMoveKey = '';
    this.triggerPlatformLastActionKey = '';
    this.cancelDragState();
  }

  handleWheel(pointer, _gameObjects, _deltaX, deltaY) {
    if (!this.isCameraNavigationEnabled()) {
      return;
    }

    this.setZoom(this.cameras.main.zoom + (deltaY > 0 ? -0.12 : 0.12), pointer.x, pointer.y);
  }

  renderOverlay() {
    destroyAll(this.handleObjects);
    this.handleObjects = [];
    this.gridGraphics.clear();
    this.selectionGraphics.clear();
    const bounds = this.worldLayout?.bounds;
    if (!bounds) {
      return;
    }

    const toAlignedRect = (sourceRect, inset = 0) => {
      const rawLeft = Number.isFinite(Number(sourceRect?.left)) ? Number(sourceRect.left) : Number(sourceRect?.x) || 0;
      const rawTop = Number.isFinite(Number(sourceRect?.top)) ? Number(sourceRect.top) : Number(sourceRect?.y) || 0;

      let rawWidth = Number(sourceRect?.width);
      if (!Number.isFinite(rawWidth)) {
        rawWidth = Number(sourceRect?.right) - rawLeft;
      }

      let rawHeight = Number(sourceRect?.height);
      if (!Number.isFinite(rawHeight)) {
        rawHeight = Number(sourceRect?.bottom) - rawTop;
      }

      const left = roundCoordinate(rawLeft + inset);
      const top = roundCoordinate(rawTop + inset);
      const width = Math.max(1, roundCoordinate(rawWidth - (inset * 2)));
      const height = Math.max(1, roundCoordinate(rawHeight - (inset * 2)));

      return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        centerX: left + (width / 2),
        centerY: top + (height / 2),
      };
    };

    const buildLinePositions = (start, end, step) => {
      const positions = [];
      let value = start;

      while (value < end) {
        positions.push(value);
        value += step;
      }

      positions.push(end);
      return positions;
    };

    if (this.editorState?.settings?.showGrid) {
      const gridSize = Math.max(1, Math.round(Number(this.editorState.settings.gridSize || 20)));
      this.gridGraphics.lineStyle(1, 0xffffff, 0.08);

      this.worldLayout.cells.forEach((record) => {
        const aligned = toAlignedRect(record.bounds);
        const xPositions = buildLinePositions(aligned.left, aligned.right, gridSize);
        const yPositions = buildLinePositions(aligned.top, aligned.bottom, gridSize);

        xPositions.forEach((x) => {
          this.gridGraphics.lineBetween(crispLineCoordinate(x), aligned.top, crispLineCoordinate(x), aligned.bottom);
        });

        yPositions.forEach((y) => {
          this.gridGraphics.lineBetween(aligned.left, crispLineCoordinate(y), aligned.right, crispLineCoordinate(y));
        });
      });
    }

    const hasMultipleCells = this.worldLayout.cells.length > 1;
    if (hasMultipleCells) {
      this.gridGraphics.lineStyle(2, 0x94a3b8, 0.25);
      this.worldLayout.cells.forEach((record) => {
        const aligned = toAlignedRect(record.bounds);
        this.gridGraphics.strokeRect(aligned.left, aligned.top, aligned.width, aligned.height);
      });
    }

    const selectedCell = this.getSelectedCellRecord();
    if (selectedCell && !this.isMapTileMode() && hasMultipleCells) {
      const alignedCell = toAlignedRect(selectedCell.bounds, 4);
      this.selectionGraphics.lineStyle(5, 0x10b981, 0.9);
      this.selectionGraphics.strokeRect(alignedCell.left, alignedCell.top, alignedCell.width, alignedCell.height);
    }

    if (this.isMapTileMode()) {
      const selectedTileRecords = this.getSelectedMapTileIds()
        .map((tileId) => this.mapTileRecords.get(tileId))
        .filter(Boolean);

      selectedTileRecords.forEach((tileRecord) => {
        const tileBounds = toAlignedRect(tileRecord.getVisualBounds(), -4);
        this.selectionGraphics.lineStyle(3, 0x22d3ee, 0.95);
        this.selectionGraphics.strokeRect(tileBounds.left, tileBounds.top, tileBounds.width, tileBounds.height);
      });

      if (selectedTileRecords.length === 1 && this.isMapTileResizeHandlesEnabled()) {
        const selectedTileRecord = selectedTileRecords[0];
        const tileBounds = toAlignedRect(selectedTileRecord.getVisualBounds(), -4);
        const resizeHandle = this.add.circle(
          roundCoordinate(tileBounds.right),
          roundCoordinate(tileBounds.bottom),
          HANDLE_RADIUS,
          0xf59e0b,
          1,
        )
          .setStrokeStyle(3, 0x78350f, 1)
          .setInteractive({ useHandCursor: true })
          .setDepth(29);
        resizeHandle.on('pointerdown', (pointer, _localX, _localY, event) => {
          event?.stopPropagation?.();
          this.dragState = this.buildMapTileResizeState(pointer, selectedTileRecord);
        });
        this.handleObjects.push(resizeHandle);
      }

      if (this.dragState?.mode === 'marquee-map-tiles' && this.dragState.started) {
        const marqueeRect = toAlignedRect(buildMarqueeRect(this.dragState.origin, this.dragState.current));
        this.selectionGraphics.lineStyle(2, 0x67e8f9, 0.92);
        this.selectionGraphics.strokeRect(marqueeRect.left, marqueeRect.top, marqueeRect.width, marqueeRect.height);
        this.selectionGraphics.fillStyle(0x22d3ee, 0.12);
        this.selectionGraphics.fillRect(marqueeRect.left, marqueeRect.top, marqueeRect.width, marqueeRect.height);
      }
      return;
    }

    const selected = (this.editorState?.selectedObjectIds || []).map((id) => this.objectRecords.get(id)).filter(Boolean);
    if (this.editorState?.settings?.showHitboxes) {
      Array.from(this.objectRecords.values()).forEach((record) => {
        const bodyRects = typeof record.getBodyRects === 'function' ? record.getBodyRects() : [];
        if (bodyRects.length) {
          bodyRects.forEach((bodyRect) => {
            const alignedBody = toAlignedRect(bodyRect);
            this.selectionGraphics.lineStyle(1, 0xf97316, 0.52);
            this.selectionGraphics.strokeRect(alignedBody.left, alignedBody.top, alignedBody.width, alignedBody.height);
          });
          return;
        }

        const bodyBounds = record.getBodyBounds?.();
        if (!bodyBounds) {
          return;
        }

        const alignedBody = toAlignedRect(bodyBounds);
        this.selectionGraphics.lineStyle(1, 0xf97316, 0.52);
        this.selectionGraphics.strokeRect(alignedBody.left, alignedBody.top, alignedBody.width, alignedBody.height);
      });
    }

    selected.forEach((record) => {
      const box = toAlignedRect(record.getVisualBounds(), -4);
      this.selectionGraphics.lineStyle(3, 0xf8fafc, 0.92);
      this.selectionGraphics.strokeRect(box.left, box.top, box.width, box.height);
      if (record.entry?.type === 'triggerPlatforms') {
        this.drawSelectedTriggerPlatformMoveGuides(record);
      }
      if (this.editorState?.settings?.showHitboxes) {
        const bodyRects = typeof record.getBodyRects === 'function' ? record.getBodyRects() : [];
        if (bodyRects.length) {
          bodyRects.forEach((bodyRect) => {
            const alignedBody = toAlignedRect(bodyRect);
            this.selectionGraphics.lineStyle(2, 0xf97316, 0.88);
            this.selectionGraphics.strokeRect(alignedBody.left, alignedBody.top, alignedBody.width, alignedBody.height);
          });
          return;
        }

        const bodyBounds = record.getBodyBounds?.();
        if (bodyBounds) {
          const alignedBody = toAlignedRect(bodyBounds);
          this.selectionGraphics.lineStyle(2, 0xf97316, 0.88);
          this.selectionGraphics.strokeRect(alignedBody.left, alignedBody.top, alignedBody.width, alignedBody.height);
        }
      }
    });

    if (this.isTriggerPlatformMovePickTool()) {
      const triggerRecord = this.getSelectedTriggerPlatformRecord();
      const color = this.getTriggerPlatformToolMode() === 'set-wrong-move'
        ? TRIGGER_PLATFORM_TARGET_WRONG
        : TRIGGER_PLATFORM_TARGET_CORRECT;
      this.drawTriggerPlatformTargetGuide(triggerRecord, this.triggerPlatformPointerPoint, color, { live: true });
    }

    if (this.dragState?.mode === 'marquee-components' && this.dragState.started) {
      const marqueeRect = toAlignedRect(buildMarqueeRect(this.dragState.origin, this.dragState.current));
      this.selectionGraphics.lineStyle(2, 0xa5f3fc, 0.95);
      this.selectionGraphics.strokeRect(marqueeRect.left, marqueeRect.top, marqueeRect.width, marqueeRect.height);
      this.selectionGraphics.fillStyle(0x67e8f9, 0.1);
      this.selectionGraphics.fillRect(marqueeRect.left, marqueeRect.top, marqueeRect.width, marqueeRect.height);
    }

    if (selected.length === 1 && isRectEntry(selected[0].entry) && this.isComponentResizeHandlesEnabled()) {
      const box = toAlignedRect(selected[0].getVisualBounds());
      const widthHandle = this.add.circle(roundCoordinate(box.right), roundCoordinate(box.centerY), HANDLE_RADIUS, 0x34d399, 1).setStrokeStyle(3, 0x064e3b, 1).setInteractive({ useHandCursor: true }).setDepth(29);
      const heightHandle = this.add.circle(roundCoordinate(box.centerX), roundCoordinate(box.bottom), HANDLE_RADIUS, 0x38bdf8, 1).setStrokeStyle(3, 0x0f172a, 1).setInteractive({ useHandCursor: true }).setDepth(29);
      widthHandle.on('pointerdown', (pointer, _localX, _localY, event) => {
        event?.stopPropagation?.();
        this.dragState = this.buildResizeState('width', pointer);
      });
      heightHandle.on('pointerdown', (pointer, _localX, _localY, event) => {
        event?.stopPropagation?.();
        this.dragState = this.buildResizeState('height', pointer);
      });
      this.handleObjects.push(widthHandle, heightHandle);
    }
  }
}
