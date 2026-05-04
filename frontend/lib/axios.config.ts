import axios from 'axios';
export const NEXT_PUBLIC_API_URL = 'http://localhost:8001';
const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || `${NEXT_PUBLIC_API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
});



axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default axiosInstance;