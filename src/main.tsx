import { render } from 'preact';
import { App } from './app';

// Self-hosted so the PWA is fully offline (no CDN dependency).
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';

import './styles/tokens.css';
import './styles/app.css';

render(<App />, document.getElementById('app')!);
