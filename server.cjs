const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const ytdlp = require('yt-dlp-exec');

const app = express();
const port = 3001;

const INVIDIOUS_API = 'https://yt.omada.cafe';

app.use(cors({
  origin: 'http://localhost:8080', // Adjust if your frontend port differs
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  credentials: true,
}));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// --- JIOSAAVN LOGIC (Full Port from ytify) ---

class JioSaavn {
  constructor() {
    this.baseURL = 'https://www.jiosaavn.com/api.php';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };
  }

  // Search for a specific track (Fetch Logic)
  async search(title, artist) {
    try {
      const searchQuery = `${title} ${artist}`;
      const url = this._buildSearchURL(searchQuery);
      const response = await fetch(url, { headers: this.headers });
      const data = await response.json();

      const results = data.results || [];
      if (results.length === 0) throw new Error('No results found');

      const processedResults = results.map(rawSong => this._createSongPayload(rawSong));

      // Find best match
      const matchingTrack = this._findMatchingTrack(processedResults, title, artist);
      if (!matchingTrack) throw new Error('No matching track found');

      return matchingTrack;
    } catch (error) {
      console.error(`JioSaavn Search Error: ${error.message}`);
      throw error;
    }
  }

  // Search for list of tracks (Smart Search Logic)
  async searchAll(query, limit = 10) {
    try {
      const url = this._buildSearchURL(query, limit);
      const response = await fetch(url, { headers: this.headers });
      const data = await response.json();

      const results = data.results || [];
      if (results.length === 0) return { results: [] };

      const processedResults = results.map(rawSong => this._createSongPayload(rawSong));
      return { results: processedResults };
    } catch (error) {
      console.error(`JioSaavn SearchAll Error: ${error.message}`);
      throw error;
    }
  }

  _buildSearchURL(query, limit = 10) {
    const params = new URLSearchParams({
      _format: 'json',
      _marker: '0',
      api_version: '4',
      ctx: 'web6dot0',
      __call: 'search.getResults',
      q: query,
      p: '0',
      n: limit.toString()
    });
    return `${this.baseURL}?${params.toString()}`;
  }

  _createSongPayload(rawSong) {
    return {
      id: rawSong.id,
      name: rawSong.title || rawSong.song || '',
      duration: parseInt(rawSong.duration || '0'),
      album: {
        name: rawSong.album || rawSong.album_name || '',
      },
      artists: {
        primary: this._parseArtists(rawSong.primary_artists || rawSong.artists || []),
        all: this._parseArtists(rawSong.all_artists || [])
      },
      downloadUrl: rawSong.download_url || rawSong.media_url || rawSong.media_preview_url || '',
      image: rawSong.image || rawSong.thumbnail || '',
    };
  }

  _parseArtists(artists) {
    if (!Array.isArray(artists)) return [];
    return artists.map(artist => {
      if (typeof artist === 'string') return { name: artist, id: '' };
      return { name: artist.name || artist.title || '', id: artist.id || '' };
    });
  }

  _findMatchingTrack(processedResults, title, artist) {
    const normalize = (text) => (text || '').toString().trim().toLowerCase().replace(/[^\w\s]/g, '');
    const startsEither = (a, b) => a.startsWith(b) || b.startsWith(a);

    for (const track of processedResults) {
      const allArtists = [
        ...(track.artists.primary || []),
        ...(track.artists.all || [])
      ].map(a => a.name);

      const artistMatches = allArtists.some(a => startsEither(normalize(artist), normalize(a)));
      const titleMatches = startsEither(normalize(title), normalize(track.name));

      if (titleMatches && (artistMatches || !artist)) return track;
    }

    // Fallback to first title match
    return processedResults.find(t => startsEither(normalize(title), normalize(t.name))) || processedResults[0];
  }
}

const jiosaavn = new JioSaavn();

// --- ENDPOINTS ---

app.get('/jiosaavn/search', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title) return res.status(400).json({ error: "Missing title" });

    const result = await jiosaavn.search(title, artist || "");
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/jiosaavn/search/all', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: "Missing query" });

    const result = await jiosaavn.searchAll(q, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- YOUTUBE / INVIDIOUS LOGIC (Kept for fallback/legacy mode) ---

app.get('/scrape', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  // 1. Try Invidious API
  try {
    const invidiousResponse = await fetch(`${INVIDIOUS_API}/api/v1/videos/${videoId}`);
    if (invidiousResponse.ok) {
      const data = await invidiousResponse.json();
      if (data && data.adaptiveFormats) {
        const audioStreams = data.adaptiveFormats
          .filter(format => format.type && format.type.startsWith('audio'))
          .map(v => ({ bitrate: parseInt(v.bitrate), url: v.url, type: v.type }));

        if (audioStreams.length > 0) {
          const bestAudio = audioStreams.sort((a, b) => b.bitrate - a.bitrate)[0];
          if (bestAudio && bestAudio.url) {
            const originalStreamUrl = new URL(bestAudio.url);
            originalStreamUrl.hostname = 'yt.omada.cafe';
            const proxiedUrl = `http://localhost:${port}/proxy?url=${encodeURIComponent(originalStreamUrl.toString())}`;
            return res.json({ url: proxiedUrl });
          }
        }
      }
    }
  } catch (error) {
    console.error('Invidious API error:', error.message);
  }

  // 2. Fallback to yt-dlp
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const streamUrl = await ytdlp(url, {
      getUrl: true,
      format: 'bestaudio/best',
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
    });
    const proxiedUrl = `http://localhost:${port}/proxy?url=${encodeURIComponent(streamUrl.trim())}`;
    res.json({ url: proxiedUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape' });
  }
});

app.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url');

  try {
    const headers = req.headers.range ? { 'Range': req.headers.range } : {};
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) return res.status(response.status).send(response.statusText);

    const contentType = response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (response.headers.get('Content-Length')) res.setHeader('Content-Length', response.headers.get('Content-Length'));
    if (response.headers.get('Content-Range')) res.setHeader('Content-Range', response.headers.get('Content-Range'));
    if (req.headers.range) res.status(206);

    if (contentType.includes('mpegurl') || url.endsWith('.m3u8')) {
      const playlistText = await response.text();
      const baseProxyUrl = `http://localhost:${port}/proxy?url=`;
      const rewrittenPlaylist = playlistText.replace(/(https?:\/\/[^\s]+)/g, (match) => `${baseProxyUrl}${encodeURIComponent(match)}`);
      res.send(rewrittenPlaylist);
    } else {
      response.body.pipe(res);
      response.body.on('error', () => res.status(500).end());
    }
  } catch (error) {
    res.status(500).send('Proxy failed');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});