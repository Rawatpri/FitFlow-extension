chrome.runtime.onInstalled.addListener(()=>{
  chrome.contextMenus.create({ id:"fitflow-find", title:'Search in FitFlow: "%s"', contexts:["selection"] });
});
chrome.contextMenus.onClicked.addListener(async (info, tab)=>{
  if(info.menuItemId==="fitflow-find" && info.selectionText){
    chrome.storage.sync.set({ "ff_last_query": info.selectionText.trim() });
    chrome.action.setBadgeText({ text: "•", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: [134,239,172,255] });
    setTimeout(()=>chrome.action.setBadgeText({ text:"", tabId: tab.id }), 2500);
  }
});