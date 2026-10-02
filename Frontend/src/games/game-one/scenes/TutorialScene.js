import Phaser from 'phaser';
import Player from '../entities/Player';
import EnemyProjectile from '../entities/EnemyProjectile';
import { shouldProcessSurfaceCollision } from '../systems/surfaceGeometry';
import { buildTutorialPlan, observeTutorialAction, automaticTutorialIntent } from '../systems/tutorialPlan';

const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// A separate physics world over the paused, authored room. No progress bridge,
// registry writes, damage callbacks, pickups, or real-player mutations live here.
export default class TutorialScene extends Phaser.Scene {
  constructor() { super('GameOneTutorialScene'); }

  create({ source, onUpdate }) {
    this.source = source;
    this.onUpdate = onUpdate;
    this.manifest = source.manifest;
    this.steps = buildTutorialPlan({ ...source.playerAbilityConfig, allowProjectile: source.allowProjectile, allowMidairDash: source.allowMidairDash });
    this.index = 0;
    this.projectiles = [];
    this.lastPublish = 0;
    this.config = source.playerAbilityConfig || {};
    const camera = source.cameras.main;
    // Guidelines can pause the opening fade before the room is revealed.
    if (!source.hasGameplayStarted && camera.fadeEffect?.isRunning) camera.fadeEffect.reset();
    this.cameras.main.setZoom(camera.zoom).setScroll(camera.scrollX, camera.scrollY);
    this.room = { ...source.currentCellRecord.bounds };
    this.physics.world.setBounds(this.room.left, this.room.top, this.room.width, this.room.height);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.player = new Player(this, source.player.x, source.player.y, this.manifest.player, {
      ...source.worldObjectsData.spawn, ...this.config, allowDoubleJump: false,
    });
    this.player.setScale(source.player.scaleX, source.player.scaleY);
    this.player.setDepth(10);
    this.surfaces = [];
    source.surfaceEntries.filter((entry) => entry.body?.enable && intersects(entry.body, this.room) && !entry.goThroughTargets?.player)
      .forEach((entry) => {
        const original = entry.body;
        const body = this.physics.add.staticBody(original.x, original.y, original.width, original.height);
        this.physics.add.collider(this.player, body, null, (p, platform) => shouldProcessSurfaceCollision(p.body, platform.body || platform, entry.geometry));
        this.surfaces.push({ body, entry });
      });
    const safe = this.surfaces.filter(({ body, entry }) => !entry.config.hazard && body.width > this.player.body.width + 64);
    safe.sort((a, b) => (Math.abs(a.body.center.x - source.player.x) + Math.abs(a.body.top - source.player.body.bottom))
      - (Math.abs(b.body.center.x - source.player.x) + Math.abs(b.body.top - source.player.body.bottom)));
    this.safe = safe[0];
    this.spawn = this.safe ? {
      x: this.safe.body.center.x,
      y: this.safe.body.top - (this.player.body.bottom - this.player.y) - 2,
    } : { x: source.player.x, y: source.player.y };
    this.hidden = [source.player, source.player.powerUpAura, source.missionBriefing, source.interactionPrompt?.container]
      .filter(Boolean).map((object) => ({ object, visible: object.visible }));
    this.hidden.forEach(({ object }) => object.setVisible(false));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hidden.forEach(({ object, visible }) => { if (object.scene) object.setVisible(visible); });
      this.advanceTimer?.remove(false);
      this.onUpdate = null;
    });
    this.returnToSafety();
    this.beginStep();
  }

  beginStep() {
    this.complete = false;
    this.recovery = false;
    this.demoStartedAt = this.time.now;
    this.demoJumpedAt = null;
    this.demoPressedUntil = 0;
    this.demoControl = null;
    this.progress = { startX: this.player.x, distance: 30, ratio: 0, jumped: false };
    this.publish();
  }

  acknowledge() {
    if (!this.sys.isActive()) return;
    const step = this.steps[this.index];
    if (step.id !== 'ready') this.goToPage(step.page + 1);
  }

  goToPage(page) {
    if (!this.sys.isActive()) return;
    const index = this.steps.findIndex((step) => step.page === page);
    if (index < 0) return;
    this.advanceTimer?.remove(false);
    this.advanceTimer = null;
    this.projectiles.forEach((projectile) => projectile.destroy());
    this.projectiles = [];
    this.returnToSafety();
    this.index = index;
    this.beginStep();
  }

  finishStep() {
    if (this.complete) return;
    this.complete = true;
    this.progress.ratio = 1;
    this.publish();
    // Play the controls in sequence, but let Next/Back change the visible page.
    if (this.steps[this.index + 1]?.page !== this.steps[this.index].page) return;
    this.advanceTimer = this.time.delayedCall(1100, () => {
      this.advanceTimer = null;
      this.index += 1;
      if (this.steps[this.index].id === 'attack') this.returnToSafety();
      this.beginStep();
    });
  }

  returnToSafety() {
    this.player.stopDash();
    this.player.body.reset(this.spawn.x, this.spawn.y);
    this.player.setVelocity(0, 0);
    this.player.airJumpsUsed = 0;
    this.player.airDashUsed = false;
    this.player.dashReadyAt = 0;
  }

  shoot() {
    if (!this.source.allowProjectile || !this.textures.exists(this.manifest.enemyProjectile.key)) return false;
    const direction = this.player.facing;
    const projectile = new EnemyProjectile(this, this.player.x + direction * 44, this.player.y - 10, this.manifest.enemyProjectile, {
      direction, speed: this.config.projectileSpeed, lifetimeMs: this.config.projectileLifetimeMs,
      boundsLeft: this.room.left, boundsRight: this.room.right, size: this.config.projectileSize || 48,
    });
    projectile.setTint(0x34d399).setDepth(11);
    this.projectiles.push(projectile);
    return true;
  }

  // Match the actual camera, including room zoom and canvas scaling. The React
  // layer receives fractions of the canvas, not guessed viewport percentages.
  rectFor(object, hud = false) {
    if (!object || object.active === false || object.visible === false) return null;
    const rect = object instanceof Phaser.Physics.Arcade.StaticBody ? object : object.getBounds ? object.getBounds() : object;
    const camera = this.cameras.main;
    // Phaser's camera matrix maps camera-local coordinates. Remove the world
    // scroll before transforming so tutorial targets stay on their sprites in
    // rooms wider than the viewport (not in the letterbox beside the canvas).
    const transformed = hud ? null : camera.matrix.transformPoint(
      rect.left - camera.scrollX,
      rect.top - camera.scrollY,
    );
    const left = hud ? rect.left : transformed.x;
    const top = hud ? rect.top : transformed.y;
    const zoom = hud ? 1 : camera.zoom;
    const width = rect.width * zoom;
    const height = rect.height * zoom;
    const viewport = { left: 0, top: 0, right: this.scale.width, bottom: this.scale.height };
    if (!intersects({ left, top, right: left + width, bottom: top + height }, viewport)) return null;
    return { x: Math.max(0, left) / this.scale.width, y: Math.max(0, top) / this.scale.height,
      width: (Math.min(viewport.right, left + width) - Math.max(0, left)) / this.scale.width,
      height: (Math.min(viewport.bottom, top + height) - Math.max(0, top)) / this.scale.height };
  }

  getTarget(kind) {
    const hud = this.source.scene.get('HudScene');
    if (kind === 'health') return this.rectFor(hud.healthText, true);
    if (kind === 'counters') return this.rectFor(hud.coinText, true);
    if (kind === 'objective') return this.rectFor(hud.objectiveText, true);
    if (kind === 'scroll') {
      const hearts = this.rectFor(hud.healthText, true);
      return hearts && {
        ...hearts,
        // The text bounds reported by Phaser can lag behind its three-heart
        // value for one frame. Reserve enough width for the complete counter.
        width: Math.max(hearts.width, 0.075),
        height: Math.max(hearts.height, 0.05),
      };
    }
    if (kind === 'platform') return this.safe && this.rectFor(this.safe.body);
    if (kind === 'player') return this.rectFor(this.player);
    let objects = [];
    if (kind === 'hazard') objects = [...this.source.projectileCasters, ...this.source.ghosts,
      ...this.source.surfaceEntries.filter((e) => e.config.hazard).map((e) => e.geometry.visualRect)];
    if (kind === 'collectible') objects = this.source.sceneObjects.filter((object) => object.coinId);
    if (kind === 'monster') {
      const fireEnemy = this.source.projectileCasters
        .filter((object) => object?.enemyType === 'elemental')
        .map((object) => this.rectFor(object))
        .find(Boolean);
      if (fireEnemy) return fireEnemy;
      objects = [...this.source.projectileCasters, ...this.source.ghosts];
    }
    if (kind === 'booster') objects = this.source.sceneObjects.filter((object) => ['shield', 'health', 'speed', 'jump', 'doubleJump'].includes(object.pickupType));
    if (kind === 'coin') objects = this.source.sceneObjects.filter((object) => object.coinId && (!object.pickupType || object.pickupType === 'coin'));
    if (kind === 'treasure') {
      const treasure = this.source.portals
        .filter((object) => object.isTreasureChest)
        .map((object) => this.rectFor(object))
        .find(Boolean);
      if (treasure) return treasure;
      objects = this.source.portals;
    }
    if (kind === 'portal') objects = this.source.portals;
    return objects
      .map((object) => this.rectFor(object))
      .filter(Boolean)
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0] || null;
  }

  publish() {
    if (!this.onUpdate) return;
    const step = this.steps[this.index];
    const measuredTarget = this.getTarget(step.target);
    const objectTarget = measuredTarget;
    // A missing object gets a truthful route/counter cue, never a fabricated pickup.
    const target = objectTarget || (['coin', 'scroll'].includes(step.target) ? this.getTarget('counters')
      : step.target === 'monster' ? this.getTarget('health')
      : step.target === 'treasure' ? this.getTarget('portal') : null);
    const hud = this.source.scene.get('HudScene');
    this.onUpdate({ step, index: this.index, total: this.steps.length, page: step.page, pages: 6, objectVisible: Boolean(objectTarget),
      automatic: true, demoControl: this.demoControl, demoPressed: this.time.now < this.demoPressedUntil,
      movementControls: this.steps.filter((item) => item.control).map(({ id, keys, control }) => ({ id, keys, control })), completed: this.complete,
      progress: this.progress?.ratio || 0, jumped: Boolean(this.progress?.jumped), grounded: this.player.isOnGround(), target,
      player: this.rectFor(this.player), recovery: this.recovery,
      // Reserve the jump arc before takeoff so the instruction card stays out
      // of the character's way instead of chasing it during the animation.
      practiceArea: ['jump', 'dash'].includes(step.id) ? this.rectFor({
        left: this.spawn.x - this.player.displayWidth / 2 - 12,
        top: this.spawn.y - this.player.displayHeight - this.player.jumpVelocity ** 2 / (2 * this.physics.world.gravity.y) - 32,
        width: this.player.displayWidth + 24,
        height: this.player.displayHeight + this.player.jumpVelocity ** 2 / (2 * this.physics.world.gravity.y) + 64,
      }) : null,
      obstacles: ['hazard', 'collectible', 'portal'].map((kind) => this.getTarget(kind)).filter(Boolean),
      hud: [hud.healthText, hud.coinText, hud.objectiveText, hud.areaText, hud.menuButton,
        ...hud.moveKeycaps, ...hud.jumpKeycaps, ...hud.attackKeycaps, hud.moveControlLabel, hud.jumpControlLabel, hud.attackControlLabel]
        .map((object) => this.rectFor(object, true)).filter(Boolean),
      movement: ['left', 'right'].includes(step.id) ? this.rectFor({ left: this.progress.startX + (step.id === 'left' ? -30 : 30) - 8,
        top: this.safe ? this.safe.body.top - 8 : this.player.body.bottom - 8, width: 16, height: 8 }) : null,
    });
  }

  update(time) {
    if (!this.player || !this.steps) return;
    const step = this.steps[this.index];
    const now = this.time.now;
    const intent = automaticTutorialIntent(step, { elapsed: now - this.demoStartedAt, now,
      grounded: this.player.isOnGround(), jumpedAt: this.demoJumpedAt, complete: this.complete });
    const pressed = intent.left ? 'left' : intent.right ? 'right' : intent.jumpPressed ? 'jump'
      : intent.dashPressed ? 'dash' : intent.attackPressed ? 'attack' : null;
    if (pressed) { this.demoControl = pressed; this.demoPressedUntil = now + 220; }
    const wasGrounded = this.player.isOnGround();
    const wasDashing = this.player.isDashing;
    this.player.update(intent);
    if (intent.jumpPressed && wasGrounded && this.player.body.velocity.y < 0) this.demoJumpedAt = now;
    const shotCreated = intent.attackPressed && this.shoot();
    const onSafePlatform = this.safe && Math.abs(this.player.body.bottom - this.safe.body.top) < 8
      && this.player.body.right > this.safe.body.left && this.player.body.left < this.safe.body.right;
    if (!this.complete) {
      this.progress = observeTutorialAction(step.id, this.progress, {
        x: this.player.x, grounded: this.player.isOnGround(), onSafePlatform,
        jumpAccepted: intent.jumpPressed && wasGrounded && this.player.body.velocity.y < 0,
        dashAccepted: !wasDashing && this.player.isDashing, shotCreated,
      });
      if (this.progress.complete) this.finishStep();
    }
    this.projectiles = this.projectiles.filter((projectile) => {
      if (!projectile.active) return false;
      projectile.update(time);
      return projectile.active;
    });
    if (this.player.body.top > this.room.bottom || this.player.body.bottom > (this.safe?.body.top ?? this.room.bottom) + 100) {
      this.returnToSafety();
      this.progress.jumped = false;
      this.progress.startX = this.player.x;
      this.progress.ratio = 0;
      this.recovery = true;
      if (!this.complete) { this.demoStartedAt = now; this.demoJumpedAt = null; }
    }
    if (time - this.lastPublish > 70) { this.lastPublish = time; this.publish(); }
  }
}
