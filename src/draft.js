import { useEffect, useState } from "react";
import './App.css';
import axios from 'axios';

function App() {
  const CLIENT_ID = "cfb3c3c2eb7241508dbccf42a08ba1ec";
  const REDIRECT_URI = "http://localhost:3000";
  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";
  const AZURE_TRANSLITERATE_ENDPOINT = "https://api.cognitive.microsofttranslator.com/transliterate";
  const STANDS4_API_KEY = "F755z2EezRVHXGhL";
  const AZURE_KEY = "YOUR_AZURE_KEY";
  const AZURE_REGION = "East US"; 

  const [token, setToken] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [tracks, setTracks] = useState([]);
  const [lyrics, setLyrics] = useState("");
  const [romanizedLyrics, setRomanizedLyrics] = useState("");
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

    if (storedToken) loadSpotifySDK(storedToken);
  }, []);

  const loadSpotifySDK = (authToken) => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Spotify Web Player',
        getOAuthToken: cb => cb(authToken),
        volume: 0.5,
      });

      player.addListener('ready', ({ device_id }) => setDeviceId(device_id));
      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        setIsPlaying(!state.paused);
      });

      player.connect();
    };
  };

  const searchTracks = async (e) => {
    e.preventDefault();
    const { data } = await axios.get("https://api.spotify.com/v1/search", {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: searchKey, type: "track", limit: 5 },
    });
    setTracks(data.tracks.items);
  };

  const handleTrackClick = async (track) => {
    setSelectedTrack(track);
    setLyrics("");
    setRomanizedLyrics("");

    await fetchLyrics(track);
  };

  const fetchLyrics = async (track) => {
    try {
      const { data } = await axios.get(
        `https://www.stands4.com/services/v2/lyrics.php`,
        {
          params: {
            artist: track.artists[0].name,
            song: track.name,
            apikey: STANDS4_API_KEY,
            format: "json",
          },
        }
      );

      if (data.result) {
        const fetchedLyrics = data.result[0].lyrics;
        setLyrics(fetchedLyrics);
        transliterateLyrics(fetchedLyrics);
      } else {
        setLyrics("No lyrics found.");
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      setLyrics("Lyrics not available.");
    }
  };

  const transliterateLyrics = async (text) => {
    try {
      const { data } = await axios.post(
        AZURE_TRANSLITERATE_ENDPOINT,
        [
          {
            text,
            language: "hi",
            fromScript: "Deva",
            toScript: "Latn",
          },
        ],
        {
          headers: {
            "Ocp-Apim-Subscription-Key": AZURE_KEY,
            "Ocp-Apim-Subscription-Region": AZURE_REGION,
            "Content-Type": "application/json",
          },
          params: { apiVersion: "3.0" },
        }
      );

      setRomanizedLyrics(data[0].text || "Romanized text not available.");
    } catch (error) {
      console.error("Error transliterating lyrics:", error);
    }
  };

  const renderTracks = () => {
    return tracks.map((track) => (
      <div
        key={track.id}
        onClick={() => handleTrackClick(track)}
        style={{ cursor: "pointer", padding: "10px", border: "1px solid black", margin: "5px" }}
      >
        {track.name} by {track.artists.map((artist) => artist.name).join(", ")}
      </div>
    ));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Spotify Lyrics Player</h1>
        {!token ? (
          <a href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}`}>
            Login to Spotify
          </a>
        ) : (
          <button onClick={() => window.localStorage.removeItem("token")}>Logout</button>
        )}

        {token && (
          <form onSubmit={searchTracks}>
            <input type="text" onChange={(e) => setSearchKey(e.target.value)} />
            <button type="submit">Search</button>
          </form>
        )}

        {renderTracks()}

        {selectedTrack && (
          <div>
            <h2>Lyrics for "{selectedTrack.name}":</h2>
            <pre>{lyrics}</pre>
            <h3>Romanized Lyrics:</h3>
            <pre>{romanizedLyrics}</pre>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
