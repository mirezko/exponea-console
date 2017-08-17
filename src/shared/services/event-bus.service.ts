import {Injectable} from "@angular/core";
import {Observable} from "rxjs/Observable";
import Port = chrome.runtime.Port;
import {Subject} from "rxjs/Subject";
import {IMessage} from "../../background/services/background-event-bus.service";

@Injectable()
export class EventBusService {

  private backgroundPort: Port;
  private currentTabId = chrome.devtools.inspectedWindow.tabId;
  listeners: { [key: string]: Subject<IMessage>[] };


  constructor() {
    this.backgroundPort = chrome.runtime.connect({
      name: 'background_' + this.currentTabId
    });
    // this.backgroundPort.postMessage({
    //   type: 'trackEvent',
    //   eventCategory: 'devtools',
    //   eventAction: 'created'
    // });
    this.backgroundPort.onMessage.addListener((msg: IMessage) => this._onMessage(msg));
  }

  private _onMessage(msg: IMessage) {
    this.listeners[msg.eventName].forEach((listener) => {
      listener.next(msg);
    })
  }


  send(eventName: string, payload: any): void {
    this.backgroundPort.postMessage({ eventName, payload, tabId: this.currentTabId });
  }

  on(eventName: string): Observable<IMessage> {
    let subject = new Subject<any>()
    this.listeners[eventName].push(subject);
    return subject;
  }

}