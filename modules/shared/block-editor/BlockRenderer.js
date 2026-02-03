/**
 * BlockRenderer - Renders Editor.js block content to HTML
 * Handles both new JSON block format and legacy HTML content
 */

import React from 'react';

const BlockRenderer = ({ content, className = '' }) => {
  // Parse content - handle JSON, string JSON, or legacy HTML
  const parseContent = (content) => {
    if (!content) return { blocks: [], isLegacy: false };

    // Already parsed object with blocks
    if (typeof content === 'object' && content.blocks) {
      return { blocks: content.blocks, isLegacy: false };
    }

    // String content - try to parse as JSON
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (parsed.blocks) {
          return { blocks: parsed.blocks, isLegacy: false };
        }
      } catch (e) {
        // Not JSON - treat as legacy HTML content
        return { html: content, isLegacy: true };
      }
    }

    return { blocks: [], isLegacy: false };
  };

  const { blocks, html, isLegacy } = parseContent(content);

  // Render legacy HTML content
  if (isLegacy && html) {
    return (
      <div 
        className={`block-content legacy-content ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Render individual block
  const renderBlock = (block, index) => {
    const { type, data } = block;

    switch (type) {
      case 'paragraph':
        return (
          <p 
            key={index} 
            className="block-paragraph"
            dangerouslySetInnerHTML={{ __html: data.text }}
          />
        );

      case 'header':
        const HeadingTag = `h${data.level || 2}`;
        return (
          <HeadingTag 
            key={index} 
            className={`block-heading block-heading-${data.level || 2}`}
            dangerouslySetInnerHTML={{ __html: data.text }}
          />
        );

      case 'list':
        const ListTag = data.style === 'ordered' ? 'ol' : 'ul';
        return (
          <ListTag key={index} className="block-list">
            {data.items.map((item, i) => (
              <li 
                key={i} 
                className="block-list-item"
                dangerouslySetInnerHTML={{ __html: typeof item === 'string' ? item : item.content }}
              />
            ))}
          </ListTag>
        );

      case 'image':
        return (
          <figure key={index} className="block-image">
            <img 
              src={data.file?.url || data.url} 
              alt={data.caption || 'Article image'}
              className={`${data.withBorder ? 'with-border' : ''} ${data.stretched ? 'stretched' : ''}`}
              loading="lazy"
            />
            {data.caption && (
              <figcaption dangerouslySetInnerHTML={{ __html: data.caption }} />
            )}
          </figure>
        );

      case 'embed':
        return (
          <div key={index} className="block-embed">
            <iframe
              src={data.embed}
              width={data.width || '100%'}
              height={data.height || 400}
              frameBorder="0"
              allowFullScreen
              title={data.caption || 'Embedded content'}
            />
            {data.caption && <p className="block-embed-caption">{data.caption}</p>}
          </div>
        );

      case 'table':
        return (
          <div key={index} className="block-table-wrapper">
            <table className="block-table">
              <tbody>
                {data.content.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex === 0 && data.withHeadings ? 'table-head-row' : ''}>
                    {row.map((cell, cellIndex) => {
                      const CellTag = rowIndex === 0 && data.withHeadings ? 'th' : 'td';
                      return (
                        <CellTag 
                          key={cellIndex}
                          dangerouslySetInnerHTML={{ __html: cell }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'quote':
        return (
          <blockquote key={index} className="block-quote">
            <p dangerouslySetInnerHTML={{ __html: data.text }} />
            {data.caption && <cite>— {data.caption}</cite>}
          </blockquote>
        );

      case 'code':
        return (
          <pre key={index} className="block-code">
            <code>{data.code}</code>
          </pre>
        );

      case 'delimiter':
        return <hr key={index} className="block-delimiter" />;

      case 'warning':
        return (
          <div key={index} className="block-warning">
            {data.title && <div className="block-warning-title">{data.title}</div>}
            <div dangerouslySetInnerHTML={{ __html: data.message }} />
          </div>
        );

      case 'raw':
        return (
          <div 
            key={index} 
            className="block-raw"
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
        );

      default:
        if (data?.text) {
          return (
            <p 
              key={index}
              className="block-paragraph"
              dangerouslySetInnerHTML={{ __html: data.text }}
            />
          );
        }
        console.warn('Unknown block type:', type);
        return null;
    }
  };

  return (
    <>
      <div className={`block-content ${className}`}>
        {blocks.map((block, index) => renderBlock(block, index))}
      </div>

      <style jsx global>{`
        .block-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          font-size: 17px;
          line-height: 1.8;
          color: #333;
        }

        .block-paragraph {
          margin: 0 0 1.5em 0;
        }

        .block-paragraph:last-child {
          margin-bottom: 0;
        }

        .block-heading-2 {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 2em 0 0.75em 0;
          line-height: 1.3;
        }

        .block-heading-3 {
          font-size: 22px;
          font-weight: 600;
          color: #2a2a2a;
          margin: 1.75em 0 0.5em 0;
          line-height: 1.4;
        }

        .block-heading-4 {
          font-size: 18px;
          font-weight: 600;
          color: #3a3a3a;
          margin: 1.5em 0 0.5em 0;
          line-height: 1.4;
        }

        .block-content > .block-heading-2:first-child,
        .block-content > .block-heading-3:first-child,
        .block-content > .block-heading-4:first-child {
          margin-top: 0;
        }

        .block-list {
          margin: 1em 0 1.5em 0;
          padding-left: 1.5em;
        }

        .block-list .block-list {
          margin: 0.5em 0;
        }

        .block-list-item {
          margin: 0.5em 0;
          line-height: 1.6;
        }

        .block-image {
          margin: 2em 0;
          text-align: center;
        }

        .block-image img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          display: block;
          margin: 0 auto;
        }

        .block-image img.with-border {
          border: 1px solid #e0e0e0;
        }

        .block-image img.stretched {
          width: 100%;
        }

        .block-image figcaption {
          font-size: 14px;
          color: #666;
          margin-top: 12px;
          font-style: italic;
        }

        .block-embed {
          margin: 2em 0;
        }

        .block-embed iframe {
          display: block;
          max-width: 100%;
          border-radius: 8px;
          margin: 0 auto;
        }

        .block-embed-caption {
          font-size: 14px;
          color: #666;
          text-align: center;
          margin-top: 12px;
        }

        .block-table-wrapper {
          margin: 2em 0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .block-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 15px;
        }

        .block-table .table-head-row {
          background: #f5f5f5;
        }

        .block-table .table-head-row th {
          font-weight: 600;
          color: #333;
        }

        .block-table th,
        .block-table td {
          padding: 12px 16px;
          border: 1px solid #e0e0e0;
          text-align: left;
          vertical-align: top;
        }

        .block-quote {
          margin: 2em 0;
          padding: 1.5em 2em;
          border-left: 4px solid #055474;
          background: #f8f9fa;
          border-radius: 0 8px 8px 0;
        }

        .block-quote p {
          font-size: 19px;
          font-style: italic;
          color: #444;
          margin: 0 0 0.5em 0;
          line-height: 1.6;
        }

        .block-quote cite {
          font-size: 14px;
          color: #666;
          font-style: normal;
          display: block;
        }

        .block-code {
          margin: 2em 0;
          padding: 1.25em 1.5em;
          background: #1e1e1e;
          border-radius: 8px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .block-code code {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
          font-size: 14px;
          color: #d4d4d4;
          line-height: 1.6;
          white-space: pre;
        }

        .block-delimiter {
          border: none;
          text-align: center;
          margin: 3em 0;
        }

        .block-delimiter::before {
          content: '• • •';
          color: #ccc;
          font-size: 20px;
          letter-spacing: 12px;
        }

        .block-warning {
          margin: 2em 0;
          padding: 1.25em 1.5em;
          background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
          border-left: 4px solid #ff9800;
          border-radius: 0 8px 8px 0;
        }

        .block-warning-title {
          font-weight: 700;
          color: #e65100;
          margin-bottom: 0.5em;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .block-raw {
          margin: 2em 0;
        }

        /* Legacy HTML Content */
        .legacy-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }

        .legacy-content h1,
        .legacy-content h2,
        .legacy-content h3,
        .legacy-content h4 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          line-height: 1.3;
        }

        .legacy-content ul,
        .legacy-content ol {
          padding-left: 1.5em;
          margin: 1em 0;
        }

        .legacy-content blockquote {
          border-left: 4px solid #055474;
          padding-left: 1.5em;
          margin: 1.5em 0;
          font-style: italic;
          color: #555;
        }

        .legacy-content pre,
        .legacy-content code {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
        }

        .legacy-content pre {
          background: #f5f5f5;
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
        }

        .legacy-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
        }

        .legacy-content th,
        .legacy-content td {
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          text-align: left;
        }

        /* Inline formatting */
        .block-content mark,
        .legacy-content mark {
          background: rgba(255, 235, 59, 0.5);
          padding: 2px 0;
        }

        .block-content a,
        .legacy-content a {
          color: #055474;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .block-content a:hover,
        .legacy-content a:hover {
          color: #033a52;
        }

        .block-content strong,
        .legacy-content strong {
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .block-content {
            font-size: 16px;
          }

          .block-heading-2 {
            font-size: 24px;
          }

          .block-heading-3 {
            font-size: 20px;
          }

          .block-heading-4 {
            font-size: 17px;
          }

          .block-quote {
            padding: 1em 1.25em;
          }

          .block-quote p {
            font-size: 17px;
          }

          .block-code {
            padding: 1em;
          }

          .block-code code {
            font-size: 13px;
          }

          .block-table th,
          .block-table td {
            padding: 8px 12px;
          }
        }
      `}</style>
    </>
  );
};

export default BlockRenderer;
