//Get song information from grooveshark.com page
function fetchTrackInfo(){
  songName = '';
  album = '';
  firstArtist = '';
  artists = '';
  
  songName = $('a.now-playing-link.song').text().trim();
  firstArtist = $('a.now-playing-link.artist').text().trim();
  
}