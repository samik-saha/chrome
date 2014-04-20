var glyrics_appid="paiehomgejkdifojcddmbinmophkibac";
var msgFromTabId;
var trackInfoMessage;
var title;


// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
  if (tab.url.indexOf('gaana.com') > -1
  || tab.url.indexOf('grooveshark.com') > -1
  || tab.url.indexOf('saavn.com') > -1
  || tab.url.indexOf('play.spotify.com') > -1) {
    // ... show the page action.
    chrome.pageAction.show(tabId);
  }
}


function iconClicked(tab){
  var themeClass = localStorage["themeClass"];
  var fontClass = localStorage["fontClass"];
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.tabs.sendMessage(tabs[0].id, {message: "ShowLyrics", themeClass: themeClass, fontClass: fontClass});

});
}

//chrome.pageAction.onClicked.addListener(addLyrics);
chrome.pageAction.onClicked.addListener(iconClicked);

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);

/* Listen for messages from content scripts */
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.msgType === "lyricRequest"){
        console.log("Received message from CS: lyrics request for "+request.title+" by "+request.artist+"; getting lyrics URL.");
		msgFromTabId=sender.tab.id;
		getLyricURL(request.artist, request.title);

	}
	/* save and forward track information to app event page */
	else if (request.msgType === "trackInfo"){
        trackInfoMessage = request;
		chrome.runtime.sendMessage(glyrics_appid, request);
	}
  });


/* Listen for messages from outside like, glyrics app */
chrome.runtime.onMessageExternal.addListener(
    function(request, sender, sendResponse){
        if (request){
            if(request.msgType){
                /* this message is sent by the glyrics app to check if the ext is installed */
                if(request.msgType === "version"){
                    console.log("Received message from App: version; sending response");
                    sendResponse({version: 1.0});
                    if(trackInfoMessage){
                        console.log("Song already playing. Sending trackinfo to App.");
                        chrome.runtime.sendMessage(glyrics_appid, trackInfoMessage);
                    }
                }
            }
        }
    }
);

function getLyricURL(artist,title)
{
	$.ajax({
		url: 'http://lyrics.wikia.com/api.php',
		data: {
			artist: artist,
			song: title,
			fmt: 'xml'
		},
		headers: {
			"X-Wikia-API-Key": "90d9b7f2f7e0f57b66f13e5c99b287cfa189bb88"
		},
		dataType: 'xml',
		type: 'GET',
		cache: false,
		complete: function(jqXHR,status){
			//console.log('Status:'+status);
		},
		error: function(jqXHR, textStatus, errorThrown){
			//send error message to content script
			var pass_data = {
						'msgType': 'displayError',
						'message': 'An error occurred while searching lyrics for "'+title+'" by "'+artist+'". Please retry.'
					};
			chrome.tabs.sendMessage(msgFromTabId, pass_data);
		},
		success: function(lyricsData, status){
			try
			{
				// Grab lyrics wikia song url
				var songURL = $(lyricsData).find("url").text();

				if(!songURL){
					throw('Could not find a song URL');
				}

				var lyrics = $(lyricsData).find("lyrics").text();
				if (lyrics === 'Not found'){
					//send error message to content script
					var pass_data = {
						'msgType': 'displayError',
						'msgAction': 'searchOnLyricWiki',
						'message': 'Lyrics not found for <b>'+title+'</b> by <b>'+artist+'</b>\
		  					(<a target="_blank" href="https://www.google.com/search?q='+title+' '+artist+' lyrics"><u>Search Google</u></a>).\
		  					<br>'+
		  					'Please add lyrics at '+ '<a href="'+songURL+'" target="_blank"><u>LyricWiki</u></a>.'
					};
					chrome.tabs.sendMessage(msgFromTabId, pass_data);
					throw new Error('LYRICS NOT FOUND');
				}

				//send lyric url to content script
				var pass_data={
					'msgType': 'songURL',
					'url': songURL
				};
				chrome.tabs.sendMessage(msgFromTabId, pass_data);

			}
			catch(err)
			{
				console.log(err.message);
				if (err.message !== 'LYRICS NOT FOUND'){
					//send error message to content script
					var pass_data = {
						'msgType': 'displayError',
						'message': 'An error occurred while retrieving lyrics for "'+title+'" by "'+artist+'". Please retry.'
					};
					chrome.tabs.sendMessage(msgFromTabId, pass_data);
		  		}
			}

		}

		});
}