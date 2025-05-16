import React, { useState, useEffect } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, ContentState, convertToRaw } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import '../styles/RichTextEditor.css';

const RichTextEditor = ({ initialContent = '', onChange }) => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  
  // Initialize editor with content if provided
  useEffect(() => {
    if (initialContent) {
      const blocksFromHtml = htmlToDraft(initialContent);
      const { contentBlocks, entityMap } = blocksFromHtml;
      const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);
      setEditorState(EditorState.createWithContent(contentState));
    }
  }, [initialContent]);
  
  const handleEditorChange = (state) => {
    setEditorState(state);
    
    // Convert content to HTML and pass to parent component
    const contentHtml = draftToHtml(convertToRaw(state.getCurrentContent()));
    onChange(contentHtml);
  };
  
  // Toolbar configuration
  const toolbarOptions = {
    options: ['inline', 'blockType', 'list', 'textAlign', 'link', 'emoji', 'image', 'history'],
    inline: {
      options: ['bold', 'italic', 'underline', 'strikethrough', 'monospace'],
    },
    blockType: {
      options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'Blockquote'],
    },
    list: {
      options: ['unordered', 'ordered', 'indent', 'outdent'],
    },
    textAlign: {
      options: ['left', 'center', 'right', 'justify'],
    },
  };
  
  return (
    <div className="rich-text-editor">
      <Editor
        editorState={editorState}
        onEditorStateChange={handleEditorChange}
        toolbar={toolbarOptions}
        editorClassName="editor-content"
        toolbarClassName="editor-toolbar"
        wrapperClassName="editor-wrapper"
        placeholder="Write your journal entry here..."
      />
    </div>
  );
};

export default RichTextEditor;
