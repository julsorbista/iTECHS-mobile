// One gesture can reach both Phaser and the document-capture fallback.
export const createHintTapGuard = (clock = () => Date.now(), interval = 350) => {
  let lastPurchase = -Infinity;
  return () => {
    const now = clock();
    if (now - lastPurchase < interval) return false;
    lastPurchase = now;
    return true;
  };
};
