import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

interface User {
  userId: string;
  userEmail: string;
  userRole: string;
  userMobileNum: string;
  userAddress: string;
  groupIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  
  public userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  private apiBaseUrl = 'http://localhost:3001/api'; // Centralize API base URL

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');
    if (token && userEmail) {
      this.fetchUser(userEmail, token);
    }
  }

  // If your user service uses a different endpoint structure
  async fetchUser(userEmail: string, token: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<User>(`http://localhost:3002/api/users/email/${userEmail}`, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
      this.userSubject.next(response);
    } catch (error: any) {
      if (error.status === 404) {
        console.error('User endpoint not found. Check if user service is running on the correct port.');
      } else if (error.status === 401) {
        console.error('Authentication failed. Token may be invalid.');
      } else {
        console.error('Fetching user failed:', error);
      }
      this.logout(); // Clear local data if fetching user fails
    }
  }

  register(userData: {
    userName: string;
    userEmail: string;
    password: string;
    userMobileNum: string;
    userAddress: string;
    userRole: string;
  }): Promise<void> {
    return firstValueFrom(
      this.http.post(`${this.apiBaseUrl}/auth/register`, userData, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
    )
      .then(() => {
        console.log('Registration successful');
        // Registration doesn't handle tokens; redirect user to login after success
      })
      .catch((error) => {
        console.error('Registration failed:', error);
        return Promise.reject(error);
      });
  }

  login(email: string, password: string): Promise<void> {
    return firstValueFrom(
      this.http.post<{ token: string }>(`${this.apiBaseUrl}/auth/login`, {
        userEmail: email,
        password,
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
    )
      .then((response) => {
        if (response.token) {
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('userEmail', email);
          return this.fetchUser(email, response.token);
        }
        return Promise.reject('Token not found');
      })
      .catch((error) => {
        console.error('Login failed:', error);
        return Promise.reject(error);
      });
  }

  logout(): void {
    this.userSubject.next(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
  }

  isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  isTokenExpired(token: string): boolean {
    const decodedToken: any = this.decodeToken(token);
    if (decodedToken?.exp) {
      const expirationDate = new Date(decodedToken.exp * 1000);
      return expirationDate < new Date();
    }
    return false;
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }
}
