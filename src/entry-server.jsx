import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import App from './App.jsx';
import RichContent from './components/RichContent.jsx';

export function render(path, notice) {
  return renderToString(<App path={path} notice={notice} />);
}

export function renderRichContent(content) {
  return renderToStaticMarkup(<RichContent content={content} />);
}