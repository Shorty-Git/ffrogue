/** Shared product palette for DOM menus and the existing Phaser HUD. */
export const RPG = {
  night:0x030d24, deep:0x061d49, blue:0x123c76, line:0xa7d1ed,
  silver:0xd4e4ed, gold:0xe5cd8c, ink:0xedf6ff, muted:0xa7bfd9,
  panelLight:0x203d5e, panelMid:0x112843, panelBottom:0x09172a,
  selected:0x2468a7, button:0x12396a, track:0x06152c,
  hp:0x83ceb0, warning:0xe5bc77, danger:0xf19691, mp:0x81caff,
} as const;
export const rpgHex=(color:number)=>'#'+color.toString(16).padStart(6,'0');
export const RPG_FONT='Source Sans 3, Segoe UI, sans-serif';
export function installRpgTheme(root=document.documentElement):void{
  for(const [key,value]of Object.entries(RPG))root.style.setProperty('--rpg-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),rpgHex(value));
  root.style.setProperty('--rpg-gap','18px');root.style.setProperty('--rpg-radius','4px');
}
