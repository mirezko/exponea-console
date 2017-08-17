import { NgModule } from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';

import { BackgroundComponent } from './background.component';

@NgModule({
  imports: [
    BrowserModule
  ],
  declarations: [
    BackgroundComponent
  ],
  bootstrap: [ BackgroundComponent ]
})
export class backgroundModule { }