import { getSavedInstance, getSearchProvider, getAudioQuality } from "./instanceService";

const JIOSAAVN_API_URL = 'https://jiosavan-ytify.vercel.app/api/search/songs';
const STREAM_API_BASE = 'https://yt.omada.cafe';

// Unified Audio URL Fetcher
export const getAudioUrlForTrack = async (track) => {
  const provider = getSearchProvider(); // 'youtube' or 'jiosaavn'

  if (provider === 'jiosaavn') {
    return await getJioSaavnAudioUrl(track);
  } else {
    return await getYouTubeAudioUrl(track);
  }
};

// Unified Search Function
export const smartSearch = async (query) => {
  const provider = getSearchProvider();

  if (provider === 'jiosaavn') {
    return await searchJioSaavn(query);
  } else {
    return await searchYouTube(query);
  }
};

// --- JIO SAAVN IMPLEMENTATION ---

const getJioSaavnAudioUrl = async (track) => {
  // If we already have a direct URL, use it
  if (track.url) return track.url;

  let results = [];

  // --- ATTEMPT 1: Strict Search (Name + Artist) ---
  try {
    const artistName = track.artists && track.artists[0] ? track.artists[0].name : "";
    // Clean up query to avoid "undefined" strings
    const query = `${track.name || track.title} ${artistName}`.trim();

    if (query) {
      results = await searchJioSaavn(query);
    }
  } catch (error) {
    console.warn("JioSaavn strict search failed, attempting retry...", error);
  }

  // --- ATTEMPT 2: Loose Search (Name Only) ---
  // If first attempt returned no results, retry with just the song name
  if (!results || results.length === 0) {
    console.log("Retrying JioSaavn search with song name only...");
    try {
      const retryQuery = (track.name || track.title || "").trim();

      if (retryQuery) {
        results = await searchJioSaavn(retryQuery);
      }
    } catch (error) {
      console.warn("JioSaavn retry search failed:", error);
    }
  }

  // Final Check
  if (!results || results.length === 0) {
    console.error("JioSaavn URL fetch error: Track not found after retry.");
    throw new Error("Track not found on JioSaavn");
  }

  // Return the URL of the best match (first result)
  return results[0].url;
};

const searchJioSaavn = async (query) => {
  try {
    const response = await fetch(`${JIOSAAVN_API_URL}?query=${encodeURIComponent(query)}&page=0&limit=10`);

    if (!response.ok) throw new Error("JioSaavn search failed");

    const data = await response.json();
    const results = data.data?.results || data.results || data.data || [];

    if (!Array.isArray(results)) return [];

    return results.map(item => {
      // Safe image extraction
      const image = Array.isArray(item.image)
        ? item.image[item.image.length - 1]?.link || item.image[item.image.length - 1]?.url
        : item.image;

      // Safe URL extraction
      let downloadUrl = null;
      if (Array.isArray(item.downloadUrl)) {
        downloadUrl = item.downloadUrl[item.downloadUrl.length - 1]?.link || item.downloadUrl[item.downloadUrl.length - 1]?.url;
      } else {
        downloadUrl = item.downloadUrl;
      }

      // Safe Artist extraction
      let artists = [];
      if (item.artists?.primary) {
        artists = item.artists.primary.map(a => ({ name: a.name }));
      } else if (Array.isArray(item.artists)) {
        artists = item.artists.map(a => typeof a === 'string' ? { name: a } : { name: a.name });
      } else if (typeof item.primaryArtists === 'string') {
        artists = [{ name: item.primaryArtists }];
      }

      return {
        id: item.id || Math.random().toString(36),
        title: item.name || item.title,
        name: item.name || item.title,
        thumbnail: image,
        channelTitle: artists[0]?.name || 'Unknown Artist',
        duration: typeof item.duration === 'string' ? parseInt(item.duration) : item.duration,
        url: downloadUrl,
        isOfficial: true,
        artists: artists
      };
    });
  } catch (error) {
    console.error("JioSaavn search error:", error);
    return [];
  }
};

