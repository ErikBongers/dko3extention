import {Actions, createMessageHandler, sendRequest, TabType} from "./messaging";

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
    })
    .onData(data => {
        document.querySelector("button").addEventListener("click", async () => {
            await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, undefined, "Hullo! Fly safe!");
        });
        console.log("tab opened: request data message sent and received: ");
        console.log(data);
        document.getElementById("container").innerHTML = "Dataxxxx:" +  data.data;
        document.title = data.pageTitle;
    });
