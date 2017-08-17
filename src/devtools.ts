import './img/icon-128.png';
import './img/icon-34.png';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';

import { DevtoolsModule } from './devtools/devtools.module';

if (process.env.ENV === 'production') {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(DevtoolsModule);