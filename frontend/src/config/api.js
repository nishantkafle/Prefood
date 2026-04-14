import axios from 'axios';

const DEFAULT_BACKEND_URL = typeof window !== 'undefined'
	? `${window.location.protocol}//${window.location.hostname}:4000`
	: 'http://localhost:4000';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_URL;

axios.defaults.baseURL = BACKEND_URL;
axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
	const token = localStorage.getItem('authToken');
	if (token) {
		config.headers = config.headers || {};
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});
