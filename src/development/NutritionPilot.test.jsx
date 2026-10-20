import { fireEvent, render, screen, within } from '@testing-library/react';
import NutritionPilot from './NutritionPilot';
import { shouldLoadNutritionPilot } from './nutritionPilotMode';
import { PROFILES } from './updatedNutritionFixtures';

test.each(['production', 'test', undefined])('URL flags cannot enable public grading in %s', environment => {
  expect(shouldLoadNutritionPilot(environment, 'localhost', '?nutritionPilot=1')).toBe(false);
});
test('requires development, loopback and opt-in', () => {
  expect(shouldLoadNutritionPilot('development', 'localhost', '?nutritionPilot=1')).toBe(true);
  expect(shouldLoadNutritionPilot('development', '127.0.0.1', '?nutritionPilot=1')).toBe(true);
  expect(shouldLoadNutritionPilot('development', 'example.com', '?nutritionPilot=1')).toBe(false);
  expect(shouldLoadNutritionPilot('development', 'localhost', '')).toBe(false);
});

test('whole-number nutrition and visible source confidence remain separate from additive risk', () => {
  render(<NutritionPilot />);
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('84/100');
  expect(screen.queryByText('Nutri-Score A')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Source and formulation confidence')).toBeVisible();
  expect(screen.getByLabelText('Source and formulation confidence')).toHaveTextContent('Current shelf / barcode match unconfirmed');
  expect(screen.getByText(/does not mean perfect health/)).toBeVisible();
  expect(screen.getByRole('link', { name: /Additive assessment incomplete/ })).toBeVisible();
  expect(screen.getByText('Provider additive list unknown')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Use This Food/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Return to Trace' })).toHaveAttribute('href', '/');
});

test('real ingredient disclosure starts collapsed and preserves original text', () => {
  render(<NutritionPilot />);
  const ingredients = screen.getByRole('region', { name: 'Ingredients and additives' });
  const button = within(ingredients).getByRole('button', { name: 'Ingredients' });
  expect(button).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(button);
  expect(screen.getByRole('region', { name: 'Ingredient text' })).toHaveTextContent('Grade A Pasteurized Skimmed Milk');
  fireEvent.click(button); expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('provider-empty and reported names never become risk assessments', () => {
  render(<NutritionPilot />);
  const select = screen.getByLabelText('Food or test profile');
  fireEvent.change(select, { target: { value: 'provider-empty-additives' } });
  expect(screen.getByText('Provider reports an empty additive list')).toBeVisible();
  expect(screen.getByText(/Combined rating unavailable:/)).not.toBeVisible();
  fireEvent.change(select, { target: { value: 'reported-additives' } });
  expect(screen.getByText('3 provider-reported identifiers')).toBeVisible();
  fireEvent.click(screen.getByText('View reported additives'));
  expect(screen.getByText(/Name not in the verified reference/)).toBeInTheDocument();
});

test('missing added sugars do not block the total-sugar method', () => {
  render(<NutritionPilot />);
  fireEvent.change(screen.getByLabelText('Food or test profile'), { target: { value: 'missing-added-sugar' } });
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('83/100');
  fireEvent.change(screen.getByLabelText('Food or test profile'), { target: { value: 'conflicting-panels' } });
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('Not available');
  expect(within(screen.getByRole('region', { name: 'Nutrition assessment' })).getByText(/Unresolved source\/panel conflicts/)).toBeVisible();
});

test('synthetic legacy composite cannot consume experimental numerical scores', () => {
  render(<NutritionPilot />);
  fireEvent.change(screen.getByLabelText('Food or test profile'), { target: { value: 'reviewed-composite' } });
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('83/100');
  expect(screen.getByText(/Combined rating unavailable:/)).toHaveTextContent('no combined method is defined');
  expect(screen.queryByLabelText('Combined rating')).not.toBeInTheDocument();
  expect(screen.getByText('Synthetic control; no real product assessment.')).toBeVisible();
});

test('water special rating does not invent raw nutrient points', () => {
  render(<NutritionPilot />);
  fireEvent.change(screen.getByLabelText('Food or test profile'), { target: { value: 'water' } });
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('100/100');
  expect(screen.getByText(/highest beverage band/)).toBeVisible();
});

test('technical details start collapsed while source confidence is visible', () => {
  render(<NutritionPilot />);
  for (const label of ['Nutrition & calculation', 'Sources & product match', 'Method & limitations']) {
    expect(screen.getByText(label)).toBeVisible();
  }
  expect(screen.getByText(/Declared basis:/)).not.toBeVisible();
  expect(screen.getByText(/Barcode match: not established by this preview/)).not.toBeVisible();
  expect(screen.getByText(/Version: /)).not.toBeVisible();
  expect(screen.getByLabelText('Source and formulation confidence')).toBeVisible();
  expect(screen.getByText(/Compare 18 observations/)).toBeVisible();
  fireEvent.click(screen.getByText('Sources & product match'));
  expect(screen.getByText(/Barcode match: not established by this preview/)).toBeVisible();
});

test('theme selection changes local state and restores prior theme', () => {
  document.documentElement.dataset.traceShellTheme = 'river';
  const view = render(<NutritionPilot />);
  fireEvent.change(screen.getByLabelText('Preview theme'), { target: { value: 'gnome-village' } });
  expect(document.documentElement.dataset.traceShellTheme).toBe('gnome-village');
  view.unmount(); expect(document.documentElement.dataset.traceShellTheme).toBe('river');
});

test('updated category handling distinguishes oil and diet beverages without risk claims', () => {
  render(<NutritionPilot />);
  const select = screen.getByLabelText('Food or test profile');
  fireEvent.change(select, { target: { value: 'olive-oil' } });
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('66/100');
  expect(screen.queryByText('Nutri-Score B')).not.toBeInTheDocument();
  fireEvent.change(select, { target: { value: 'diet-soda' } });
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('52/100');
  expect(screen.getByText(/this is not a toxicity assessment/)).toBeVisible();
});

test('unknown shelf evidence stays visible even when an observation is calculable', () => {
  render(<NutritionPilot />);
  fireEvent.change(screen.getByLabelText('Food or test profile'), { target: { value: 'plain-almonds' } });
  expect(screen.getByLabelText('Source and formulation confidence')).toHaveTextContent('exact formulation match incomplete');
  fireEvent.change(screen.getByLabelText('Food or test profile'), { target: { value: 'fresh-apple' } });
  expect(screen.getByLabelText('Source and formulation confidence')).toHaveTextContent('USDA generic composition');
});

test('unresolved fruit proportions withhold a precise sweetened-yogurt score', () => {
  render(<NutritionPilot />);
  fireEvent.change(screen.getByLabelText('Food or test profile'), { target: { value: 'sweetened-yogurt' } });
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('Not available');
  expect(screen.getByLabelText('Possible nutrition score')).toHaveTextContent('80–85/100');
  fireEvent.click(screen.getByText('Method & limitations'));
  expect(screen.getByRole('link', { name: 'Official updated rules' })).toHaveAttribute('href', expect.stringContaining('FAQ-updatedAlgo-V11.pdf'));
  expect(screen.getByText(/Identical raw points and categories/)).toBeVisible();
});

test('source conflicts take precedence over an archived market match claim', () => {
  render(<NutritionPilot />);
  fireEvent.change(screen.getByLabelText('Food or test profile'), { target: { value: 'refined-cereal-rice-krispies' } });
  expect(screen.getByLabelText('Source and formulation confidence')).toHaveTextContent('Unresolved source / panel conflict');
  expect(screen.getByLabelText('Nutrition rating')).toHaveTextContent('Not available');
});

test('every profile, including expandable content, excludes letter ratings', () => {
  render(<NutritionPilot />);
  for (const profile of PROFILES) {
    fireEvent.change(screen.getByLabelText('Food or test profile'), { target: { value: profile.id } });
    expect(screen.getByRole('main')).not.toHaveTextContent(/Nutri-Score [A-E]\b|Letter:|A=90|A to E|same letter|A\/B/);
  }
});

test('comparison retains the prior linear scores beside revised category calibration', () => {
  render(<NutritionPilot />);
  fireEvent.click(screen.getByText(/Compare 18 observations/));
  expect(screen.getByRole('row', { name: /^Pepsi .*56 18 / })).toBeVisible();
});
