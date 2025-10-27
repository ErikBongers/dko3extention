export enum Actions {
    OpenHtmlTab = "open_tab",
    RequestTabData = "request_tab_data",
    TabData = "tab_data",
    GetParentTabId = "get_parent_tab_id",
    OpenHoursSettings = "open_hours_settings",
    HoursSettingsChanged = "open_hours_settings_changed",
    GreetingsFromParent = "greetingsFromParent",
    GreetingsFromChild = "greetingsFromChild",
}

export enum TabType {
    Undefined= "Undefined",
    Main = "Main",
    HoursSettings = "HoursSettings",
    Html = "Html"
}

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

export enum DataRequestTypes {
    HoursSettings = "HoursSettings",
    Html = "Html" //todo: this is just for tests.
}

export type HourSettingsDataRequestParams = {
    schoolYear: string,
}

export type HtmlDataRequestParams = {
    todo: string,
}

export type RequestParams = HourSettingsDataRequestParams | HtmlDataRequestParams;
export interface DataRequestInfo<Params extends RequestParams> {
    tabId: number,
    dataType: DataRequestTypes,
    params: Params,
}

export async function sendDataRequest<T extends RequestParams>(sender: TabType, dataType: DataRequestTypes, params: T) {
    let tab = await chrome.tabs.getCurrent();
    let dataRequestInfo: DataRequestInfo<T> = {
        tabId: tab.id,
        dataType: dataType,
        params
    };
    await sendRequest(Actions.RequestTabData, sender, TabType.Undefined, undefined, dataRequestInfo);
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
                console.log(`tab received: `, request);
                if (request.targetTabType === tabType) {
                    self._onMessageForMyTabType?.(request);
                    let tab = await chrome.tabs.getCurrent();
                    if (request.targetTabId === tab.id) {
                        if(request.action === Actions.TabData && self._onData) {
                            self._onData(request);
                        } else {
                            self._onMessageForMe?.(request);
                        }
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
    return handler;
}