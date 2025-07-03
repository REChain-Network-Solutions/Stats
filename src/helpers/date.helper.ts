export function addZero(number: number): string {
  return number < 10 ? "0" + number : number.toString();
}

export function getKeyFromDate(date: string | number): string {
  const d = new Date(date);
  return (
    d.getUTCFullYear() +
    "-" +
    addZero(d.getUTCMonth() + 1) +
    "-" +
    addZero(d.getUTCDate())
  );
}
