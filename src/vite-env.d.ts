/// <reference types="vite/client" />

import type { FichasParsingDebugData } from './services/googleSheetsMapService';

declare global {
  interface Window {
    __fichasParsed?: FichasParsingDebugData;
  }
}

