"""
Simple proxy server to bypass CORS restrictions for Claude API calls
Run this with: python proxy_server.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error

class ProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle preflight CORS requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version')
        self.end_headers()
    
    def do_POST(self):
        """Proxy POST requests to Claude API"""
        if self.path == '/v1/messages':
            try:
                # Read request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # Get headers
                api_key = self.headers.get('x-api-key','')
                anthropic_version = self.headers.get('anthropic-version', '2023-06-01')
                
                # Forward to Claude API
                url = 'https://api.anthropic.com/v1/messages'
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': api_key,
                    'anthropic-version': anthropic_version
                }
                
                req = urllib.request.Request(url, data=post_data, headers=headers, method='POST')
                
                try:
                    with urllib.request.urlopen(req) as response:
                        response_data = response.read()
                        
                        # Send success response
                        self.send_response(response.status)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(response_data)
                        
                except urllib.error.HTTPError as e:
                    # Forward error response
                    error_data = e.read()
                    self.send_response(e.code)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(error_data)
                    
            except Exception as e:
                # Internal server error
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_response = json.dumps({'error': {'message': str(e)}}).encode()
                self.wfile.write(error_response)
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        """Custom log format"""
        print(f"[Proxy] {format % args}")

def run_server(port=8001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, ProxyHandler)
    print(f"CORS Proxy Server running on http://localhost:{port}")
    print(f"Forwarding requests to Claude API")
    print(f"Application should use http://localhost:{port} as the API endpoint")
    print(f"\nPress Ctrl+C to stop the server\n")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
