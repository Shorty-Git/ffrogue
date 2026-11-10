import {ELEMENT_LABELS,type Element} from '../run/elementRules.mjs';
/** Short element chips for HUD plates, tooltips and reward cards (styles in ffbeTheme.css .el-chip). */
const SHORT:Record<Element,string>={fire:'Fire',ice:'Ice',lightning:'Thunder',water:'Water',wind:'Wind',earth:'Earth',light:'Light',dark:'Dark'};
export const elementChip=(element:Element,mode:'weak'|'resist'|'plain'='plain')=>
  `<i class="el-chip el-${element} is-${mode}" title="${ELEMENT_LABELS[element]}${mode==='weak'?' weakness':mode==='resist'?' resistance':''}">${SHORT[element]}</i>`;
export const elementChips=(elements:readonly Element[],mode:'weak'|'resist'|'plain'='plain')=>elements.map(e=>elementChip(e,mode)).join('');
/** Plain-text affinity line, e.g. "Weak: Fire, Earth · Resists: Water". */
export function affinityText(affinity:{weak:readonly Element[];resist:readonly Element[]}):string{
  const parts=[];
  if(affinity.weak.length)parts.push('Weak: '+affinity.weak.map(e=>ELEMENT_LABELS[e]).join(', '));
  if(affinity.resist.length)parts.push('Resists: '+affinity.resist.map(e=>ELEMENT_LABELS[e]).join(', '));
  return parts.join(' · ');
}
