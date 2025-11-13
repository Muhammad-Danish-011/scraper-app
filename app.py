
from flask import Flask, request, jsonify, send_file, render_template
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
# Allow all origins for development
CORS(app)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

def fetch_static(url, timeout=30):
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    
    # Add protocol if missing
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
        
    resp = requests.get(url, headers=headers, timeout=timeout, verify=False)
    resp.raise_for_status()
    return resp.text, resp.url

def parse_html(html, base_url):
    soup = BeautifulSoup(html, "html.parser")
    
    # Basic page info
    title = soup.title.string.strip() if soup.title and soup.title.string else "No title"
    
    # Meta description
    description = ""
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        description = meta_desc["content"]
    else:
        og_desc = soup.find("meta", attrs={"property": "og:description"})
        if og_desc and og_desc.get("content"):
            description = og_desc["content"]
    
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
            headings.append({
                "level": tag.upper(), 
                "text": h.get_text(strip=True) or "No text",
                "id": h.get("id", ""),
                "class": ' '.join(h.get("class", []))
            })
    
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
                "alt": img.get("alt", "") or "No alt text",
                "width": img.get("width"),
                "height": img.get("height")
            })
        except:
            continue
    
    # Open Graph tags
    open_graph = []
    for meta in soup.find_all("meta", attrs={"property": True}):
        if meta["property"].startswith("og:"):
            open_graph.append({
                "property": meta["property"],
                "content": meta.get("content", "")
            })
    
    # Text content
    for s in soup(["script", "style", "noscript"]):
        s.decompose()
    
    body_text = soup.get_text(separator=' ')
    body_text = ' '.join(body_text.split())
    
    return {
        "title": title,
        "description": description,
        "metadata": metas,
        "headings": headings,
        "links": links,
        "images": images,
        "openGraph": open_graph,
        "textContent": body_text,
        "html": html
    }




@app.route('/')
def home():
    return render_template('index.html')


@app.route('/scrape', methods=['POST', 'OPTIONS'])
def scrape():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        url = data.get('url', '').strip()
        use_playwright = data.get('usePlaywright', False)
        
        if not url:
            return jsonify({"error": "URL is required"}), 400
        
        print(f"Scraping URL: {url}")
        start_time = time.time()
        
        try:
            html, final_url = fetch_static(url)
            parsed_data = parse_html(html, final_url)
            
            # Calculate word count
            word_count = len(parsed_data["textContent"].split())
            
            # Add statistics and response data
            response_data = {
                "url": final_url,
                "title": parsed_data["title"],
                "description": parsed_data["description"],
                "textContent": parsed_data["textContent"],
                "html": parsed_data["html"],
                "headings": parsed_data["headings"],
                "links": parsed_data["links"],
                "images": parsed_data["images"],
                "metadata": parsed_data["metadata"],
                "openGraph": parsed_data["openGraph"],
                "fetchTime": f"{time.time() - start_time:.2f}s",
                "contentSize": f"{len(html) / 1024:.1f} KB",
                "wordCount": word_count,
                "titleLength": len(parsed_data["title"]),
                "linksCount": len(parsed_data["links"]),
                "imagesCount": len(parsed_data["images"]),
                "headingsCount": len(parsed_data["headings"])
            }

            print(f"Successfully scraped: {final_url}")
            print(f"Found: {len(parsed_data['links'])} links, {len(parsed_data['images'])} images")
            
            return jsonify(response_data)
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to fetch URL: {str(e)}"
            print(f"Request error: {error_msg}")
            return jsonify({"error": error_msg}), 500
        except Exception as e:
            error_msg = f"Error parsing content: {str(e)}"
            print(f"Parsing error: {error_msg}")
            return jsonify({"error": error_msg}), 500
        
    except Exception as e:
        error_msg = f"Server error: {str(e)}"
        print(f"Server error: {error_msg}")
        return jsonify({"error": error_msg}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "timestamp": time.time()})

if __name__ == '__main__':
    print("🚀 Starting Advanced Web Scraper API...")
    print("📍 Backend running on: http://localhost:5000")
    print("📋 Available endpoints:")
    print("   - GET  /          : API status")
    print("   - POST /scrape    : Scrape website")
    print("   - GET  /health    : Health check")
    print("\n⚠️  Make sure to install required packages:")
    print("   pip install flask flask-cors requests beautifulsoup4")
    
    # Disable SSL warnings for development
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    app.run(debug=True, port=5000, host='0.0.0.0')