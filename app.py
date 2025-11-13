from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import json
import tempfile
import os
import time
from urllib.parse import urljoin, urlparse
import zipfile
import io

app = Flask(__name__)
CORS(app, origins=["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:3000"  , "http://127.0.0.1:5000", ])

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

def fetch_static(url, timeout=20):
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.text, resp.url

def parse_html(html, base_url):
    soup = BeautifulSoup(html, "html.parser")
    
    # Basic page info
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    
    # Meta tags
    metas = []
    for m in soup.find_all("meta"):
        name = m.get("name") or m.get("property") or m.get("http-equiv")
        content = m.get("content")
        if name and content:
            metas.append({"name": name, "content": content})
    
    # Headings
    headings = []
    for tag in ["h1", "h2", "h3", "h4", "h5", "h6"]:
        for h in soup.find_all(tag):
            headings.append({"level": tag.upper(), "text": h.get_text(strip=True)})
    
    # Links
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        try:
            full_url = urljoin(base_url, href)
            links.append({
                "text": a.get_text(strip=True) or 'No text', 
                "url": full_url
            })
        except:
            continue
    
    # Images
    images = []
    for img in soup.find_all("img", src=True):
        src = img["src"]
        try:
            full_src = urljoin(base_url, src)
            images.append({
                "src": full_src,
                "alt": img.get("alt", ""),
                "width": img.get("width"),
                "height": img.get("height")
            })
        except:
            continue
    
    # Text content
    for s in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        s.decompose()
    
    body_text = soup.get_text(separator=' ')
    body_text = ' '.join(body_text.split())
    
    return {
        "title": title,
        "meta": metas,
        "headings": headings,
        "links": links,
        "images": images,
        "textContent": body_text,
        "html": html
    }

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Web Scraper API is running!", "status": "healthy"})

@app.route('/scrape', methods=['POST', 'GET', 'OPTIONS'])
def scrape():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if request.method == 'GET':
            return jsonify({"error": "Use POST method to scrape websites"}), 400
            
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        url = data.get('url', '').strip()
        use_playwright = data.get('usePlaywright', False)
        
        if not url:
            return jsonify({"error": "URL is required"}), 400
        
        # Validate URL
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return jsonify({"error": "Invalid URL format"}), 400
        except:
            return jsonify({"error": "Invalid URL format"}), 400
        
        start_time = time.time()
        
        try:
            print(f"Scraping URL: {url}")
            html, final_url = fetch_static(url)
            parsed_data = parse_html(html, final_url)
            
            # Add statistics
            parsed_data["url"] = final_url
            parsed_data["fetchTime"] = f"{time.time() - start_time:.2f}s"
            parsed_data["contentSize"] = f"{len(html) / 1024:.1f} KB"
            parsed_data["titleLength"] = len(parsed_data["title"])
            parsed_data["linksCount"] = len(parsed_data["links"])
            parsed_data["imagesCount"] = len(parsed_data["images"])
            parsed_data["headingsCount"] = len(parsed_data["headings"])
            parsed_data["scrapedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
            
            print(f"Successfully scraped: {final_url}")
            return jsonify(parsed_data)
            
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            return jsonify({"error": f"Failed to fetch URL: {str(e)}"}), 500
        except Exception as e:
            print(f"Parsing error: {e}")
            return jsonify({"error": f"Error parsing content: {str(e)}"}), 500
        
    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    print("Starting Web Scraper API...")
    print("Backend running on: http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')