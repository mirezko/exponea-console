import {Injectable} from "@angular/core";
import Port = chrome.runtime.Port;
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";

@Injectable()
export class BackgroundEventBusService {

  backgroundPorts: { [key: string]: Port } = {};
  listeners: { [key: string]: Subject<IMessage>[] };

  constructor() {
    chrome.runtime.onConnect.addListener((port) => this._onConnect(port));
  }

  send(tabId: number, eventName: string, payload: any): void {
    this.backgroundPorts[tabId].postMessage({ tabId, eventName, payload });
  }

  on(eventName: string): Observable<IMessage> {
    let subject = new Subject<any>()
    this.listeners[eventName].push(subject);
    return subject;
  }

  private _onConnect(port: Port) {
    var match = port.name.match(/background_(\d+)/);
    if (match === null || match.length !== 2) {
      return;
    }

    var tabId = parseInt(match[1]);
    this.backgroundPorts[tabId] = port;
    port.onMessage.addListener((msg: any) => this._onPortMessage(msg));
    port.onDisconnect.addListener(() => this._onPortDisconnect(tabId));
  }

  private _onPortMessage(msg: IMessage) {
    this.listeners[msg.eventName].forEach((listener) => listener.next(msg))
  }

  private _onPortDisconnect(tabId: number) {
    delete this.backgroundPorts[tabId];
  }
}

export interface IMessage {
  tabId: number,
  eventName: string,
  payload: any
}