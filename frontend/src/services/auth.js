class AuthService {
    constructor() {
      this.token = localStorage.getItem('token');
      this.user = null;
    }
  
    setToken(token) {
      this.token = token;
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  
    getToken() {
      return this.token;
    }
  
    setUser(user) {
      this.user = user;
    }
  
    getUser() {
      return this.user;
    }
  
    isAuthenticated() {
      return !!this.token;
    }
  
    logout() {
      this.setToken(null);
      this.setUser(null);
      window.location.href = '/login';
    }
  
    // Check if token is expired
    isTokenExpired() {
      if (!this.token) return true;
      
      try {
        const payload = JSON.parse(atob(this.token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        return Date.now() > exp;
      } catch (error) {
        return true;
      }
    }
  
    // Get token payload
    getTokenPayload() {
      if (!this.token) return null;
      
      try {
        return JSON.parse(atob(this.token.split('.')[1]));
      } catch (error) {
        return null;
      }
    }
  }
  
  export default new AuthService();