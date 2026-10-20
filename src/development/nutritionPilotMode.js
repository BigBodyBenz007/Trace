// Both guards matter: a query string can never enable production grading.
export function shouldLoadNutritionPilot(environment, hostname, search) {
  return environment === 'development'
    && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    && new URLSearchParams(search).get('nutritionPilot') === '1';
}
