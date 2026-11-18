import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import snapshot from './data/resources.json'
import { resolveResourcePath } from '../scripts/resource-data.mjs'

const root = document.getElementById('root');
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
const resource = resolveResourcePath(snapshot.resources, window.location.pathname);
if (resource && window.location.pathname !== resource.path) {
  window.location.replace(resource.path + window.location.search + window.location.hash);
} else if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
