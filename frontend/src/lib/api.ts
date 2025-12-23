import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
    baseURL: API_URL,
});

export interface Track {
    id: number;
    artist_name: string;
    track_name: string;
    duration: number;
    lyrics: LyricLine[];
    audio_url?: string | null;
}

export interface LyricLine {
    time: number;
    text: string;
    translation?: string;
    tokens?: any[];
}

export const searchTracks = async (query: string) => {
    const res = await api.get(`/tracks/search?q=${query}`);
    return res.data;
};

export const importTrack = async (lrclib_id: number) => {
    const res = await api.post(`/tracks/import/${lrclib_id}`);
    return res.data;
};

export const getTrack = async (id: number) => {
    const res = await api.get(`/tracks/${id}`);
    return res.data;
};

export const translateWord = async (word: string) => {
    const res = await api.get(`/tracks/translate/${word}`);
    return res.data;
};

export const uploadAudio = async (trackId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/tracks/${trackId}/audio`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data;
};
