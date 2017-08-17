import { NgModule } from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';

import { PopupComponent } from './popup.component';

@NgModule({
  imports: [
    BrowserModule
  ],
  declarations: [
    PopupComponent
  ],
  bootstrap: [ PopupComponent ]
})
export class PopupModule { }