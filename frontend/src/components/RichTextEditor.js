import React, { useState, useEffect } from 'react';
import { Editor, EditorState, ContentState, convertToRaw, RichUtils } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';
import 'draft-js/dist/Draft.css';
import '../styles/RichTextEditor.css';

const RichTextEditor = ({ initialContent = '', onChange }) => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  
  // Initialize editor with content if provided
  useEffect(() => {
    if (initialContent) {
      try {
        const blocksFromHtml = htmlToDraft(initialContent);
        const { contentBlocks, entityMap } = blocksFromHtml;
        const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);
        setEditorState(EditorState.createWithContent(contentState));
      } catch (error) {
        console.error('Error parsing HTML content:', error);
      }
    }
  }, [initialContent]);
  
  const handleEditorChange = (state) => {
    setEditorState(state);
    
    // Convert content to HTML and pass to parent component
    const contentHtml = draftToHtml(convertToRaw(state.getCurrentContent()));
    onChange(contentHtml);
  };
  
<<<<<<< HEAD
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
      inDropdown: false,
      options: ['left', 'center', 'right', 'justify'],
    },
=======
  // Handle keyboard shortcuts
  const handleKeyCommand = (command, state) => {
    const newState = RichUtils.handleKeyCommand(state, command);
    if (newState) {
      handleEditorChange(newState);
      return 'handled';
    }
    return 'not-handled';
  };
  
  // Simple toolbar buttons
  const handleBoldClick = () => {
    handleEditorChange(RichUtils.toggleInlineStyle(editorState, 'BOLD'));
  };
  
  const handleItalicClick = () => {
    handleEditorChange(RichUtils.toggleInlineStyle(editorState, 'ITALIC'));
  };
  
  const handleUnderlineClick = () => {
    handleEditorChange(RichUtils.toggleInlineStyle(editorState, 'UNDERLINE'));
>>>>>>> dd533ea (fixed calendar)
  };
  
  // Fix for cursor position - use minimal styling that won't affect cursor
  const editorStyle = {
    textAlign: 'left',
  };
  
  return (
<<<<<<< HEAD
    <div className="rich-text-editor">
      <Editor
        editorState={editorState}
        onEditorStateChange={handleEditorChange}
        toolbar={toolbarOptions}
        editorClassName="editor-content"
        toolbarClassName="editor-toolbar"
        wrapperClassName="editor-wrapper"
        placeholder="Write your journal entry here..."
        editorStyle={editorStyle}
        stripPastedStyles={false}
        spellCheck={true}
        preserveSelectionOnBlur={true}
      />
=======
    <div className="simple-rich-editor">
      <div className="editor-toolbar">
        <button type="button" onClick={handleBoldClick} className="toolbar-button">
          <strong>B</strong>
        </button>
        <button type="button" onClick={handleItalicClick} className="toolbar-button">
          <em>I</em>
        </button>
        <button type="button" onClick={handleUnderlineClick} className="toolbar-button">
          <u>U</u>
        </button>
      </div>
      <div className="editor-container">
        <Editor
          editorState={editorState}
          onChange={handleEditorChange}
          handleKeyCommand={handleKeyCommand}
          placeholder="Write your journal entry here..."
          spellCheck={true}
        />
      </div>
>>>>>>> dd533ea (fixed calendar)
    </div>
  );
};

export default RichTextEditor;
