import { fireEvent, render, screen, within } from '@testing-library/react';
import NutritionPilot from './NutritionPilot';

const open = () => fireEvent.click(screen.getByText('Try a USDA produce estimate'));
const choose = () => { fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Use generic produce estimate' })); };
test('unknown barcode requires deliberate confirmation and leaves the existing observation unchanged', () => {
  render(<NutritionPilot />); open();
  expect(screen.getByRole('button', { name: 'Use generic produce estimate' })).toBeDisabled();
  expect(screen.queryByLabelText('USDA produce estimate')).not.toBeInTheDocument();
  choose();
  expect(screen.getByLabelText('Generic nutrition rating')).toHaveTextContent('82/100');
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('84/100');
  const estimate = screen.getByLabelText('USDA produce estimate');
  expect(estimate).toHaveTextContent('Product identity remains unverified');
  expect(estimate).toHaveTextContent('Package ingredients: unknown. Package additives: unknown');
  expect(within(estimate).getByRole('link')).toHaveAttribute('href', expect.stringContaining('171688'));
  expect(screen.getByText(/Public grade=null; scoreReady=false/)).toBeInTheDocument();
});
test('changing generic reference invalidates confirmation; Gala remains unresolved', () => {
  render(<NutritionPilot />); open(); choose();
  fireEvent.change(screen.getByLabelText('Generic USDA reference'), { target: { value: 'produce-1750341' } });
  expect(screen.queryByLabelText('Generic nutrition rating')).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox')).not.toBeChecked(); choose();
  expect(screen.getByLabelText('Generic nutrition rating')).toHaveTextContent('Not available');
  expect(screen.getByLabelText('USDA produce estimate')).toHaveTextContent('Cultivar-specific USDA reference: gala');
  expect(screen.getByLabelText('USDA produce estimate')).toHaveTextContent('totalSugar is unknown');
});
test.each([['produce-173944', '81/100'], ['produce-170379', '87/100'], ['produce-170393', 'Not available']])('preview %s preserves available and missing results', (id, score) => {
  render(<NutritionPilot />); open();
  fireEvent.change(screen.getByLabelText('Generic USDA reference'), { target: { value: id } }); choose();
  expect(screen.getByLabelText('Generic nutrition rating')).toHaveTextContent(score);
  fireEvent.click(screen.getByRole('button', { name: 'Clear generic selection' }));
  expect(screen.queryByLabelText('USDA produce estimate')).not.toBeInTheDocument();
});
