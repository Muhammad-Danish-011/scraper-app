document.addEventListener('DOMContentLoaded', function() {
  const scraperForm = document.getElementById('scraperForm');
  const loading = document.getElementById('loading');
  const errorContainer = document.getElementById('errorContainer');
  const resultContainer = document.getElementById('resultContainer');
  const clearResultsBtn = document.getElementById('clearResultsBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const retryButton = document.getElementById('retryButton');
  
  // Download buttons
  const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
  const downloadTextBtn = document.getElementById('downloadTextBtn');
  const downloadImagesBtn = document.getElementById('downloadImagesBtn');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  
  // Image view controls
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewListBtn = document.getElementById('viewListBtn');
  const selectAllImages = document.getElementById('selectAllImages');
  const deselectAllImages = document.getElementById('deselectAllImages');
  const downloadSingleImage = document.getElementById('downloadSingleImage');
  
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
      showLoading();
      hideError();
      scrapeWebsite(url, usePlaywright);
    }
  });
  
  // Clear results
  clearResultsBtn.addEventListener('click', function() {
    resultContainer.style.display = 'none';
    document.getElementById('url').value = '';
    currentScrapedData = null;
    selectedImages.clear();
    updateSelectedImagesCount();
  });
  
  // Image view controls
  viewGridBtn.addEventListener('click', function() {
    const imagesContainer = document.getElementById('imagesContainer');
    imagesContainer.classList.remove('images-list');
    imagesContainer.classList.add('images-grid');
    
    viewGridBtn.classList.add('active');
    viewListBtn.classList.remove('active');
  });
  
  viewListBtn.addEventListener('click', function() {
    const imagesContainer = document.getElementById('imagesContainer');
    imagesContainer.classList.remove('images-grid');
    imagesContainer.classList.add('images-list');
    
    viewListBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
  });
  
  // Image selection controls
  selectAllImages.addEventListener('click', function() {
    document.querySelectorAll('.image-checkbox').forEach(checkbox => {
      checkbox.checked = true;
      const imageSrc = checkbox.getAttribute('data-src');
      selectedImages.add(imageSrc);
      
      const imageItem = checkbox.closest('.image-item');
      if (imageItem) {
        imageItem.classList.add('selected');
      }
    });
    updateSelectedImagesCount();
  });
  
  deselectAllImages.addEventListener('click', function() {
    document.querySelectorAll('.image-checkbox').forEach(checkbox => {
      checkbox.checked = false;
      const imageItem = checkbox.closest('.image-item');
      if (imageItem) {
        imageItem.classList.remove('selected');
      }
    });
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
  
  function updateLinkFilterButtons(activeFilter) {
    [showAllLinks, filterInternalLinks, filterExternalLinks].forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (activeFilter === 'all') showAllLinks.classList.add('active');
    if (activeFilter === 'internal') filterInternalLinks.classList.add('active');
    if (activeFilter === 'external') filterExternalLinks.classList.add('active');
  }
  
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
  
  // Download buttons - FIXED VERSION
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
    const htmlContent = currentScrapedData.html || '<html><body>No HTML content</body></html>';
    const filename = generateFilename('page', 'html');
    downloadFile(htmlContent, 'text/html', filename);
  });
  
  downloadTextBtn.addEventListener('click', function() {
    if (!currentScrapedData) {
      alert('No text content to download');
      return;
    }
    const textContent = currentScrapedData.textContent || 'No text content';
    const filename = generateFilename('content', 'txt');
    downloadFile(textContent, 'text/plain', filename);
  });
  
  downloadImagesBtn.addEventListener('click', function() {
    if (selectedImages.size === 0) {
      alert('Please select at least one image to download');
      return;
    }
    downloadSelectedImagesAsZip();
  });
  
  downloadJsonBtn.addEventListener('click', function() {
    if (!currentScrapedData) {
      alert('No data to download');
      return;
    }
    const jsonContent = JSON.stringify(currentScrapedData, null, 2);
    const filename = generateFilename('scraped-data', 'json');
    downloadFile(jsonContent, 'application/json', filename);
  });
  
  downloadSingleImage.addEventListener('click', function() {
    const src = modalImage.src;
    const alt = modalImageAlt.textContent;
    const filename = generateImageFilename(alt, src);
    downloadImage(src, filename);
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
        
        console.log('Sending scrape request for:', url);
        
        const response = await fetch('/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                usePlaywright: usePlaywright
            })
        });
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                throw new Error(errorData.error || `Server returned ${response.status}: ${response.statusText}`);
            } catch (e) {
                if (e.message.includes('JSON')) {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }
                throw e;
            }
        }
        
        let data;
        try {
            data = await response.json();
            console.log('Received data:', data);
        } catch (e) {
            console.error('JSON parse error:', e);
            throw new Error('Invalid JSON response from server');
        }
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        updateProgress('Processing website content...', 70);
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateProgress('Finalizing...', 100);
        
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
    
    const resultUrl = document.getElementById('resultUrl');
    const resultTitle = document.getElementById('resultTitle');
    if (resultUrl) resultUrl.textContent = data.url;
    if (resultTitle) resultTitle.innerHTML = `<i class="fas fa-file-alt"></i> Scraping Results: ${data.title}`;
    
    updateStat('statTitleLength', data.titleLength);
    updateStat('statLinks', data.linksCount);
    updateStat('statImages', data.imagesCount);
    updateStat('statHeadings', data.headingsCount);
    updateStat('statWords', data.wordCount);
    
    updateBadge('linksBadge', data.linksCount);
    updateBadge('imagesBadge', data.imagesCount);
    
    updateInfo('infoUrl', data.url);
    updateInfo('infoTitle', data.title);
    updateInfo('infoDescription', data.description);
    updateInfo('infoFetchTime', data.fetchTime);
    updateInfo('infoContentSize', data.contentSize);
    updateInfo('infoWordCount', data.wordCount);
    
    const contentSummary = document.getElementById('contentSummary');
    if (data.textContent) {
      contentSummary.textContent = data.textContent.substring(0, 500) + 
        (data.textContent.length > 500 ? '...' : '');
    } else {
      contentSummary.textContent = 'No content available';
    }
    
    const extractedText = document.getElementById('extractedText');
    extractedText.textContent = data.textContent || 'No text content extracted.';
    extractedText.setAttribute('data-original', data.textContent || '');
    
    populateHeadingsTable(data.headings);
    
    currentLinks = data.links || [];
    populateLinksTable(currentLinks);
    
    currentImages = data.images || [];
    populateImages(currentImages);
    
    populateMetadataTable(data.metadata);
    populateOpenGraphTable(data.openGraph);
    
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
      
      const img = imageItem.querySelector('.image-thumb');
      img.addEventListener('click', () => {
        openImageModal(image.src, image.alt, image.width, image.height);
      });
      
      img.addEventListener('error', function() {
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+';
      });
      
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
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification(successMessage);
    });
  }
  
  // Enhanced Download Functions
  function downloadFile(content, mimeType, filename) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification(`Downloaded: ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      showNotification('Download failed. Please try again.');
    }
  }
  
  function downloadImage(src, filename) {
    try {
      const a = document.createElement('a');
      a.href = src;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showNotification(`Downloaded: ${filename}`);
    } catch (error) {
      console.error('Image download error:', error);
      showNotification('Image download failed. Please try again.');
    }
  }
  
  async function downloadSelectedImagesAsZip() {
    if (selectedImages.size === 0) return;
    
    try {
      showNotification(`Preparing ${selectedImages.size} images for download...`);
      
      // Check if JSZip is available
      if (typeof JSZip === 'undefined') {
        // Fallback: download images individually
        downloadSelectedImagesIndividually();
        return;
      }
      
      const zip = new JSZip();
      let completed = 0;
      const errors = [];
      
      // Create a folder for images
      const imgFolder = zip.folder("images");
      
      // Fetch and add each selected image to the ZIP
      for (const [index, src] of Array.from(selectedImages).entries()) {
        try {
          const response = await fetch(src);
          if (!response.ok) {
            errors.push(`Failed to fetch: ${src}`);
            continue;
          }
          
          const blob = await response.blob();
          const extension = getImageExtensionFromBlob(blob) || getImageExtensionFromUrl(src) || 'jpg';
          const filename = `image-${index + 1}.${extension}`;
          
          imgFolder.file(filename, blob);
          completed++;
        } catch (error) {
          console.error(`Error fetching image ${src}:`, error);
          errors.push(`Failed: ${src}`);
        }
      }
      
      if (completed > 0) {
        const zipBlob = await zip.generateAsync({type: 'blob'});
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `images-${new Date().getTime()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (errors.length > 0) {
          showNotification(`Downloaded ${completed} images (${errors.length} failed)`);
        } else {
          showNotification(`Successfully downloaded ${completed} images as ZIP`);
        }
      } else {
        showNotification('No images could be downloaded');
      }
    } catch (error) {
      console.error('ZIP creation failed:', error);
      // Fallback to individual downloads
      downloadSelectedImagesIndividually();
    }
  }
  
  function downloadSelectedImagesIndividually() {
    let count = 0;
    selectedImages.forEach(src => {
      setTimeout(() => {
        try {
          const extension = getImageExtensionFromUrl(src) || 'jpg';
          const filename = `image-${count + 1}.${extension}`;
          downloadImage(src, filename);
        } catch (error) {
          console.error(`Error downloading image ${src}:`, error);
        }
      }, count * 300); // Stagger downloads to avoid browser issues
      count++;
    });
    
    showNotification(`Downloading ${selectedImages.size} images individually...`);
  }
  
  async function downloadAsZip(data) {
    try {
      showNotification('Preparing complete dataset for download...');
      
      if (typeof JSZip === 'undefined') {
        // Fallback: download JSON only
        downloadAsJson(data);
        return;
      }
      
      const zip = new JSZip();
      
      // Add JSON data
      zip.file("scraped-data.json", JSON.stringify(data, null, 2));
      
      // Add HTML content
      if (data.html) {
        zip.file("page.html", data.html);
      }
      
      // Add text content
      if (data.textContent) {
        zip.file("content.txt", data.textContent);
      }
      
      // Add images if any are selected
      if (selectedImages.size > 0) {
        const imgFolder = zip.folder("images");
        let imageCount = 0;
        
        for (const src of Array.from(selectedImages).slice(0, 20)) { // Limit to 20 images to avoid timeout
          try {
            const response = await fetch(src);
            if (response.ok) {
              const blob = await response.blob();
              const extension = getImageExtensionFromBlob(blob) || getImageExtensionFromUrl(src) || 'jpg';
              const filename = `image-${++imageCount}.${extension}`;
              imgFolder.file(filename, blob);
            }
          } catch (error) {
            console.error(`Error fetching image for ZIP: ${src}`, error);
          }
        }
      }
      
      const zipBlob = await zip.generateAsync({type: 'blob'});
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `web-scraper-data-${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('Complete dataset downloaded as ZIP');
    } catch (error) {
      console.error('Complete ZIP download failed:', error);
      // Fallback to JSON only
      downloadAsJson(data);
    }
  }
  
  function downloadAsJson(data) {
    const jsonContent = JSON.stringify(data, null, 2);
    const filename = generateFilename('scraped-data', 'json');
    downloadFile(jsonContent, 'application/json', filename);
  }
  
  // Utility functions for download
  function generateFilename(base, extension) {
    const timestamp = new Date().getTime();
    return `${base}-${timestamp}.${extension}`;
  }
  
  function generateImageFilename(alt, src) {
    let filename = 'image';
    
    if (alt && alt !== 'No alt text' && alt !== '') {
      filename = alt.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    }
    
    const extension = getImageExtensionFromUrl(src) || 'jpg';
    const timestamp = new Date().getTime();
    
    return `${filename}-${timestamp}.${extension}`;
  }
  
  function getImageExtensionFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
      return match ? match[1].toLowerCase() : null;
    } catch {
      return null;
    }
  }
  
  function getImageExtensionFromBlob(blob) {
    const type = blob.type;
    if (type.includes('jpeg')) return 'jpg';
    if (type.includes('png')) return 'png';
    if (type.includes('gif')) return 'gif';
    if (type.includes('webp')) return 'webp';
    if (type.includes('bmp')) return 'bmp';
    if (type.includes('svg')) return 'svg';
    return null;
  }
  
  function showNotification(message) {
    // Remove existing notifications
    document.querySelectorAll('.custom-notification').forEach(notification => {
      notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = 'custom-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success, #28a745);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-weight: 600;
      max-width: 300px;
      word-wrap: break-word;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 4000);
  }
  
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
});