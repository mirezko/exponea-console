import { NgModule } from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';

import { DevtoolsComponent } from './devtools.component';

@NgModule({
  imports: [
    BrowserModule
  ],
  declarations: [
    DevtoolsComponent
  ],
  bootstrap: [ DevtoolsComponent ]
})
export class devtoolsModule { }