import { shouldLoadBarcodeGrading } from './barcodeGradingMode';
test.each(['production', 'development'])('%s exposes reviewed experimental grading without flags', environment => {
  for (const hostname of ['trace-umber.vercel.app', 'trace-preview.vercel.app', 'localhost']) {
    expect(shouldLoadBarcodeGrading(environment, hostname, '')).toBe(true);
    expect(shouldLoadBarcodeGrading(environment, hostname, '?barcodeGrading=0')).toBe(true);
  }
});
test.each(['test', undefined, 'unknown'])('URL flags cannot activate an unknown/test environment: %s', environment => {
  expect(shouldLoadBarcodeGrading(environment, 'localhost', '?barcodeGrading=1&nutritionPilot=1')).toBe(false);
});
