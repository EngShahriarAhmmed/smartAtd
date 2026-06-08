export function attendanceRiskLevel(rate: number) {
  if (rate > 85) return 'green';
  if (rate >= 75) return 'yellow';
  return 'red';
}

export function isNonCollegiate(rate: number) {
  return rate < 75;
}
