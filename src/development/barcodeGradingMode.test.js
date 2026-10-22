import { shouldLoadBarcodeGrading } from './barcodeGradingMode';
const preview = { deploymentEnvironment: 'preview', previewEnabled: 'true' };
test('explicit Preview build works on the hosted phone URL without a query flag', () => {
  expect(shouldLoadBarcodeGrading('production', 'trace-example.vercel.app', '', preview)).toBe(true);
});
test.each([undefined, {}, {deploymentEnvironment:'production',previewEnabled:'true'},
  {deploymentEnvironment:'preview'}, {deploymentEnvironment:'preview',previewEnabled:'false'},
  {previewEnabled:'true'}, {deploymentEnvironment:'development',previewEnabled:'true'}])('ordinary production stays closed, including query flags: %j', build => {
  expect(shouldLoadBarcodeGrading('production','trace-umber.vercel.app','?barcodeGrading=1&nutritionPilot=1',build)).toBe(false);
});
test.each(['localhost','127.0.0.1','[::1]'])('local development remains explicit on %s', host => {
  expect(shouldLoadBarcodeGrading('development',host,'?barcodeGrading=1')).toBe(true);
  expect(shouldLoadBarcodeGrading('development',host,'')).toBe(false);
});
test('unapproved development hosts and test runtime remain closed', () => {
  expect(shouldLoadBarcodeGrading('development','trace-umber.vercel.app','?barcodeGrading=1')).toBe(false);
  expect(shouldLoadBarcodeGrading('test','localhost','?barcodeGrading=1',preview)).toBe(false);
});
