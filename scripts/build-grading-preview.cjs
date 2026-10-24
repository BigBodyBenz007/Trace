// Existing Vercel build entry. Preserve Preview markers for diagnostics;
// normal production and development now expose the reviewed experimental UI.
const { spawnSync } = require('node:child_process');
const PREVIEW_BRANCH = 'preview/iphone-food-grading-20261022';
function gradingBuildEnvironment(env) {
  const enabled = env.VERCEL_ENV === 'preview'
    && env.VERCEL_GIT_COMMIT_REF === PREVIEW_BRANCH;
  return Object.assign({}, env, {
    REACT_APP_TRACE_DEPLOYMENT_ENV: env.VERCEL_ENV || '',
    REACT_APP_TRACE_GRADING_PREVIEW: enabled ? 'true' : 'false',
  });
}
if (require.main === module) {
  const env = gradingBuildEnvironment(process.env);
  console.log('Experimental barcode grading enabled in normal production; Preview protection is unchanged.');
  const result = spawnSync(process.execPath, [require.resolve('react-scripts/scripts/build')], { stdio: 'inherit', env });
  if (result.error) throw result.error;
  process.exitCode = result.status === null ? 1 : result.status;
}
module.exports = { gradingBuildEnvironment, PREVIEW_BRANCH };
