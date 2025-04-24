import {Actions, createMessageHandler, sendGetDataRequest, sendRequest, TabType} from "./messaging";

let handler  = createMessageHandler(TabType.HoursSettings);

chrome.runtime.onMessage.addListener(handler.getListener());

handler
    .onMessageForMyTabType(msg => {
        console.log("message for my tab type: ", msg);
        document.getElementById("container").innerHTML = "Message was for my tab type" + msg.data;
    })
    .onMessageForMe(msg => {
        console.log("message for me: ", msg);
        document.getElementById("container").innerHTML = "DATA:" + msg.data;
    });

document.addEventListener("DOMContentLoaded", async () => {
    document.querySelector("button").addEventListener("click", async () => {
        await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, undefined, "Hullo! Fly safe!");
    });
    let res = await sendGetDataRequest(TabType.HoursSettings); //todo: where does this id come from?
    console.log("tab opened: request data message sent and received: ");
    console.log(res);
    document.getElementById("container").innerHTML = "Data:" +  res.data;
    document.title = res.pageTitle;
});
