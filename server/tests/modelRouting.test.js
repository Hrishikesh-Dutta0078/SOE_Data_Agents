const test = require('node:test');
const assert = require('node:assert/strict');
const { MODEL_PROFILES, COST_RATES } = require('../config/constants');

test('GPT profile exists in MODEL_PROFILES', () => {
  assert.ok(MODEL_PROFILES.gpt, 'GPT profile should exist');
  assert.equal(MODEL_PROFILES.gpt.provider, 'openai');
  assert.equal(MODEL_PROFILES.gpt.modelNameEnv, 'AZURE_OPENAI_MODEL_NAME');
  assert.equal(MODEL_PROFILES.gpt.defaultModelName, 'gpt-5.4');
  assert.equal(MODEL_PROFILES.gpt.endpointEnv, 'AZURE_OPENAI_ENDPOINT');
  assert.equal(MODEL_PROFILES.gpt.apiKeyEnv, 'AZURE_OPENAI_API_KEY');
});

test('GPT cost rates exist in COST_RATES', () => {
  assert.ok(COST_RATES.gpt, 'GPT cost rates should exist');
  assert.equal(typeof COST_RATES.gpt.input, 'number');
  assert.equal(typeof COST_RATES.gpt.cachedInput, 'number');
  assert.equal(typeof COST_RATES.gpt.output, 'number');
});

test('extractInstanceName extracts Azure instance from endpoint', () => {
  const llm = require('../config/llm');
  const extractInstanceName = llm.__testables?.extractInstanceName;

  assert.ok(extractInstanceName, 'extractInstanceName should be exported for testing');

  assert.equal(
    extractInstanceName('https://hrish-m9gvbn6u-eastus2.cognitiveservices.azure.com/'),
    'hrish-m9gvbn6u-eastus2'
  );

  assert.equal(
    extractInstanceName('https://my-instance.openai.azure.com/'),
    'my-instance'
  );

  assert.equal(
    extractInstanceName('invalid-url'),
    ''
  );
});
