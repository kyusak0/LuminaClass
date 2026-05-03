import api, {getCSRF} from '../api';

class UserData {


    async login(credentials) {
        await getCsrf();


        const response = await api.post('/login', credentials);

        if (response.data.token) {
            this.setToken(response.data.token);
        }

        return response.data;
    }



    async register(userData) {
        getCsrf();
        return await api.post('/register', userData);
    }



    async logout() {
        const response = await api.post('/logout');
        this.removeToken();
        return response.data;
    }



    async getCurrentUser() {
        return await api.get('/api/user');
    }



    setToken(token) {
        localStorage.setItem('auth_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }



    removeToken() {
        localStorage.removeItem('auth_token');
        delete api.defaults.headers.common['Authorization'];
    }



    isAuthenticated() {
        return !!localStorage.getItem('auth_token');
    }
}

export default new UserData();