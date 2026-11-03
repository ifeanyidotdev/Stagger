import React from 'react';

// Fast regex tokenizer for code syntax highlighting
const tokenRegex = /(\/\/[^\n]*|\/\*.*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:import|export|from|as|default|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|interface|type|extends|implements|public|private|protected|readonly|static|async|await|try|catch|finally|throw|new|this|super|typeof|instanceof|void|null|undefined|true|false|boolean|number|string|any|unknown|never|symbol|bigint|def|fn|pub|struct|enum|impl|use|mod|mut|match|trait|where)\b)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())|(\b[A-Z][a-zA-Z0-9_$]*\b)|(<\/?[a-zA-Z0-9_$]+(?=[\s\/>]))|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)|([=><!~?&|+\-*\/%^:]+)|([{}()[\];,])/g;

export const highlightCodeLine = (line: string): React.ReactNode => {
  if (!line) return <span> </span>;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex index
  tokenRegex.lastIndex = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <span key={`plain-${lastIndex}`}>
          {line.slice(lastIndex, match.index)}
        </span>
      );
    }

    const [full, comment, str, keyword, num, fnCall, typeName, jsxTag, ident, op, punct] = match;
    const key = `tok-${match.index}`;

    if (comment) {
      elements.push(<span key={key} className="syn-comment">{comment}</span>);
    } else if (str) {
      elements.push(<span key={key} className="syn-string">{str}</span>);
    } else if (keyword) {
      elements.push(<span key={key} className="syn-keyword">{keyword}</span>);
    } else if (num) {
      elements.push(<span key={key} className="syn-number">{num}</span>);
    } else if (fnCall) {
      elements.push(<span key={key} className="syn-function">{fnCall}</span>);
    } else if (typeName) {
      elements.push(<span key={key} className="syn-type">{typeName}</span>);
    } else if (jsxTag) {
      elements.push(<span key={key} className="syn-tag">{jsxTag}</span>);
    } else if (ident) {
      elements.push(<span key={key} className="syn-ident">{ident}</span>);
    } else if (op) {
      elements.push(<span key={key} className="syn-operator">{op}</span>);
    } else if (punct) {
      elements.push(<span key={key} className="syn-punct">{punct}</span>);
    } else {
      elements.push(<span key={key}>{full}</span>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    elements.push(
      <span key={`plain-end`}>
        {line.slice(lastIndex)}
      </span>
    );
  }

  return elements;
};
