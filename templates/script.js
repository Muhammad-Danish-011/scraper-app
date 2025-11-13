document.addEventListener('DOMContentLoaded', function() {
  const scraperForm = document.getElementById('scraperForm');
  const loading = document.getElementById('loading');
  const errorContainer = document.getElementById('errorContainer');
  const resultContainer = document.getElementById('resultContainer');
  const clearResultsBtn = document.getElementById('clearResultsBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
  const downloadTextBtn = document.getElementById('downloadTextBtn');
  const downloadImagesBtn = document.getElementById('downloadImagesBtn');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewListBtn = document.getElementById('viewListBtn');
  const selectAllImages = document.getElementById('selectAllImages');
  const deselectAllImages = document.getElementById('deselectAllImages');
  const downloadSingleImage = document.getElementById('downloadSingleImage');
  
  // New control elements
  const copyTextBtn = document.getElementById('copyTextBtn');
  const searchTextBtn = document.getElementById('searchTextBtn');
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
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Form submission
  scraperForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const url = document.getElementById('url').value;
    const usePlaywright = document.getElementById('playwright').checked;
    
    if (!url) {
      showError('Please enter a URL');
      return;
    }
    
    // Validate URL format
    if (!isValidUrl(url)) {
      showError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }
    
    // Show loading indicator
    loading.style.display = 'block';
    errorContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    
    // Reset selected images
    selectedImages.clear();
    
    // Use backend for dynamic scraping
    scrapeWithBackend(url, usePlaywright);
  });
  
  // Clear results
  clearResultsBtn.addEventListener('click', function() {
    resultContainer.style.display = 'none';
    document.getElementById('url').value = '';
    currentScrapedData = null;
    selectedImages.clear();
  });
  
  // Image view controls
  viewGridBtn.addEventListener('click', function() {
    document.getElementById('imagesContainer').classList.remove('images-list');
    document.getElementById('imagesContainer').classList.add('images-grid');
    updateImageCardsView('grid');
  });
  
  viewListBtn.addEventListener('click', function() {
    document.getElementById('imagesContainer').classList.remove('images-grid');
    document.getElementById('imagesContainer').classList.add('images-list');
    updateImageCardsView('list');
  });
  
  // Image selection controls
  selectAllImages.addEventListener('click', function() {
    document.querySelectorAll('.image-checkbox').forEach(checkbox => {
      checkbox.checked = true;
      const imageSrc = checkbox.getAttribute('data-src');
      selectedImages.add(imageSrc);
    });
    updateSelectedImagesCount();
  });
  
  deselectAllImages.addEventListener('click', function() {
    document.querySelectorAll('.image-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    selectedImages.clear();
    updateSelectedImagesCount();
  });
  
  // Text controls
  copyTextBtn.addEventListener('click', function() {
    const textContent = document.getElementById('extractedText').textContent;
    navigator.clipboard.writeText(textContent).then(() => {
      showNotification('Text copied to clipboard');
    });
  });
  
  searchTextBtn.addEventListener('click', function() {
    textSearchInput.style.display = textSearchInput.style.display === 'none' ? 'block' : 'none';
    if (textSearchInput.style.display === 'block') {
      textSearchInput.focus();
    }
  });
  
  textSearchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const textContent = document.getElementById('extractedText');
    const originalText = textContent.getAttribute('data-original') || textContent.textContent;
    
    if (searchTerm) {
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const highlightedText = originalText.replace(regex, '<mark>$1</mark>');
      textContent.innerHTML = highlightedText;
    } else {
      textContent.textContent = originalText;
    }
  });
  
  // Links controls
  filterInternalLinks.addEventListener('click', function() {
    filterLinks('internal');
  });
  
  filterExternalLinks.addEventListener('click', function() {
    filterLinks('external');
  });
  
  showAllLinks.addEventListener('click', function() {
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
    navigator.clipboard.writeText(htmlContent).then(() => {
      showNotification('HTML copied to clipboard');
    });
  });
  
  formatHtmlBtn.addEventListener('click', function() {
    const htmlContent = document.getElementById('htmlSource').textContent;
    try {
      const formatted = formatHtml(htmlContent);
      document.getElementById('htmlSource').textContent = formatted;
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
    downloadAsZip(currentScrapedData);
  });
  
  downloadHtmlBtn.addEventListener('click', function() {
    if (!currentScrapedData) {
      alert('No HTML content to download');
      return;
    }
    downloadFile(currentScrapedData.html || '<html><body>No HTML content</body></html>', 'text/html', 'page.html');
  });
  
  downloadTextBtn.addEventListener('click', function() {
    if (!currentScrapedData) {
      alert('No text content to download');
      return;
    }
    downloadFile(currentScrapedData.textContent || 'No text content', 'text/plain', 'content.txt');
  });
  
  downloadImagesBtn.addEventListener('click', function() {
    if (selectedImages.size === 0) {
      alert('Please select at least one image to download');
      return;
    }
    downloadSelectedImages();
  });
  
  downloadJsonBtn.addEventListener('click', function() {
    if (!currentScrapedData) {
      alert('No data to download');
      return;
    }
    downloadFile(JSON.stringify(currentScrapedData, null, 2), 'application/json', 'scraped-data.json');
  });
  
  downloadSingleImage.addEventListener('click', function() {
    const src = modalImage.src;
    const alt = modalImageAlt.textContent;
    const filename = alt || 'image';
    downloadImage(src, filename);
  });
  
  // URL validation
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
  
  // Dynamic website scraping using backend
  async function scrapeWithBackend(url, usePlaywright) {
    try {
      console.log('Sending request to backend...');
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
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape website');
      }
      
      currentScrapedData = data;
      populateResults(data);
      resultContainer.style.display = 'block';
      loading.style.display = 'none';
      
    } catch (error) {
      console.error('Scraping error:', error);
      showError(`Failed to scrape website: ${error.message}. Please check the URL and try again.`);
    }
  }
  
  function showError(message) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    loading.style.display = 'none';
  }
  
  function showNotification(message) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }
  
  function populateResults(data) {
    currentScrapedData = data;
    
    // Update stats
    document.getElementById('statTitleLength').textContent = data.titleLength || data.title?.length || 0;
    document.getElementById('statLinks').textContent = data.linksCount || data.links?.length || 0;
    document.getElementById('statImages').textContent = data.imagesCount || data.images?.length || 0;
    document.getElementById('statHeadings').textContent = data.headingsCount || data.headings?.length || 0;
    document.getElementById('statWords').textContent = data.wordCount || (data.textContent ? data.textContent.split(/\s+/).length : 0);
    
    // Update page information
    document.getElementById('infoUrl').textContent = data.url;
    document.getElementById('infoTitle').textContent = data.title || 'No title';
    document.getElementById('infoDescription').textContent = data.description || 'No description';
    document.getElementById('infoFetchTime').textContent = data.fetchTime || 'Unknown';
    document.getElementById('infoContentSize').textContent = data.contentSize || 'Unknown';
    document.getElementById('infoWordCount').textContent = data.wordCount || (data.textContent ? data.textContent.split(/\s+/).length : 0);
    
    // Update content summary
    const contentSummary = data.textContent || 'No content available';
    document.getElementById('contentSummary').textContent = 
      contentSummary.substring(0, 500) + (contentSummary.length > 500 ? '...' : '');
    
    // Update extracted text
    const extractedTextElement = document.getElementById('extractedText');
    extractedTextElement.textContent = data.textContent || 'No text content extracted.';
    extractedTextElement.setAttribute('data-original', data.textContent || '');
    
    // Populate headings table
    const headingsTable = document.querySelector('#headingsTable tbody');
    headingsTable.innerHTML = '';
    if (data.headings && data.headings.length > 0) {
      data.headings.forEach(heading => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${heading.level}</td>
          <td>${heading.text}</td>
          <td>${heading.id || heading.class || ''}</td>
        `;
        headingsTable.appendChild(row);
      });
    } else {
      headingsTable.innerHTML = '<tr><td colspan="3">No headings found</td></tr>';
    }
    
    // Populate links table
    currentLinks = data.links || [];
    populateLinksTable(currentLinks);
    
    // Populate images grid
    currentImages = data.images || [];
    populateImages(currentImages);
    
    // Populate metadata table
    const metadataTable = document.querySelector('#metadataTable tbody');
    metadataTable.innerHTML = '';
    if (data.metadata && data.metadata.length > 0) {
      data.metadata.forEach(meta => {
        const row = document.createElement('tr');
        const name = meta.name || meta.property;
        row.innerHTML = `
          <td>${name}</td>
          <td>${meta.content}</td>
        `;
        metadataTable.appendChild(row);
      });
    } else {
      metadataTable.innerHTML = '<tr><td colspan="2">No metadata found</td></tr>';
    }
    
    // Populate Open Graph table
    const ogTable = document.querySelector('#ogTable tbody');
    ogTable.innerHTML = '';
    if (data.openGraph && data.openGraph.length > 0) {
      data.openGraph.forEach(og => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${og.property}</td>
          <td>${og.content}</td>
        `;
        ogTable.appendChild(row);
      });
    } else {
      ogTable.innerHTML = '<tr><td colspan="2">No Open Graph tags found</td></tr>';
    }
    
    // Populate HTML source
    const htmlSource = document.getElementById('htmlSource');
    if (data.html) {
      htmlSource.textContent = data.html;
    } else {
      htmlSource.textContent = 'No HTML source available';
    }
  }
  
  function populateLinksTable(links) {
    const linksTable = document.querySelector('#linksTable tbody');
    linksTable.innerHTML = '';
    
    if (links.length === 0) {
      linksTable.innerHTML = '<tr><td colspan="3">No links found</td></tr>';
      return;
    }
    
    // Show first 100 links to avoid performance issues
    const linksToShow = links.slice(0, 100);
    linksToShow.forEach(link => {
      const row = document.createElement('tr');
      const linkType = link.url.startsWith('/') || link.url.startsWith('#') || 
                      new URL(link.url).hostname === new URL(currentScrapedData.url).hostname ? 
                      'Internal' : 'External';
      
      row.innerHTML = `
        <td>${link.text || 'No text'}</td>
        <td><a href="${link.url}" target="_blank" rel="noopener">${link.url}</a></td>
        <td><span class="link-type ${linkType.toLowerCase()}">${linkType}</span></td>
      `;
      linksTable.appendChild(row);
    });
    
    if (links.length > 100) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="3" style="text-align: center; color: var(--secondary);">... and ${links.length - 100} more links</td>`;
      linksTable.appendChild(row);
    }
  }
  
  function filterLinks(type) {
    if (!currentLinks.length) return;
    
    let filteredLinks = [];
    if (type === 'internal') {
      filteredLinks = currentLinks.filter(link => 
        link.url.startsWith('/') || link.url.startsWith('#') || 
        new URL(link.url).hostname === new URL(currentScrapedData.url).hostname
      );
    } else if (type === 'external') {
      filteredLinks = currentLinks.filter(link => 
        !link.url.startsWith('/') && !link.url.startsWith('#') && 
        new URL(link.url).hostname !== new URL(currentScrapedData.url).hostname
      );
    } else {
      filteredLinks = currentLinks;
    }
    
    populateLinksTable(filteredLinks);
  }
  
  function filterLinksBySearch(searchTerm) {
    if (!currentLinks.length) return;
    
    const filteredLinks = currentLinks.filter(link => 
      (link.text && link.text.toLowerCase().includes(searchTerm.toLowerCase())) ||
      link.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    populateLinksTable(filteredLinks);
  }
  
  function populateImages(images) {
    const imagesContainer = document.getElementById('imagesContainer');
    imagesContainer.innerHTML = '';
    
    if (images.length === 0) {
      imagesContainer.innerHTML = '<p>No images found</p>';
      return;
    }
    
    images.forEach((image, index) => {
      const imageCard = document.createElement('div');
      imageCard.className = 'image-card image-card-grid';
      imageCard.innerHTML = `
        <img src="${image.src}" alt="${image.alt || 'Image'}" class="image-thumb" 
             data-src="${image.src}" data-alt="${image.alt || ''}" 
             data-width="${image.width || ''}" data-height="${image.height || ''}"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+'">
        <div class="image-info">
          <input type="checkbox" class="image-checkbox" data-src="${image.src}" id="img-${index}">
          <label for="img-${index}" class="image-alt">${image.alt || 'No alt text'}</label>
          <div class="image-src">${image.src}</div>
          <div class="image-dimensions">${image.width && image.height ? `${image.width}×${image.height}` : 'Unknown size'}</div>
        </div>
      `;
      imagesContainer.appendChild(imageCard);
      
      // Add click event to image for modal
      const imgElement = imageCard.querySelector('.image-thumb');
      imgElement.addEventListener('click', function() {
        openImageModal(this.src, this.alt, this.getAttribute('data-width'), this.getAttribute('data-height'));
      });
      
      // Add change event to checkbox
      const checkbox = imageCard.querySelector('.image-checkbox');
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          selectedImages.add(this.getAttribute('data-src'));
        } else {
          selectedImages.delete(this.getAttribute('data-src'));
        }
        updateSelectedImagesCount();
        
        // Add/remove selected class
        if (this.checked) {
          imageCard.classList.add('selected');
        } else {
          imageCard.classList.remove('selected');
        }
      });
    });
    
    updateSelectedImagesCount();
  }
  
  function filterImagesBySearch(searchTerm) {
    if (!currentImages.length) return;
    
    const filteredImages = currentImages.filter(image => 
      (image.alt && image.alt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      image.src.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    populateImages(filteredImages);
  }
  
  function updateImageCardsView(viewType) {
    const imageCards = document.querySelectorAll('.image-card');
    imageCards.forEach(card => {
      card.classList.remove('image-card-grid', 'image-card-list');
      card.classList.add(viewType === 'grid' ? 'image-card-grid' : 'image-card-list');
    });
  }
  
  function updateSelectedImagesCount() {
    const count = selectedImages.size;
    document.getElementById('selectedImagesCount').textContent = count;
    downloadImagesBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
      </svg>
      Selected Images (${count})
    `;
  }
  
  function openImageModal(src, alt, width, height) {
    modalImage.src = src;
    modalImageAlt.textContent = alt || 'No alt text';
    modalImageSrc.textContent = src;
    modalImageDimensions.textContent = width && height ? `${width} × ${height}` : 'Unknown dimensions';
    
    // Try to get image size
    getImageSize(src).then(size => {
      modalImageSize.textContent = size ? formatFileSize(size) : 'Unknown';
    }).catch(() => {
      modalImageSize.textContent = 'Unknown';
    });
    
    modal.style.display = 'block';
  }
  
  async function getImageSize(src) {
    try {
      const response = await fetch(src, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength) : null;
    } catch (error) {
      console.error('Error getting image size:', error);
      return null;
    }
  }
  
  function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function formatHtml(html) {
    // Simple HTML formatting
    let formatted = '';
    let indent = 0;
    const tokens = html.split(/(<[^>]*>)/);
    
    tokens.forEach(token => {
      if (token.startsWith('</')) {
        indent--;
      }
      
      formatted += '  '.repeat(Math.max(0, indent)) + token + '\n';
      
      if (token.startsWith('<') && !token.startsWith('</') && !token.endsWith('/>') && !token.startsWith('<!')) {
        indent++;
      }
    });
    
    return formatted;
  }
  
  function downloadFile(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function downloadImage(src, filename) {
    const a = document.createElement('a');
    a.href = src;
    a.download = filename || 'image';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  
  function downloadSelectedImages() {
    if (selectedImages.size === 0) return;
    
    // Download images one by one
    let count = 0;
    selectedImages.forEach(src => {
      const a = document.createElement('a');
      a.href = src;
      a.download = `image-${Date.now()}-${count}`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      count++;
    });
    
    alert(`Downloaded ${selectedImages.size} images`);
  }
  
  function downloadAsZip(data) {
    // Create a comprehensive JSON file with all data
    const zipData = {
      url: data.url,
      title: data.title,
      description: data.description,
      scrapedAt: new Date().toISOString(),
      content: {
        text: data.textContent,
        html: data.html,
        headings: data.headings,
        links: data.links,
        images: data.images,
        metadata: data.metadata,
        openGraph: data.openGraph
      }
    };
    
    downloadFile(JSON.stringify(zipData, null, 2), 'application/json', 'scraped-website-data.json');
  }
});