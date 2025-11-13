document.addEventListener('DOMContentLoaded', function() {
  const scraperForm = document.getElementById('scraperForm');
  const loading = document.getElementById('loading');
  const errorContainer = document.getElementById('errorContainer');
  const resultContainer = document.getElementById('resultContainer');
  const clearResultsBtn = document.getElementById('clearResultsBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const retryButton = document.getElementById('retryButton');
  
  // Control elements
  const copyTextBtn = document.getElementById('copyTextBtn');
  const textSearchInput = document.getElementById('textSearchInput');
  const filterInternalLinks = document.getElementById('filterInternalLinks');
  const filterExternalLinks = document.getElementById('filterExternalLinks');
  const showAllLinks = document.getElementById('showAllLinks');
  const linksSearchInput = document.getElementById('linksSearchInput');
  const imagesSearchInput = document.getElementById('imagesSearchInput');
  const copyHtmlBtn = document.getElementById('copyHtmlBtn');
  const formatHtmlBtn = document.getElementById('formatHtmlBtn');
  
  // Modal elements
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalImageSrc = document.getElementById('modalImageSrc');
  const modalImageAlt = document.getElementById('modalImageAlt');
  const modalImageDimensions = document.getElementById('modalImageDimensions');
  const modalImageSize = document.getElementById('modalImageSize');
  const closeModal = document.querySelector('.close');
  
  let currentScrapedData = null;
  let selectedImages = new Set();
  let currentLinks = [];
  let currentImages = [];
  
  // Tab functionality
  const tabNavItems = document.querySelectorAll('.tab-nav-item');
  tabNavItems.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-nav-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      const tabContent = document.getElementById(tabId);
      if (tabContent) {
        tabContent.classList.add('active');
      }
    });
  });
  
  // Form submission
  scraperForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const url = document.getElementById('url').value.trim();
    const usePlaywright = document.getElementById('playwright').checked;
    
    if (!url) {
      showError('Please enter a URL');
      return;
    }
    
    // Show loading indicator
    showLoading();
    hideError();
    hideResults();
    
    // Reset selected images
    selectedImages.clear();
    
    // Scrape the website
    await scrapeWebsite(url, usePlaywright);
  });
  
  // Retry button
  retryButton.addEventListener('click', function() {
    const url = document.getElementById('url').value.trim();
    const usePlaywright = document.getElementById('playwright').checked;
    
    if (url) {
      scrapeWebsite(url, usePlaywright);
    }
  });
  
  // Clear results
  clearResultsBtn.addEventListener('click', function() {
    hideResults();
    document.getElementById('url').value = '';
    currentScrapedData = null;
    selectedImages.clear();
    updateSelectedImagesCount();
  });
  
  // Text controls
  copyTextBtn.addEventListener('click', function() {
    const textContent = document.getElementById('extractedText').textContent;
    copyToClipboard(textContent, 'Text copied to clipboard');
  });
  
  textSearchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const textContent = document.getElementById('extractedText');
    const originalText = textContent.getAttribute('data-original') || textContent.textContent;
    
    if (searchTerm) {
      const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
      const highlightedText = originalText.replace(regex, '<mark>$1</mark>');
      textContent.innerHTML = highlightedText;
    } else {
      textContent.textContent = originalText;
    }
  });
  
  // Links controls
  filterInternalLinks.addEventListener('click', function() {
    updateLinkFilterButtons('internal');
    filterLinks('internal');
  });
  
  filterExternalLinks.addEventListener('click', function() {
    updateLinkFilterButtons('external');
    filterLinks('external');
  });
  
  showAllLinks.addEventListener('click', function() {
    updateLinkFilterButtons('all');
    filterLinks('all');
  });
  
  linksSearchInput.addEventListener('input', function() {
    filterLinksBySearch(this.value);
  });
  
  // Images search
  imagesSearchInput.addEventListener('input', function() {
    filterImagesBySearch(this.value);
  });
  
  // HTML controls
  copyHtmlBtn.addEventListener('click', function() {
    const htmlContent = document.getElementById('htmlSource').textContent;
    copyToClipboard(htmlContent, 'HTML copied to clipboard');
  });
  
  formatHtmlBtn.addEventListener('click', function() {
    const htmlContent = document.getElementById('htmlSource').textContent;
    try {
      const formatted = formatHtml(htmlContent);
      document.getElementById('htmlSource').textContent = formatted;
      showNotification('HTML formatted successfully');
    } catch (e) {
      showNotification('Error formatting HTML');
    }
  });
  
  // Modal functionality
  closeModal.addEventListener('click', function() {
    modal.style.display = 'none';
  });
  
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Download buttons
  downloadAllBtn.addEventListener('click', function() {
    if (!currentScrapedData) {
      alert('No data to download');
      return;
    }
    downloadAsJson(currentScrapedData);
  });
  
  // Helper functions
  function showLoading() {
    loading.style.display = 'block';
    updateProgress('Initializing scraper...', 10);
  }
  
  function hideLoading() {
    loading.style.display = 'none';
  }
  
  function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    errorContainer.style.display = 'block';
    hideLoading();
  }
  
  function hideError() {
    errorContainer.style.display = 'none';
  }
  
  function showResults() {
    resultContainer.style.display = 'block';
  }
  
  function hideResults() {
    resultContainer.style.display = 'none';
  }
  
  function updateProgress(text, percent) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressText) progressText.textContent = text;
  }
  
  async function scrapeWebsite(url, usePlaywright) {
    try {
      updateProgress('Connecting to server...', 30);
      
      const response = await fetch('http://localhost:5000/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          usePlaywright: usePlaywright
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      
      updateProgress('Processing website content...', 70);
      
      const data = await response.json();
      
      updateProgress('Finalizing...', 100);
      
      // Wait a bit to show 100% progress
      setTimeout(() => {
        currentScrapedData = data;
        populateResults(data);
        showResults();
        hideLoading();
        showNotification('Website scraped successfully!');
      }, 500);
      
    } catch (error) {
      console.error('Scraping error:', error);
      showError(`Failed to scrape website: ${error.message}`);
    }
  }
  
  function populateResults(data) {
    currentScrapedData = data;
    
    // Update result URL and title
    const resultUrl = document.getElementById('resultUrl');
    const resultTitle = document.getElementById('resultTitle');
    if (resultUrl) resultUrl.textContent = data.url;
    if (resultTitle) resultTitle.innerHTML = `<i class="fas fa-file-alt"></i> Scraping Results: ${data.title}`;
    
    // Update stats
    updateStat('statTitleLength', data.titleLength);
    updateStat('statLinks', data.linksCount);
    updateStat('statImages', data.imagesCount);
    updateStat('statHeadings', data.headingsCount);
    updateStat('statWords', data.wordCount);
    
    // Update badges
    updateBadge('linksBadge', data.linksCount);
    updateBadge('imagesBadge', data.imagesCount);
    
    // Update page information
    updateInfo('infoUrl', data.url);
    updateInfo('infoTitle', data.title);
    updateInfo('infoDescription', data.description);
    updateInfo('infoFetchTime', data.fetchTime);
    updateInfo('infoContentSize', data.contentSize);
    updateInfo('infoWordCount', data.wordCount);
    
    // Update content summary
    const contentSummary = document.getElementById('contentSummary');
    if (data.textContent) {
      contentSummary.textContent = data.textContent.substring(0, 500) + 
        (data.textContent.length > 500 ? '...' : '');
    } else {
      contentSummary.textContent = 'No content available';
    }
    
    // Update extracted text
    const extractedText = document.getElementById('extractedText');
    extractedText.textContent = data.textContent || 'No text content extracted.';
    extractedText.setAttribute('data-original', data.textContent || '');
    
    // Populate headings table
    populateHeadingsTable(data.headings);
    
    // Populate links
    currentLinks = data.links || [];
    populateLinksTable(currentLinks);
    
    // Populate images
    currentImages = data.images || [];
    populateImages(currentImages);
    
    // Populate metadata tables
    populateMetadataTable(data.metadata);
    populateOpenGraphTable(data.openGraph);
    
    // Populate HTML source
    const htmlSource = document.getElementById('htmlSource');
    htmlSource.textContent = data.html || 'No HTML source available';
  }
  
  function updateStat(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = value || 0;
  }
  
  function updateBadge(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = value || 0;
  }
  
  function updateInfo(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = value || 'Not available';
  }
  
  function populateHeadingsTable(headings) {
    const tbody = document.querySelector('#headingsTable tbody');
    tbody.innerHTML = '';
    
    if (!headings || headings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No headings found</td></tr>';
      return;
    }
    
    headings.forEach(heading => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${heading.level}</td>
        <td>${heading.text}</td>
        <td>${heading.id || heading.class || ''}</td>
      `;
      tbody.appendChild(row);
    });
  }
  
  function populateLinksTable(links) {
    const tbody = document.querySelector('#linksTable tbody');
    tbody.innerHTML = '';
    
    if (!links || links.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No links found</td></tr>';
      return;
    }
    
    const linksToShow = links.slice(0, 100);
    linksToShow.forEach(link => {
      const row = document.createElement('tr');
      const linkType = classifyLink(link.url);
      
      row.innerHTML = `
        <td>${link.text}</td>
        <td><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.url}</a></td>
        <td><span class="link-type ${linkType}">${linkType}</span></td>
      `;
      tbody.appendChild(row);
    });
    
    if (links.length > 100) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="3" style="text-align: center; color: var(--secondary);">
        ... and ${links.length - 100} more links
      </td>`;
      tbody.appendChild(row);
    }
  }
  
  function classifyLink(url) {
    if (!currentScrapedData?.url) return 'external';
    
    try {
      const baseHost = new URL(currentScrapedData.url).hostname;
      const linkHost = new URL(url).hostname;
      return linkHost === baseHost ? 'internal' : 'external';
    } catch {
      return url.startsWith('#') ? 'anchor' : 'external';
    }
  }
  
  function populateImages(images) {
    const container = document.getElementById('imagesContainer');
    container.innerHTML = '';
    
    if (!images || images.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--accent); padding: 20px;">No images found</p>';
      return;
    }
    
    document.getElementById('totalImagesCount').textContent = images.length;
    
    images.forEach((image, index) => {
      const imageItem = document.createElement('div');
      imageItem.className = 'image-item';
      imageItem.innerHTML = `
        <img src="${image.src}" alt="${image.alt}" class="image-thumb"
             data-src="${image.src}" data-alt="${image.alt}"
             data-width="${image.width || ''}" data-height="${image.height || ''}">
        <div class="image-details">
          <input type="checkbox" class="image-checkbox" data-src="${image.src}" id="img-${index}">
          <label for="img-${index}" class="image-alt">${image.alt}</label>
          <div class="image-src">${image.src}</div>
          <div class="image-dimensions">${image.width && image.height ? `${image.width}×${image.height}` : 'Unknown size'}</div>
        </div>
      `;
      container.appendChild(imageItem);
      
      // Add image click event for modal
      const img = imageItem.querySelector('.image-thumb');
      img.addEventListener('click', () => {
        openImageModal(image.src, image.alt, image.width, image.height);
      });
      
      // Add error handling for broken images
      img.addEventListener('error', function() {
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+';
      });
      
      // Add checkbox event
      const checkbox = imageItem.querySelector('.image-checkbox');
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          selectedImages.add(this.dataset.src);
          imageItem.classList.add('selected');
        } else {
          selectedImages.delete(this.dataset.src);
          imageItem.classList.remove('selected');
        }
        updateSelectedImagesCount();
      });
    });
    
    updateSelectedImagesCount();
  }
  
  function populateMetadataTable(metadata) {
    const tbody = document.querySelector('#metadataTable tbody');
    tbody.innerHTML = '';
    
    if (!metadata || metadata.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2">No metadata found</td></tr>';
      return;
    }
    
    metadata.forEach(meta => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${meta.name}</td>
        <td>${meta.content}</td>
      `;
      tbody.appendChild(row);
    });
  }
  
  function populateOpenGraphTable(openGraph) {
    const tbody = document.querySelector('#ogTable tbody');
    tbody.innerHTML = '';
    
    if (!openGraph || openGraph.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2">No Open Graph tags found</td></tr>';
      return;
    }
    
    openGraph.forEach(og => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${og.property}</td>
        <td>${og.content}</td>
      `;
      tbody.appendChild(row);
    });
  }
  
  function updateLinkFilterButtons(activeFilter) {
    [showAllLinks, filterInternalLinks, filterExternalLinks].forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (activeFilter === 'all') showAllLinks.classList.add('active');
    if (activeFilter === 'internal') filterInternalLinks.classList.add('active');
    if (activeFilter === 'external') filterExternalLinks.classList.add('active');
  }
  
  function filterLinks(type) {
    if (!currentLinks.length) return;
    
    let filtered = currentLinks;
    if (type === 'internal') {
      filtered = currentLinks.filter(link => classifyLink(link.url) === 'internal');
    } else if (type === 'external') {
      filtered = currentLinks.filter(link => classifyLink(link.url) === 'external');
    }
    
    populateLinksTable(filtered);
  }
  
  function filterLinksBySearch(term) {
    if (!currentLinks.length) return;
    
    const filtered = currentLinks.filter(link => 
      link.text.toLowerCase().includes(term.toLowerCase()) ||
      link.url.toLowerCase().includes(term.toLowerCase())
    );
    
    populateLinksTable(filtered);
  }
  
  function filterImagesBySearch(term) {
    if (!currentImages.length) return;
    
    const filtered = currentImages.filter(image => 
      image.alt.toLowerCase().includes(term.toLowerCase()) ||
      image.src.toLowerCase().includes(term.toLowerCase())
    );
    
    populateImages(filtered);
  }
  
  function updateSelectedImagesCount() {
    const count = selectedImages.size;
    document.getElementById('selectedImagesCount').textContent = count;
  }
  
  function openImageModal(src, alt, width, height) {
    modalImage.src = src;
    modalImageAlt.textContent = alt;
    modalImageSrc.textContent = src;
    modalImageDimensions.textContent = width && height ? `${width} × ${height}` : 'Unknown dimensions';
    modalImageSize.textContent = 'Loading...';
    
    modal.style.display = 'block';
    
    // Try to get image size
    getImageSize(src).then(size => {
      modalImageSize.textContent = size ? formatFileSize(size) : 'Unknown';
    }).catch(() => {
      modalImageSize.textContent = 'Unknown';
    });
  }
  
  async function getImageSize(src) {
    try {
      const response = await fetch(src, { method: 'HEAD' });
      const size = response.headers.get('content-length');
      return size ? parseInt(size) : null;
    } catch {
      return null;
    }
  }
  
  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
  
  function formatHtml(html) {
    // Simple HTML formatting
    let formatted = '';
    let indent = 0;
    
    html.split(/(<[^>]*>)/).forEach(token => {
      if (token.startsWith('</')) indent--;
      formatted += '  '.repeat(Math.max(0, indent)) + token + '\n';
      if (token.startsWith('<') && !token.startsWith('</') && !token.endsWith('/>')) indent++;
    });
    
    return formatted;
  }
  
  function copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification(successMessage);
    }).catch(() => {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification(successMessage);
    });
  }
  
  function downloadAsJson(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraped-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-weight: 600;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }
  
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
});