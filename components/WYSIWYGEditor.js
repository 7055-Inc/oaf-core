import React, { useState, useEffect, useRef } from 'react';
import styles from './WYSIWYGEditor.module.css';

const WYSIWYGEditor = ({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  title = 'Content Editor',
  height = 400,
  readOnly = false,
  showPreview = true,
  showFullscreen = true,
  showWordCount = true,
  allowImageUpload = true,
  imageUploadPath = '/api/upload/image',
  onImageUpload = null,
  className = '',
  ...props
}) => {
  const [content, setContent] = useState(value);
  const [isPreview, setIsPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const editorRef = useRef(null);

  // Update content when value prop changes
  useEffect(() => {
    if (value !== content) {
      setContent(value);
    }
  }, [value]);

  // Calculate word count, character count, and reading time
  useEffect(() => {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const words = plainText.split(/\s+/).filter(word => word.length > 0);
    const characters = plainText.length;
    const estimatedReadingTime = Math.max(1, Math.ceil(words.length / 200));

    setWordCount(words.length);
    setCharCount(characters);
    setReadingTime(estimatedReadingTime);
  }, [content]);

  // Handle content change
  const handleContentChange = (newContent) => {
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  };

  // Get current selection in textarea
  const getSelection = () => {
    if (editorRef.current) {
      return {
        start: editorRef.current.selectionStart,
        end: editorRef.current.selectionEnd
      };
    }
    return { start: 0, end: 0 };
  };

  // Set selection in textarea
  const setSelection = (start, end) => {
    if (editorRef.current) {
      editorRef.current.setSelectionRange(start, end);
      editorRef.current.focus();
    }
  };

  // Insert text at cursor position
  const insertText = (text) => {
    const selection = getSelection();
    const newContent = content.substring(0, selection.start) + text + content.substring(selection.end);
    handleContentChange(newContent);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      setSelection(selection.start + text.length, selection.start + text.length);
    }, 0);
  };

  // Wrap selected text with tags
  const wrapSelection = (startTag, endTag) => {
    const selection = getSelection();
    const selectedText = content.substring(selection.start, selection.end);
    
    if (selectedText) {
      const wrappedText = startTag + selectedText + endTag;
      const newContent = content.substring(0, selection.start) + wrappedText + content.substring(selection.end);
      handleContentChange(newContent);
      
      // Select the wrapped text
      setTimeout(() => {
        setSelection(selection.start + startTag.length, selection.start + startTag.length + selectedText.length);
      }, 0);
    } else {
      // No selection, just insert the tags
      insertText(startTag + endTag);
      setTimeout(() => {
        setSelection(selection.start + startTag.length, selection.start + startTag.length);
      }, 0);
    }
  };

  // Format text with various options
  const applyFormat = (format) => {
    switch (format) {
      case 'bold':
        wrapSelection('<strong>', '</strong>');
        break;
      case 'italic':
        wrapSelection('<em>', '</em>');
        break;
      case 'underline':
        wrapSelection('<u>', '</u>');
        break;
      case 'h1':
        wrapSelection('<h1>', '</h1>');
        break;
      case 'h2':
        wrapSelection('<h2>', '</h2>');
        break;
      case 'h3':
        wrapSelection('<h3>', '</h3>');
        break;
      case 'h4':
        wrapSelection('<h4>', '</h4>');
        break;
      case 'p':
        wrapSelection('<p>', '</p>');
        break;
      case 'blockquote':
        wrapSelection('<blockquote>', '</blockquote>');
        break;
      case 'code':
        wrapSelection('<code>', '</code>');
        break;
      case 'ul':
        insertText('<ul>\n  <li></li>\n</ul>');
        break;
      case 'ol':
        insertText('<ol>\n  <li></li>\n</ol>');
        break;
      case 'li':
        wrapSelection('<li>', '</li>');
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          wrapSelection(`<a href="${url}">`, '</a>');
        }
        break;
      case 'hr':
        insertText('<hr />');
        break;
      case 'br':
        insertText('<br />');
        break;
      default:
        console.warn('Unknown format:', format);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Image file size must be less than 5MB');
      return;
    }

    try {
      let imageUrl;
      
      if (onImageUpload) {
        imageUrl = await onImageUpload(file);
      } else {
        // For now, create a data URL for the image
        imageUrl = URL.createObjectURL(file);
        console.warn('Image upload endpoint not available, using local URL');
      }

      const alt = prompt('Enter alt text for the image:') || 'Image';
      const imageHtml = `<img src="${imageUrl}" alt="${alt}" style="max-width: 100%; height: auto;" />`;
      insertText(imageHtml);

    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  // Toggle preview mode
  const togglePreview = () => {
    setIsPreview(!isPreview);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isFullscreen]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
        case 'k':
          e.preventDefault();
          applyFormat('link');
          break;
        default:
          break;
      }
    }
  };

  return (
    <div 
      className={`${styles.editorContainer} ${className} ${isFullscreen ? styles.fullscreen : ''}`}
      {...props}
    >
      {/* Editor Header */}
      <div className={styles.editorHeader}>
        <div className={styles.editorTitle}>
          <h4>{title}</h4>
        </div>
        <div className={styles.editorControls}>
          {showPreview && (
            <button
              type="button"
              onClick={togglePreview}
              className={`${styles.controlButton} ${isPreview ? styles.active : ''}`}
              title="Toggle Preview"
            >
              {isPreview ? '📝' : '👁️'}
            </button>
          )}
          {showFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className={styles.controlButton}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? '🗗' : '⛶'}
            </button>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className={styles.editorContent} style={{ minHeight: height }}>
        {!isPreview ? (
          <div className={styles.editorWrapper}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className={styles.toolbarGroup}>
                <button 
                  type="button" 
                  onClick={() => applyFormat('bold')} 
                  className={styles.toolbarButton} 
                  title="Bold (Ctrl+B)"
                >
                  <strong>B</strong>
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('italic')} 
                  className={styles.toolbarButton} 
                  title="Italic (Ctrl+I)"
                >
                  <em>I</em>
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('underline')} 
                  className={styles.toolbarButton} 
                  title="Underline (Ctrl+U)"
                >
                  <u>U</u>
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('code')} 
                  className={styles.toolbarButton} 
                  title="Code"
                >
                  {'</>'}
                </button>
              </div>
              
              <div className={styles.toolbarGroup}>
                <button 
                  type="button" 
                  onClick={() => applyFormat('h1')} 
                  className={styles.toolbarButton} 
                  title="Heading 1"
                >
                  H1
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('h2')} 
                  className={styles.toolbarButton} 
                  title="Heading 2"
                >
                  H2
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('h3')} 
                  className={styles.toolbarButton} 
                  title="Heading 3"
                >
                  H3
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('h4')} 
                  className={styles.toolbarButton} 
                  title="Heading 4"
                >
                  H4
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('p')} 
                  className={styles.toolbarButton} 
                  title="Paragraph"
                >
                  P
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('blockquote')} 
                  className={styles.toolbarButton} 
                  title="Blockquote"
                >
                  ❝
                </button>
              </div>
              
              <div className={styles.toolbarGroup}>
                <button 
                  type="button" 
                  onClick={() => applyFormat('ul')} 
                  className={styles.toolbarButton} 
                  title="Bullet List"
                >
                  ☰
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('ol')} 
                  className={styles.toolbarButton} 
                  title="Numbered List"
                >
                  ≡
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('li')} 
                  className={styles.toolbarButton} 
                  title="List Item"
                >
                  •
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('link')} 
                  className={styles.toolbarButton} 
                  title="Link (Ctrl+K)"
                >
                  🔗
                </button>
              </div>
              
              <div className={styles.toolbarGroup}>
                <button 
                  type="button" 
                  onClick={() => applyFormat('hr')} 
                  className={styles.toolbarButton} 
                  title="Horizontal Rule"
                >
                  ⎯
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormat('br')} 
                  className={styles.toolbarButton} 
                  title="Line Break"
                >
                  ↵
                </button>
              </div>
              
              {allowImageUpload && (
                <div className={styles.toolbarGroup}>
                  <label className={styles.toolbarButton} title="Insert Image">
                    📷
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Text Editor */}
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.editor}
              placeholder={placeholder}
              readOnly={readOnly}
              style={{ 
                height: height - 60,
                minHeight: '200px',
                resize: 'vertical'
              }}
            />
          </div>
        ) : (
          <div className={styles.previewContainer}>
            <div className={styles.previewContent}>
              <div
                className={styles.previewHTML}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer */}
      {showWordCount && (
        <div className={styles.editorFooter}>
          <div className={styles.statistics}>
            <span className={styles.statItem}>
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
            <span className={styles.statItem}>
              {charCount} character{charCount !== 1 ? 's' : ''}
            </span>
            <span className={styles.statItem}>
              {readingTime} min read
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WYSIWYGEditor; 