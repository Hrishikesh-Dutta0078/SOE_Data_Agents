import React from 'react';
import remarkGfm from 'remark-gfm';

export const markdownRemarkPlugins = [remarkGfm];

function mergeClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

function withTag(tagName, className) {
  return function MarkdownTag({ children, className: incomingClassName, ...props }) {
    return React.createElement(
      tagName,
      { ...props, className: mergeClassNames(className, incomingClassName) },
      children,
    );
  };
}

function Strong({ children, style, ...props }) {
  return React.createElement(
    'strong',
    {
      ...props,
      style: { color: 'var(--color-text-primary)', ...style },
    },
    children,
  );
}

function Table({ children }) {
  return React.createElement(
    'div',
    { className: 'markdown-table-wrap' },
    React.createElement('table', { className: 'markdown-table' }, children),
  );
}

function Link({ children, className, ...props }) {
  return React.createElement(
    'a',
    {
      ...props,
      className: mergeClassNames('markdown-link', className),
      target: props.target || '_blank',
      rel: props.rel || 'noreferrer',
    },
    children,
  );
}

export const markdownComponents = {
  p: withTag('p', 'markdown-p'),
  ul: withTag('ul', 'markdown-list'),
  ol: withTag('ol', 'markdown-list markdown-list-ordered'),
  li: withTag('li', 'markdown-list-item'),
  strong: Strong,
  table: Table,
  thead: withTag('thead', 'markdown-table-head'),
  tbody: withTag('tbody', 'markdown-table-body'),
  tr: withTag('tr', 'markdown-table-row'),
  th: withTag('th', 'markdown-table-cell markdown-table-header-cell'),
  td: withTag('td', 'markdown-table-cell'),
  a: Link,
};
