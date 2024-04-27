const attachmentPoint = document.querySelector("#lessen_overzicht");
if(attachmentPoint){
	alert("gevonne!");
	const tadaa = document.createElement("p");
	tadaa.textContent = "TADAA";
	attachmentPoint.insertAdjacentElement("afterend", tadaa);
} else {
	alert("ni gevonne");
}