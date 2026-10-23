import Phaser from 'phaser';

interface EnemyHealth {
  nameTag: string;
  currentHp: number;
  maxHp: number;
}

/** One screen-space health readout; enemy sprites retain only their target marker. */
export class EnemyTargetPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly name: Phaser.GameObjects.Text;
  private readonly value: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Rectangle;
  private readonly chip: Phaser.GameObjects.Rectangle;
  private previous?: EnemyHealth;
  private hp = -1;
  private maximum = -1;
  private chipTween?: Phaser.Tweens.Tween;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(18, 62).setDepth(1100).setVisible(false);
    const background = scene.add.image(140, 32, 'ui_command_plate').setDisplaySize(280, 64).setAlpha(0.94);
    this.name = scene.add.text(12, 8, '', {
      fontFamily: 'Arial', fontSize: '15px', color: '#ede8d8', wordWrap: { width: 256 }, maxLines: 1,
    });
    this.value = scene.add.text(268, 30, '', { fontFamily: 'Arial', fontSize: '12px', color: '#b9c0b0' }).setOrigin(1, 0);
    const track = scene.add.rectangle(12, 51, 256, 6, 0x101715).setOrigin(0, 0.5);
    this.chip = scene.add.rectangle(12, 51, 256, 6, 0xd3bc83).setOrigin(0, 0.5);
    this.bar = scene.add.rectangle(12, 51, 256, 6, 0x8eaf80).setOrigin(0, 0.5);
    this.container.add([background, this.name, this.value, track, this.chip, this.bar]);
  }

  update(enemy: EnemyHealth | null): void {
    if (!enemy || enemy.currentHp <= 0) {
      this.container.setVisible(false);
      this.previous = undefined;
      this.chipTween?.stop();
      return;
    }
    this.container.setVisible(true);
    if (enemy === this.previous && enemy.currentHp === this.hp && enemy.maxHp === this.maximum) return;
    const pct = Phaser.Math.Clamp(enemy.currentHp / enemy.maxHp, 0, 1);
    const width = 256 * pct;
    this.chipTween?.stop();
    if (enemy === this.previous && enemy.currentHp < this.hp) {
      this.chipTween = this.scene.tweens.add({ targets: this.chip, width, delay: 160, duration: 300 });
    } else this.chip.width = width;
    this.bar.width = width;
    this.bar.fillColor = pct > 0.5 ? 0x8eaf80 : pct > 0.25 ? 0xc2a56b : 0xca7768;
    this.name.setText(`TARGET · ${enemy.nameTag}`);
    this.value.setText(`${enemy.currentHp.toLocaleString()} / ${enemy.maxHp.toLocaleString()} HP`);
    this.previous = enemy;
    this.hp = enemy.currentHp;
    this.maximum = enemy.maxHp;
  }
}
