export default function groupBy<T, U>(list: T[], keyFunc: (item: T) => U) {
  const map = new Map<U, T[]>();
  list.forEach((item) => {
    const key = keyFunc(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(item);
  });
  return map;
}
