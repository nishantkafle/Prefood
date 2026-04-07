import axios from 'axios';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://172.16.17.10:4000';

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
