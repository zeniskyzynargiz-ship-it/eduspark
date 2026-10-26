export function strongEnough(p: string) {
  return p.length >= 8 && /[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(p) && /\d/.test(p);
}
