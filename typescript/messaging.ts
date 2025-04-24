export enum Actions {
    OpenHtmlTab = "open_tab",
    GetTabData = "get_tab_data",
    GetParentTabId = "get_parent_tab_id",
    OpenHoursSettings = "open_hours_settings",
    GreetingsFromParent = "greetingsFromParent",
    GreetingsFromChild = "greetingsFromChild",
}

export enum TabType {Undefined, Main, HoursSettings, Html}

export interface ServiceRequest {
    action: Actions,
    senderTabType: TabType,
    targetTabType: TabType,
    data: any,
    pageTitle?: string,
    senderTabId?: number,
    targetTabId?: number,
}

export function sendRequest(action: Actions, from: TabType, to: TabType,  toId: number, data: any, pageTitle?: string) {
    let req: ServiceRequest = {
        action,
        data,
        pageTitle,
        senderTabType: from,
        targetTabType: to,
        targetTabId: toId,
    };
    return chrome.runtime.sendMessage(req);
}

export interface ServiceResponse {
    result: any,
    error: string,
}

export async function sendGetDataRequest(sender: TabType) {
    let tab = await chrome.tabs.getCurrent();
    return await sendRequest(Actions.GetTabData, sender, TabType.Undefined, undefined, {tabId: tab.id});
}

export type MessageHandler = {
    getListener: () => (request: ServiceRequest, _sender, _sendResponse) => void;
    onMessageForMyTabType: (callback: (msg: ServiceRequest) => void) => MessageHandler;
    onMessageForMe: (callback: (msg: ServiceRequest) => void) => MessageHandler;
    onData: (callback: (data: any) => void) => MessageHandler;
}

export interface InternalMessageHandler extends MessageHandler {
    _onMessageForMyTabType(request: ServiceRequest): void;
    _onMessageForMe(request: ServiceRequest): void;
    _onData(data: any): void;
}

export function createMessageHandler(tabType: TabType): MessageHandler {
    let handler:InternalMessageHandler = {
        getListener: function () {
            let self: InternalMessageHandler = this;
            return async function onMessage(request: ServiceRequest, _sender, _sendResponse) {
                console.log(`blank received: `, request);
                if (request.targetTabType === tabType) {
                    self._onMessageForMyTabType?.(request);
                    let tab = await chrome.tabs.getCurrent();
                    if (request.targetTabId === tab.id) {
                        self._onMessageForMe?.(request)
                    }
                }
            }
        },
        onMessageForMyTabType: function (callback: (msg: ServiceRequest) => void): MessageHandler {
            this._onMessageForMyTabType = callback;
            return this;
        },
        onMessageForMe: function (callback: (msg: ServiceRequest) => void): MessageHandler {
            this._onMessageForMe = callback;
            return this;
        },
        onData: function (callback: (data: any) => void): MessageHandler {
            this._onData = callback;
            return this;
        },
        _onMessageForMyTabType: undefined,
        _onMessageForMe: undefined,
        _onData: undefined
    };
    document.addEventListener("DOMContentLoaded", async () => {
        let res = await sendGetDataRequest(tabType);
        handler._onData?.(res);
    });
    return handler;
}