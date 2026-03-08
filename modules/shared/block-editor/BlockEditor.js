import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './BlockEditor.module.css';

// Editor.js and plugins - dynamic import to avoid SSR issues
let EditorJS = null;
let Header = null;
let List = null;
let ImageTool = null;
let Embed = null;
let Table = null;
let Quote = null;
let Code = null;
let Delimiter = null;
let Warning = null;
let Paragraph = null;
let InlineCode = null;
let Marker = null;
let Underline = null;

const BlockEditor = ({
  value = null,
  onChange,
  placeholder = 'Start writing your content...',
  readOnly = false,
  minHeight = 400,
  onReady = null,
  imageUploadEndpoint = '/api/upload/image',
  className = '',
}) => {
  const editorRef = useRef(null);
  const editorInstance = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const isInitializing = useRef(false);

  // Parse initial value - handle both JSON and HTML legacy content
  const parseInitialData = useCallback((val) => {
    if (!val) {
      return { blocks: [] };
    }

    // If it's already an object with blocks, use it
    if (typeof val === 'object' && val.blocks) {
      return val;
    }

    // If it's a JSON string, parse it
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (parsed.blocks) {
          return parsed;
        }
      } catch (e) {
        // Not JSON, treat as HTML legacy content
        // Convert HTML to a single paragraph block for backward compatibility
        if (val.trim()) {
          return {
            blocks: [{
              type: 'paragraph',
              data: {
                text: val // Keep HTML, will render correctly
              }
            }]
          };
        }
      }
    }

    return { blocks: [] };
  }, []);

  // Calculate word count from blocks
  const calculateWordCount = useCallback((blocks) => {
    if (!blocks || !Array.isArray(blocks)) return 0;
    
    let text = '';
    blocks.forEach(block => {
      if (block.data) {
        if (block.data.text) {
          text += ' ' + block.data.text.replace(/<[^>]*>/g, '');
        }
        if (block.data.items) {
          block.data.items.forEach(item => {
            text += ' ' + (typeof item === 'string' ? item : item.content || '').replace(/<[^>]*>/g, '');
          });
        }
        if (block.data.caption) {
          text += ' ' + block.data.caption.replace(/<[^>]*>/g, '');
        }
      }
    });
    
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }, []);

  // Initialize Editor.js
  useEffect(() => {
    const initEditor = async () => {
      if (isInitializing.current || editorInstance.current) return;
      isInitializing.current = true;

      try {
        // Dynamic imports for SSR compatibility
        const EditorJSModule = await import('@editorjs/editorjs');
        const HeaderModule = await import('@editorjs/header');
        const ListModule = await import('@editorjs/list');
        const ImageModule = await import('@editorjs/image');
        const EmbedModule = await import('@editorjs/embed');
        const TableModule = await import('@editorjs/table');
        const QuoteModule = await import('@editorjs/quote');
        const CodeModule = await import('@editorjs/code');
        const DelimiterModule = await import('@editorjs/delimiter');
        const WarningModule = await import('@editorjs/warning');
        const ParagraphModule = await import('@editorjs/paragraph');
        const InlineCodeModule = await import('@editorjs/inline-code');
        const MarkerModule = await import('@editorjs/marker');
        const UnderlineModule = await import('@editorjs/underline');

        EditorJS = EditorJSModule.default;
        Header = HeaderModule.default;
        List = ListModule.default;
        ImageTool = ImageModule.default;
        Embed = EmbedModule.default;
        Table = TableModule.default;
        Quote = QuoteModule.default;
        Code = CodeModule.default;
        Delimiter = DelimiterModule.default;
        Warning = WarningModule.default;
        Paragraph = ParagraphModule.default;
        InlineCode = InlineCodeModule.default;
        Marker = MarkerModule.default;
        Underline = UnderlineModule.default;

        if (!editorRef.current) {
          isInitializing.current = false;
          return;
        }

        const initialData = parseInitialData(value);

        editorInstance.current = new EditorJS({
          holder: editorRef.current,
          readOnly: readOnly,
          placeholder: placeholder,
          minHeight: minHeight,
          data: initialData,
          
          tools: {
            paragraph: {
              class: Paragraph,
              inlineToolbar: true,
              config: {
                placeholder: 'Start typing or press Tab to add a block...'
              }
            },
            header: {
              class: Header,
              inlineToolbar: true,
              config: {
                placeholder: 'Enter a heading',
                levels: [2, 3, 4],
                defaultLevel: 2
              }
            },
            list: {
              class: List,
              inlineToolbar: true,
              config: {
                defaultStyle: 'unordered'
              }
            },
            image: {
              class: ImageTool,
              config: {
                uploader: {
                  uploadByFile: async (file) => {
                    // Create FormData and upload
                    const formData = new FormData();
                    formData.append('image', file);
                    
                    try {
                      const response = await fetch(imageUploadEndpoint, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        return {
                          success: 1,
                          file: {
                            url: data.url || data.path || data.imageUrl
                          }
                        };
                      }
                    } catch (err) {
                      console.error('Image upload failed:', err);
                    }
                    
                    // Fallback to data URL if upload fails
                    return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        resolve({
                          success: 1,
                          file: {
                            url: e.target.result
                          }
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                  },
                  uploadByUrl: async (url) => {
                    return {
                      success: 1,
                      file: { url }
                    };
                  }
                },
                captionPlaceholder: 'Enter image caption'
              }
            },
            embed: {
              class: Embed,
              config: {
                services: {
                  youtube: true,
                  vimeo: true,
                  instagram: true,
                  twitter: true,
                  facebook: true
                }
              }
            },
            table: {
              class: Table,
              inlineToolbar: true,
              config: {
                rows: 2,
                cols: 3
              }
            },
            quote: {
              class: Quote,
              inlineToolbar: true,
              config: {
                quotePlaceholder: 'Enter a quote',
                captionPlaceholder: 'Quote author'
              }
            },
            code: {
              class: Code,
              config: {
                placeholder: 'Enter code...'
              }
            },
            delimiter: Delimiter,
            warning: {
              class: Warning,
              inlineToolbar: true,
              config: {
                titlePlaceholder: 'Title',
                messagePlaceholder: 'Message'
              }
            },
            inlineCode: {
              class: InlineCode
            },
            marker: {
              class: Marker
            },
            underline: Underline
          },

          onChange: async () => {
            if (editorInstance.current && onChange) {
              try {
                const outputData = await editorInstance.current.save();
                setBlockCount(outputData.blocks?.length || 0);
                setWordCount(calculateWordCount(outputData.blocks));
                onChange(outputData);
              } catch (err) {
                console.error('Error saving editor content:', err);
              }
            }
          },

          onReady: () => {
            setIsReady(true);
            const data = parseInitialData(value);
            setBlockCount(data.blocks?.length || 0);
            setWordCount(calculateWordCount(data.blocks));
            if (onReady) onReady();
          }
        });

      } catch (err) {
        console.error('Failed to initialize Editor.js:', err);
        isInitializing.current = false;
      }
    };

    initEditor();

    return () => {
      if (editorInstance.current && editorInstance.current.destroy) {
        editorInstance.current.destroy();
        editorInstance.current = null;
        isInitializing.current = false;
      }
    };
  }, []);

  // Reading time calculation (200 words per minute)
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className={`${styles.blockEditorWrapper} ${className}`}>
      {/* Toolbar info */}
      <div className={styles.editorHeader}>
        <div className={styles.editorTitle}>
          <span className={styles.editorIcon}>✏️</span>
          Block Editor
          {!isReady && <span className={styles.loadingBadge}>Loading...</span>}
        </div>
        <div className={styles.editorStats}>
          <span className={styles.stat}>
            <i className="fas fa-cube"></i> {blockCount} blocks
          </span>
          <span className={styles.stat}>
            <i className="fas fa-font"></i> {wordCount} words
          </span>
          <span className={styles.stat}>
            <i className="fas fa-clock"></i> {readingTime} min read
          </span>
        </div>
      </div>

      {/* Editor container */}
      <div 
        ref={editorRef} 
        className={styles.editorContainer}
        style={{ minHeight: `${minHeight}px` }}
      />

      {/* Help text */}
      <div className={styles.editorFooter}>
        <span className={styles.helpText}>
          Press <kbd>Tab</kbd> or click <kbd>+</kbd> to add blocks • 
          Select text for formatting options • 
          Drag blocks to reorder
        </span>
      </div>
    </div>
  );
};

export default BlockEditor;
