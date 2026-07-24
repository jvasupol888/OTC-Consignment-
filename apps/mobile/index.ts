if (typeof window !== 'undefined') {
  const displayError = (msg) => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100vw';
    div.style.height = '100vh';
    div.style.backgroundColor = 'red';
    div.style.color = 'white';
    div.style.zIndex = '99999';
    div.style.padding = '20px';
    div.style.fontSize = '20px';
    div.innerHTML = '<h2>CRITICAL CRASH</h2><pre>' + msg + '</pre>';
    document.body.appendChild(div);
  };
  window.addEventListener('error', (e) => displayError(e.message + '\n' + (e.error?.stack || '')));
  window.addEventListener('unhandledrejection', (e) => displayError(e.reason?.message + '\n' + (e.reason?.stack || '')));
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
