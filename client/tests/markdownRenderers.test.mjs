import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { renderToStaticMarkup } from 'react-dom/server';
import { markdownComponents, markdownRemarkPlugins } from '../src/utils/markdownRenderers.js';

test('renders markdown tables as structured HTML', () => {
  const markdown = [
    '| Deal | Status |',
    '| --- | --- |',
    '| Active Profiles | On Track |',
  ].join('\n');

  const html = renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { components: markdownComponents, remarkPlugins: markdownRemarkPlugins },
      markdown,
    ),
  );

  assert.match(html, /<table/);
  assert.match(html, /<th[^>]*>Deal<\/th>/);
  assert.match(html, /<td[^>]*>On Track<\/td>/);
  assert.doesNotMatch(html, /\|\s*Deal\s*\|/);
});
