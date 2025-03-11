import { useEffect, useState } from "react";
import './App.css';
import axios from 'axios';
import Sanscript from '@indic-transliteration/sanscript';

// Helper function to check if text contains Devanagari characters
const containsDevanagari = (text) => /[\u0900-\u097F]/.test(text);

function App() {
  const CLIENT_ID = "cfb3c3c2eb7241508dbccf42a08ba1ec";
  const REDIRECT_URI = "http://localhost:3000";
  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";
  const SCOPES = [
    "streaming",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing"
  ];

  const [token, setToken] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [tracks, setTracks] = useState([]);
  const [lyrics, setLyrics] = useState("");
  const [romanizedLyrics, setRomanizedLyrics] = useState("");
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Token handling
  useEffect(() => {
    const hash = window.location.hash;
    let storedToken = window.localStorage.getItem("token");

    if (!storedToken && hash) {
      storedToken = hash.substring(1).split("&")
        .find(elem => elem.startsWith("access_token"))
        .split("=")[1];
      window.location.hash = "";
      window.localStorage.setItem("token", storedToken);
    }
    setToken(storedToken);

    if (storedToken) {
      loadSpotifySDK(storedToken);
    }
  }, []);

  const loadSpotifySDK = (authToken) => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Spotify Web Player',
        getOAuthToken: cb => { cb(authToken); },
        volume: 0.5,
      });

      player.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id);
        transferPlayback(device_id);
      });

      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        setIsPlaying(!state.paused);
      });

      player.connect();
    };
  };

  const transferPlayback = async (deviceId) => {
    try {
      await axios.put(
        "https://api.spotify.com/v1/me/player",
        { device_ids: [deviceId], play: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Error transferring playback:", error);
    }
  };

  const searchTracks = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.get("https://api.spotify.com/v1/search", {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: searchKey, type: "track", limit: 5 }
      });
      setTracks(data.tracks.items);
      setSelectedTrack(null);
      setLyrics("");
      setRomanizedLyrics("");
    } catch (error) {
      console.error("Error searching tracks:", error);
    }
  };

  const handleTrackClick = async (track) => {
    setSelectedTrack(track);
    setLyrics("");
    setRomanizedLyrics("");

    try {
      await axios.put(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        { uris: [track.uri] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsPlaying(true);
      fetchLyrics(track);
    } catch (error) {
      console.error("Error playing track:", error);
    }
  };



  {/*const handleTrackClick = async (track) => {
    setSelectedTrack(track);
    
    const formattedTrackName = track.name.toLowerCase().replace(/\s+/g, '-');
    const gaanaUrl = `https://gaana.com/song/${formattedTrackName}`;
    
    const scrapedLyrics = await scrapeLyrics(gaanaUrl);
    if (!scrapedLyrics) {
      const scrapedLyrics = await scrapeLyrics(`https://www.google.com/search?q=${track.name}+lyrics`);
    }
    
    if (scrapedLyrics) {
      setLyrics(scrapedLyrics);
    } else {
      setLyrics("Lyrics not found.");
    }
  };

  */}



  const scrapeLyrics = async (url) => {
    try {
      const response = await axios.get(url, {
        headers: {
          // You might need to set user-agent or other headers based on the target site
        }
      });
  
      // Parse the response and extract the lyrics
      // This is a placeholder; you'll need to adjust this according to the actual HTML structure of the page you're scraping.
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, 'text/html');
      
      // Example selector; this will depend on the actual structure of the Gaana lyrics page
      const lyricsElement = doc.querySelector('.lyrics-selector'); // Replace with the actual selector
      return lyricsElement ? lyricsElement.innerText : null;
  
    } catch (error) {
      console.error("Error scraping lyrics:", error);
      return null;
    }
  };
  


  const fetchLyrics = async (track) => {
    try {
      // First attempt to fetch lyrics from the API
      const { data } = await axios.get(`https://api.lyrics.ovh/v1/${track.artists[0].name}/${track.name}`);
      let fetchedLyrics = data.lyrics || "No lyrics found.";
      
      if (fetchedLyrics === "No lyrics found.") {
        // If no lyrics are found, attempt to scrape lyrics from Gaana
        
        console.log("maanav")
        
        const formattedTrackName = track.name.toLowerCase().replace(/\s+/g, '-');
        const gaanaUrl = `https://gaana.com/song/${formattedTrackName}`;
        
        const scrapedLyrics = await scrapeLyrics(gaanaUrl);
        
        if (scrapedLyrics) {
          fetchedLyrics = scrapedLyrics;
        } else {
          fetchedLyrics = "Lyrics not available.";
        }
      }
  
      setLyrics(fetchedLyrics);
  
      // Check if the lyrics contain Devanagari and transliterate if true
      if (containsDevanagari(fetchedLyrics)) {
        const romanized = Sanscript.t(fetchedLyrics, 'devanagari', 'iast');
        setRomanizedLyrics(romanized);
      } else {
        setRomanizedLyrics("Romanized lyrics not available.");
      }
  
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      setLyrics("Lyrics not available.");
      setRomanizedLyrics("Romanized lyrics not available.");
    }
  };
  
  
  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        await axios.put("https://api.spotify.com/v1/me/player/pause", {}, { headers: { Authorization: `Bearer ${token}` } });
        setIsPlaying(false);
      } else {
        await axios.put(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
    }
  };

  const logout = () => {
    setToken("");
    window.localStorage.removeItem("token");
  };

  const renderTracks = () => {
    if (tracks.length === 0) return <div>No tracks found.</div>;
    return tracks.map((track) => (
      <div
        key={track.id}
        onClick={() => handleTrackClick(track)}
        className={`track ${selectedTrack && selectedTrack.id === track.id ? 'selected' : ''}`}
      >
        <img src={track.album.images[0]?.url} alt={track.name} className="album-art" />
        <div className="track-info">
          <span>{track.name}</span>
          <span>by {track.artists.map(artist => artist.name).join(", ")}</span>
        </div>
      </div>
    ));
  };

  return (
    <div className="App">
      <div className="container">
        <header className="App-header">
          <h1>Literator</h1>
          {!token ? (
            <a href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPES.join("%20")}`}>
              Login to Spotify
            </a>
          ) : (
            <button onClick={logout}>Logout</button>
          )}

          {token && (
            <form onSubmit={searchTracks}>
              <input
                type="text"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="Search for a track"
              />
              <button type="submit">Search</button>
            </form>
          )}

          <div className="track-list">
            {renderTracks()}
          </div>

          {selectedTrack && (
            <div>
              <h2>Lyrics for "{selectedTrack.name}":</h2>
              <div className="play-pause-button">
                <button onClick={togglePlayback}>
                  {isPlaying ? "Pause" : "Play"}
                </button>
              </div>
              <pre>{lyrics}</pre>
              <h3>Romanized Lyrics:</h3>
              <pre>{romanizedLyrics}</pre>
            </div>
          )}
        </header>
      </div>
    </div>
  );
}

export default App;
