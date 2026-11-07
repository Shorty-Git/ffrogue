/** Optional registered reserve in slot three; the original party is the default. */
export function partyReserve(registered, requested) {
  const key=requested ?? 'barret';
  if(!Array.isArray(registered)||!registered.includes(key)||['cloud','aerith'].includes(key))
    throw Error('Reserve must be a registered character outside the fixed front/healer slots');
  return key;
}
