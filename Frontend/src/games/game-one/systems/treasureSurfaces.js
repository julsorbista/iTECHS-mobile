export const getTreasureHazardLayout = (entry, config = {}) => {
  const frame = config.hazardSpriteFrame || (config.hazardType === 'fire' ? 'fireball' : 'spikes');
  const width = entry.geometry.bodyRect.width;
  const height = frame === 'spikes' ? 44 : 58;
  const isFire = config.hazardType === 'fire' || frame === 'fireball';
  const centerY = frame === 'spikes'
    ? entry.geometry.visualRect.top - (height / 2)
    : entry.visual.y - 25;
  // Fire artwork has animated/transparent outer pixels. Give only fire a
  // slightly larger contact envelope so every visible flame edge registers
  // on the same physics tick; spike geometry remains unchanged.
  const contactPaddingX = isFire ? 12 : 0;
  const contactPaddingTop = isFire ? 10 : 0;
  const contactPaddingBottom = isFire ? 4 : 0;

  return {
    frame,
    width,
    height,
    centerX: entry.visual.x,
    centerY,
    zoneWidth: width + (contactPaddingX * 2),
    zoneHeight: height + contactPaddingTop + contactPaddingBottom,
    zoneCenterY: centerY + ((contactPaddingBottom - contactPaddingTop) / 2),
  };
};

export const configureTreasureSurface = (scene, entry, config = {}) => {
  if (!entry?.body || !entry?.visual) return;
  if (config.hazard) {
    const layout = getTreasureHazardLayout(entry, config);
    const zone = scene.add.zone(
      layout.centerX,
      layout.zoneCenterY,
      layout.zoneWidth,
      layout.zoneHeight,
    );
    scene.physics.add.existing(zone, true);
    scene.physics.add.overlap(scene.player, zone, () => {
      const reason = config.hazardType || 'trap';
      scene.applyDamage(Number(config.damage) || 1, reason, { respawn: true, immediate: true });
    }, null, scene);
    const markerWidth = layout.frame === 'spikes' ? 64 : (layout.frame === 'turret' ? 110 : 80);
    const hazardWidth = layout.width;
    const markerCount = Math.max(1, Math.ceil(hazardWidth / markerWidth));
    const markerSpacing = hazardWidth / markerCount;
    const marker = scene.add.container(layout.centerX, layout.centerY).setDepth(7);
    for (let markerIndex = 0; markerIndex < markerCount; markerIndex += 1) {
      const markerX = (-hazardWidth / 2) + (markerSpacing * (markerIndex + 0.5));
      marker.add(scene.add.image(markerX, 0, `game-one-treasure-${layout.frame}`)
        .setDisplaySize(Math.min(markerSpacing, markerWidth), layout.height));
    }
    scene.sceneObjects.push(zone, marker);
  }
  const distance = Number(config.moveDistance);
  if (config.moveAxis && Number.isFinite(distance) && distance !== 0) {
    const axis = String(config.moveAxis).toLowerCase() === 'y' ? 'y' : 'x';
    const startX = entry.visual.x;
    const startY = entry.visual.y;
    scene.tweens.add({
      targets: entry.visual, [axis]: entry.visual[axis] + distance,
      duration: Math.max(800, Number(config.moveDuration) || 1800), yoyo: true, repeat: -1, ease: 'Sine.InOut',
      onUpdate: () => {
        scene.physics.world.staticTree?.remove?.(entry.body);
        entry.body.position.set(entry.geometry.bodyRect.left + entry.visual.x - startX, entry.geometry.bodyRect.top + entry.visual.y - startY);
        entry.body.updateCenter?.();
        scene.physics.world.staticTree?.insert?.(entry.body);
      },
    });
  }
  if (Number(config.disappearEveryMs) > 0) {
    scene.time.addEvent({ delay: Math.max(1000, Number(config.disappearEveryMs)), loop: true, callback: () => {
      const enabled = !entry.body.enable;
      entry.body.enable = enabled;
      if (entry.collider) entry.collider.active = enabled;
      entry.visual.setAlpha(enabled ? 1 : 0.15);
    } });
  }
  if (Number(config.collapseDelayMs) > 0) {
    let collapseStarted = false;
    const collapseZone = scene.add.zone(entry.visual.x, entry.visual.y - 18, entry.geometry.bodyRect.width, 28);
    scene.physics.add.existing(collapseZone, true);
    scene.sceneObjects.push(collapseZone);
    scene.physics.add.overlap(scene.player, collapseZone, () => {
      if (collapseStarted) return;
      collapseStarted = true;
      scene.time.delayedCall(Math.max(100, Number(config.collapseDelayMs)), () => {
        entry.body.enable = false;
        if (entry.collider) entry.collider.active = false;
        entry.visual.setAlpha(0.12);
      });
    });
  }
};