// --- YOUTUBE / PIPED IMPLEMENTATION ---

const getYouTubeAudioUrl = async (track) => {
  try {
    // 1. If we already have a direct stream URL, use it
    if (track.url) return track.url;

    let videoId = track.id;

    // 2. ID VALIDATION Check
    // If the ID is NOT 11 characters, we assume it's NOT a valid video ID and we must search.
    if (!videoId || videoId.length !== 11) {
      const artistNames = track.artists ? track.artists.map(a => a.name).join(' ') : (track.channelTitle || '');
      const searchQuery = `${track.name || track.title} ${artistNames}`;

      const searchResults = await searchYouTube(searchQuery);
      if (searchResults.length === 0) {
        throw new Error("No matching videos found on YouTube");
      }

      // Use the ID of the first search result
      videoId = searchResults[0].id;
    }

    // 3. Extract Audio using Invidious API
    const audioUrl = await getStreamUrl(videoId);
    return audioUrl;
  } catch (error) {
    console.error("YouTube URL fetch error:", error);
    throw error;
  }
};

export const searchYouTube = async (query) => {
  try {
    const baseUrl = getSavedInstance(); // Piped Instance
    const filter = 'music_songs';
    const response = await fetch(`${baseUrl}/search?q=${encodeURIComponent(query)}&filter=${filter}`);

    if (!response.ok) throw new Error(`Search API error: ${response.status}`);
    const data = await response.json();

    if (!data.items) return [];

    return data.items
      .filter(item => !item.isShort && item.type === 'stream')
      .map((item) => {
        let uploaderName = item.uploaderName || 'Unknown';
        if (filter === 'music_songs' && !uploaderName.endsWith(' - Topic')) {
          uploaderName += ' - Topic';
        }
        // Piped results usually put the Video ID in the url field like "/watch?v=ID"
        const videoId = item.url.split('v=')[1];

        return {
          id: videoId,
          title: item.title,
          name: item.title,
          thumbnail: item.thumbnail,
          channelTitle: uploaderName,
          url: null, // No direct audio URL from search
          duration: item.duration,
          artists: [{ name: uploaderName }]
        };
      });
  } catch (error) {
    console.error("YouTube search failed:", error);
    throw error;
  }
};

// Helper: Get direct stream URL from Invidious
const getStreamUrl = async (videoId) => {
  try {
    const response = await fetch(`${STREAM_API_BASE}/api/v1/videos/${videoId}`);

    if (!response.ok) {
      throw new Error(`Stream API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.adaptiveFormats || data.adaptiveFormats.length === 0) {
      throw new Error('No adaptive formats found');
    }

    // Filter for audio streams
    let audioStreams = data.adaptiveFormats
      .filter(format => format.type && format.type.startsWith('audio'));

    if (audioStreams.length === 0) {
      throw new Error('No audio streams found');
    }

    // Sort by bitrate based on Quality Setting
    const quality = getAudioQuality(); // 'low', 'medium', 'high'

    audioStreams.sort((a, b) => {
      const bitrateA = parseInt(a.bitrate || 0);
      const bitrateB = parseInt(b.bitrate || 0);
      return bitrateB - bitrateA; // Descending
    });

    let selectedStream;
    if (quality === 'high') {
      selectedStream = audioStreams[0];
    } else if (quality === 'low') {
      selectedStream = audioStreams[audioStreams.length - 1];
    } else {
      const middleIndex = Math.floor(audioStreams.length / 2);
      selectedStream = audioStreams[middleIndex];
    }

    // Force Hostname to Proxy
    const originalUrl = new URL(selectedStream.url);
    originalUrl.hostname = 'yt.omada.cafe';

    return originalUrl.toString();

  } catch (error) {
    console.error("Stream fetch failed:", error);
    throw error;
  }
};