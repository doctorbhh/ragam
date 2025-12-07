// URL to the dynamic instances JSON
const INSTANCES_URL = 'https://raw.githubusercontent.com/n-ce/Uma/main/dynamic_instances.json';

const STORAGE_KEY_INSTANCE = 'ragam_selected_instance';
const STORAGE_KEY_QUALITY = 'ragam_audio_quality';
const STORAGE_KEY_PROVIDER = 'ragam_search_provider';

export const DEFAULT_INSTANCE = 'https://api.piped.private.coffee';
export const DEFAULT_QUALITY = 'high';
export const DEFAULT_PROVIDER = 'youtube'; // 'youtube' or 'jiosaavn'

// --- PROVIDER MANAGEMENT ---

export const getSearchProvider = () => {
    return localStorage.getItem(STORAGE_KEY_PROVIDER) || DEFAULT_PROVIDER;
};

export const setSearchProvider = (provider) => {
    if (['youtube', 'jiosaavn'].includes(provider)) {
        localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
        return provider;
    }
    return DEFAULT_PROVIDER;
};

// --- INSTANCE MANAGEMENT ---

export const getSavedInstance = () => {
    return localStorage.getItem(STORAGE_KEY_INSTANCE) || DEFAULT_INSTANCE;
};

export const setSavedInstance = (url) => {
    if (url) {
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        localStorage.setItem(STORAGE_KEY_INSTANCE, cleanUrl);
        return cleanUrl;
    }
    return null;
};

// --- QUALITY MANAGEMENT ---

export const getAudioQuality = () => {
    return localStorage.getItem(STORAGE_KEY_QUALITY) || DEFAULT_QUALITY;
};

export const setAudioQuality = (quality) => {
    if (['low', 'medium', 'high'].includes(quality)) {
        localStorage.setItem(STORAGE_KEY_QUALITY, quality);
        return quality;
    }
    return DEFAULT_QUALITY;
};

// --- API FETCHING ---

export const fetchInstances = async () => {
    try {
        const response = await fetch(INSTANCES_URL);
        if (!response.ok) throw new Error('Failed to fetch instances');
        const data = await response.json();

        let parsedInstances = [];
        if (data.piped && Array.isArray(data.piped)) {
            parsedInstances = data.piped.map(url => {
                try {
                    return { name: new URL(url).hostname, api_url: url };
                } catch (e) { return null; }
            }).filter(item => item !== null);
        }
        return parsedInstances;
    } catch (error) {
        console.error("Error fetching instances:", error);
        return [];
    }
};

export const clearAllData = () => {
    localStorage.clear();
    window.location.href = '/';
};