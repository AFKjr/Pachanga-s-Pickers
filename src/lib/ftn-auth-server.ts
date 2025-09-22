// lib/ftn-auth-server.ts
// Server-side FTN authentication (no localStorage dependency)

interface FTNCredentials {
  sessionCookie: string;
  csrfToken?: string;
  expiresAt: Date;
  lastRefreshed: Date;
  isValid: boolean;
}

interface FTNLoginResponse {
  success: boolean;
  sessionCookie?: string;
  csrfToken?: string;
  error?: string;
}

class FTNAuthManagerServer {
  private credentials: FTNCredentials | null = null;
  private loginInProgress = false;
  
  constructor() {
    // Server-side - no localStorage initialization
  }

  async login(email?: string, password?: string): Promise<FTNLoginResponse> {
    // Prevent multiple simultaneous login attempts
    if (this.loginInProgress) {
      throw new Error('Login already in progress');
    }

    this.loginInProgress = true;

    try {
      // Use provided credentials or fall back to environment variables
      const loginEmail = email || process.env.VITE_FTN_EMAIL;
      const loginPassword = password || process.env.VITE_FTN_PASSWORD;

      if (!loginEmail || !loginPassword) {
        throw new Error('FTN credentials not provided. Set VITE_FTN_EMAIL and VITE_FTN_PASSWORD environment variables.');
      }

      console.log('🔑 Attempting FTN login (server-side)...');

      // Step 1: Get login page to extract any CSRF tokens or form data
      const loginPageResponse = await fetch('https://www.fantasythenerds.com/nfl/player-login.php', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!loginPageResponse.ok) {
        throw new Error(`Failed to load login page: ${loginPageResponse.status}`);
      }

      // Extract cookies from login page
      const setCookieHeaders = loginPageResponse.headers.get('set-cookie');
      let initialCookies = '';
      if (setCookieHeaders) {
        initialCookies = setCookieHeaders.split(',')
          .map(cookie => cookie.split(';')[0])
          .join('; ');
      }

      // Step 2: Attempt login with credentials
      const loginData = new FormData();
      loginData.append('email', loginEmail);
      loginData.append('password', loginPassword);
      loginData.append('login', 'Login');

      const loginResponse = await fetch('https://www.fantasythenerds.com/nfl/player-login.php', {
        method: 'POST',
        body: loginData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Referer': 'https://www.fantasythenerds.com/nfl/player-login.php',
          'Cookie': initialCookies,
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'manual' // Handle redirects manually to capture session cookies
      });

      // Extract session cookies from login response
      const loginSetCookieHeaders = loginResponse.headers.get('set-cookie');
      let sessionCookie = initialCookies;
      
      if (loginSetCookieHeaders) {
        const newCookies = loginSetCookieHeaders.split(',')
          .map(cookie => cookie.split(';')[0])
          .filter(cookie => cookie.includes('='))
          .join('; ');
        
        sessionCookie = newCookies || sessionCookie;
      }

      // Check if login was successful
      const isLoginSuccessful = loginResponse.status === 302 || 
                               (loginResponse.status === 200 && !loginResponse.url.includes('login'));

      if (!isLoginSuccessful) {
        const responseText = await loginResponse.text();
        const hasError = responseText.includes('Invalid') || 
                        responseText.includes('error') || 
                        responseText.includes('failed');
        
        if (hasError) {
          throw new Error('Invalid FTN credentials');
        }
      }

      // Step 3: Verify session by accessing a protected page
      const verifyResponse = await fetch('https://www.fantasythenerds.com/nfl/weather.php', {
        headers: {
          'Cookie': sessionCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const verifyText = await verifyResponse.text();
      const isVerified = !verifyText.includes('login') && !verifyText.includes('Login');

      if (!isVerified) {
        throw new Error('Login successful but session verification failed');
      }

      // Save successful credentials (in memory for server)
      this.credentials = {
        sessionCookie,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        lastRefreshed: new Date(),
        isValid: true
      };

      console.log('✅ FTN login successful (server-side)');

      return {
        success: true,
        sessionCookie,
      };

    } catch (error: any) {
      console.error('❌ FTN login failed (server-side):', error.message);
      
      // Clear invalid credentials
      this.credentials = null;

      return {
        success: false,
        error: error.message
      };
    } finally {
      this.loginInProgress = false;
    }
  }

  async getValidSession(): Promise<string | null> {
    // Check if current session exists and is not expired
    if (this.credentials && 
        this.credentials.isValid && 
        this.credentials.expiresAt > new Date()) {
      
      console.log('📋 Using existing FTN session (server-side)');
      return this.credentials.sessionCookie;
    }

    // Need to login
    console.log('🔄 FTN session expired or missing, logging in (server-side)...');
    const loginResult = await this.login();
    
    if (!loginResult.success) {
      throw new Error(`FTN login failed: ${loginResult.error}`);
    }

    return loginResult.sessionCookie || null;
  }

  async fetchData(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const session = await this.getValidSession();
    if (!session) {
      throw new Error('No valid FTN session available');
    }

    console.log(`🌐 Fetching FTN data (server-side): ${endpoint}`);

    const response = await fetch(`https://www.fantasythenerds.com${endpoint}`, {
      ...options,
      headers: {
        'Cookie': session,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Referer': 'https://www.fantasythenerds.com',
        ...options.headers
      }
    });

    // Check if we got logged out (redirected to login)
    if (response.url.includes('login') || response.status === 401) {
      console.log('🔄 FTN session expired, re-authenticating (server-side)...');
      
      // Mark session as invalid
      if (this.credentials) {
        this.credentials.isValid = false;
      }
      
      // Try to login again and retry the request
      const newSession = await this.getValidSession();
      if (newSession) {
        return this.fetchData(endpoint, options);
      }
    }

    return response;
  }

  async getPlayerInjuries(week?: string): Promise<any[]> {
    try {
      const endpoint = `/nfl/injury-report.php${week ? `?week=${week}` : ''}`;
      const response = await this.fetchData(endpoint);
      const html = await response.text();
      
      // Parse injury data from HTML
      const injuries = this.parseInjuryData(html);
      
      console.log(`📊 Retrieved ${injuries.length} injury reports (server-side)`);
      return injuries;
    } catch (error) {
      console.error('Failed to get injury data (server-side):', error);
      throw error;
    }
  }

  async getDepthCharts(team?: string): Promise<any[]> {
    try {
      const endpoint = `/nfl/depth-charts.php${team ? `?team=${team}` : ''}`;
      const response = await this.fetchData(endpoint);
      const html = await response.text();
      
      const depthCharts = this.parseDepthChartData(html);
      
      console.log(`📊 Retrieved depth chart data (server-side)`);
      return depthCharts;
    } catch (error) {
      console.error('Failed to get depth chart data (server-side):', error);
      throw error;
    }
  }

  async getWeatherData(): Promise<any[]> {
    try {
      const endpoint = '/nfl/weather.php';
      const response = await this.fetchData(endpoint);
      const html = await response.text();
      
      const weatherData = this.parseWeatherData(html);
      
      console.log(`🌤️ Retrieved weather data for ${weatherData.length} games (server-side)`);
      return weatherData;
    } catch (error) {
      console.error('Failed to get weather data (server-side):', error);
      throw error;
    }
  }

  // Helper methods to parse HTML data (same as client version)
  private parseInjuryData(html: string): any[] {
    const injuries: any[] = [];
    
    // Basic HTML parsing - you'll need to adjust this based on FTN's actual HTML structure
    const tableRows = html.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
    
    for (const row of tableRows) {
      const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs) || [];
      if (cells.length >= 4) {
        injuries.push({
          player: cells[0]?.replace(/<[^>]*>/g, '').trim(),
          team: cells[1]?.replace(/<[^>]*>/g, '').trim(),
          position: cells[2]?.replace(/<[^>]*>/g, '').trim(),
          injury: cells[3]?.replace(/<[^>]*>/g, '').trim(),
          status: cells[4]?.replace(/<[^>]*>/g, '').trim()
        });
      }
    }
    
    return injuries;
  }

  private parseDepthChartData(html: string): any[] {
    // Implement depth chart parsing based on FTN's structure
    return [];
  }

  private parseWeatherData(html: string): any[] {
    const weatherData: any[] = [];
    
    // Parse weather information from HTML
    const gameRows = html.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
    
    for (const row of gameRows) {
      const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs) || [];
      if (cells.length >= 3) {
        weatherData.push({
          game: cells[0]?.replace(/<[^>]*>/g, '').trim(),
          temperature: cells[1]?.replace(/<[^>]*>/g, '').trim(),
          conditions: cells[2]?.replace(/<[^>]*>/g, '').trim(),
          wind: cells[3]?.replace(/<[^>]*>/g, '').trim()
        });
      }
    }
    
    return weatherData;
  }

  // Cleanup method
  logout(): void {
    this.credentials = null;
    console.log('🚪 Logged out of FTN (server-side)');
  }

  // Get status info
  getStatus(): { isLoggedIn: boolean; expiresAt?: Date; lastRefreshed?: Date } {
    if (!this.credentials) {
      return { isLoggedIn: false };
    }

    return {
      isLoggedIn: this.credentials.isValid && this.credentials.expiresAt > new Date(),
      expiresAt: this.credentials.expiresAt,
      lastRefreshed: this.credentials.lastRefreshed
    };
  }
}

// Export singleton instance for server use
export const ftnAuthServer = new FTNAuthManagerServer();