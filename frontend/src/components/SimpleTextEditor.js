import React, { useState } from 'react';
import '../styles/SimpleTextEditor.css';

const SimpleTextEditor = ({ initialContent = '', onChange }) => {
  const [content, setContent] = useState(initialContent);

  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    onChange(newContent);
  };

  return (
    <div className="simple-text-editor">
      <textarea
        value={content}
        onChange={handleChange}
        className="editor-textarea"
        placeholder="Write your journal entry here..."
        rows={10}
      />
    </div>
  );
};

export default SimpleTextEditor;
