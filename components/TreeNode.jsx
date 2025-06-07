import React, { useState, useEffect, useRef } from 'react';
import familyTree from "../data/familyData";
import confetti from 'canvas-confetti';
import './TreeNode.css';

// Helper to get the correct optimized image path
const getOptimizedPhotoPath = (photo) => {
  if (!photo) return '';
  // Remove 'photos/' prefix and convert .png/.jpeg/.jpg to .jpg
  const normalized = photo.replace(/^photos\//, '').replace(/\.(png|jpeg|jpg)$/i, '.jpg');
  return `/optimized/${normalized.toLowerCase()}`;
};

// Helper to find path to a name in the tree
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/mit|meet/g, 'meet')
    .replace(/hemi|hemangini/g, 'hemangini');
}

function findPathByName(node, name, path = []) {
  if (!node) return null;
  if (normalizeName(node.name) === normalizeName(name)) return [...path, node.name];
  if (node.children) {
    for (const child of node.children) {
      const result = findPathByName(child, name, [...path, node.name]);
      if (result) return result;
    }
  }
  return null;
}

const BOX_WIDTH = 220;

const getNodeColors = (level) => {
  // Use blue for root, red for children, more colors for deeper levels if needed
  const colors = [
    { bg: '#1a365d', border: '#3b82f6' }, // Blue
    { bg: '#9c2706', border: '#f97316' }, // Red/Orange
    { bg: '#134e4a', border: '#2dd4bf' }, // Teal
    { bg: '#581c87', border: '#c084fc' }, // Purple
  ];
  return colors[Math.min(level, colors.length - 1)];
};

const TreeNode = ({ node = familyTree, level = 0, onPhotoClick, expandPath = [], highlightName, activePath = [], onMaxDepth, maxExpandedDepth = 2 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [glow, setGlow] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const popAudioRef = useRef(null);
  const hasChildren = node.children && node.children.length > 0;
  const childrenCount = node.children ? node.children.length : 0;
  const containerRef = useRef(null);
  const [lineWidth, setLineWidth] = useState(0);
  const [startOffset, setStartOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const treeContainerRef = useRef(null);
  const imgRef = useRef(null);

  // Preload image when component mounts
  useEffect(() => {
    if (node.photo) {
      const img = new Image();
      img.src = getOptimizedPhotoPath(node.photo);
      img.onload = () => {
        setImageLoading(false);
        setImageLoaded(true);
      };
      img.onerror = () => {
        setImageLoading(false);
        setImageLoadError(true);
      };
    }
  }, [node.photo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, level * 150);
    if (!popAudioRef.current) {
      popAudioRef.current = new Audio('pop.mp3');
      popAudioRef.current.load();
    }
    if (expandPath && expandPath[level] === node.name) {
      setIsExpanded(true);
    } else if (expandPath && expandPath.length > 0) {
      setIsExpanded(false);
    }
    if (level === 0) {
      setIsExpanded(true);
    }
    return () => clearTimeout(timer);
  }, [level, expandPath, node.name]);

  useEffect(() => {
    if (onMaxDepth && isExpanded) {
      onMaxDepth(level);
    }
  }, [isExpanded, level, onMaxDepth]);

  useEffect(() => {
    if (containerRef.current && childrenCount > 1) {
      const children = Array.from(containerRef.current.children);
      const first = children[0];
      const last = children[children.length - 1];
      if (first && last) {
        const left = first.offsetLeft + BOX_WIDTH / 2;
        const right = last.offsetLeft + BOX_WIDTH / 2;
        setLineWidth(right - left);
        setStartOffset(left);
      }
    }
  }, [isExpanded, childrenCount, node.children]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleNodeClick = () => {
    if (onPhotoClick) {
      onPhotoClick(node);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - treeContainerRef.current.offsetLeft);
    setScrollLeft(treeContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - treeContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    treeContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - treeContainerRef.current.offsetLeft);
    setScrollLeft(treeContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - treeContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    treeContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleScroll = (direction) => {
    if (treeContainerRef.current) {
      const scrollAmount = 300; // Adjust this value to control scroll distance
      const currentScroll = treeContainerRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      treeContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={`tree-node ${level === 0 ? 'root-node' : ''} ${isVisible ? 'visible' : ''}`} style={{ marginLeft: `${level * 20}px` }}>
      <div 
        className={`node-box ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''} ${glow ? 'glow' : ''} ${highlightName === node.name ? 'highlighted' : ''} ${activePath && activePath.includes(node.name) ? 'active-path' : ''}`}
        onClick={handleNodeClick}
        style={{
          background: getNodeColors(level).bg,
          borderColor: getNodeColors(level).border,
          color: '#fff',
        }}
      >
        {hasChildren && (
          <button className="toggle-btn" onClick={handleToggle}>
            {isExpanded ? '−' : '+'}
          </button>
        )}
        <div 
          className={`node-photo ${imageLoadError ? 'image-error' : ''} ${imageLoading ? 'image-loading' : ''}`} 
          style={{ cursor: node.photo ? 'zoom-in' : 'default' }}
        >
          {node.photo ? (
            <>
              {imageLoading && (
                <div className="image-loading-spinner">
                  <div className="spinner"></div>
                </div>
              )}
              <img 
                ref={imgRef}
                src={getOptimizedPhotoPath(node.photo)} 
                alt={node.name} 
                loading="lazy"
                style={{ 
                  width: '85px', 
                  height: '85px', 
                  objectFit: 'cover', 
                  borderRadius: '50%',
                  display: imageLoadError ? 'none' : 'block',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out'
                }}
                onError={() => {
                  setImageLoadError(true);
                  setImageLoading(false);
                }}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageLoading(false);
                }}
              />
            </>
          ) : (
            <div className="node-photo-placeholder">
              {node.name.substring(0, 2)}
            </div>
          )}
        </div>
        <span className="node-name">{node.name}</span>
        <div className="dates-container">
          <div className="date-box">
            <span className="date-label">Born</span>
            <span className="date-value">{node.birthDate || '??/??/????'}</span>
          </div>
          <div className="date-box">
            <span className="date-label">Passed</span>
            <span className="date-value">{node.deathDate || '----'}</span>
          </div>
        </div>
      </div>
      {isExpanded && hasChildren && (
        <div
          ref={treeContainerRef}
          className="tree-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          >
            {node.children.map((child, index) => (
            <TreeNode
                key={`${child.name}-${index}`}
                  node={child}
                  level={level + 1}
                  onPhotoClick={onPhotoClick}
                  expandPath={expandPath}
                  highlightName={highlightName}
                  activePath={activePath}
                  onMaxDepth={onMaxDepth}
              maxExpandedDepth={maxExpandedDepth}
                />
            ))}
        </div>
      )}
      <button className="scroll-button scroll-left" onClick={() => handleScroll('left')}>
        <svg viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <button className="scroll-button scroll-right" onClick={() => handleScroll('right')}>
        <svg viewBox="0 0 24 24">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
  );
};

const FamilyTreeApp = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState(null);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceImageModalOpen, setSourceImageModalOpen] = useState(false);
  const [selectedSourceImage, setSelectedSourceImage] = useState(null);
  const confettiFired = useRef(false);
  const [search, setSearch] = useState('');
  const [expandPath, setExpandPath] = useState([]);
  const [highlightName, setHighlightName] = useState('');
  const [activePath, setActivePath] = useState([]);
  const [maxExpandedDepth, setMaxExpandedDepth] = useState(0);
  const treeContainerRef = useRef(null);

  const sources = [
    {
      title: "Source 1",
      description: "Original family tree documentation",
      image: "photos/source1.jpg",
      type: "document",
      date: "2024-03-15"
    },
    {
      title: "Source 2",
      description: "Historical records and archives",
      image: "photos/source2.jpg",
      type: "archive",
      date: "2024-03-14"
    },
    {
      title: "Source 3",
      description: "Family photographs collection",
      image: "photos/source3.jpg",
      type: "photo",
      date: "2024-03-13"
    },
    {
      title: "Source 4",
      description: "Ancestral documents and certificates",
      image: "photos/source4.jpg",
      type: "certificate",
      date: "2024-03-12"
    },
    {
      title: "Source 5",
      description: "Family heritage artifacts",
      image: "photos/source5.jpg",
      type: "artifact",
      date: "2024-03-11"
    }
  ];

  const handleMaxDepth = (depth) => {
    setMaxExpandedDepth(prev => (depth > prev ? depth : prev));
  };

  const handlePhotoClick = (img) => {
    setModalImg(img);
    setModalOpen(true);
    confettiFired.current = false;
  };

  const handleSourceImageClick = (image) => {
    setSelectedSourceImage(image);
    setSourceImageModalOpen(true);
  };

  const closeSourceImageModal = () => {
    setSourceImageModalOpen(false);
    setTimeout(() => setSelectedSourceImage(null), 300);
  };

  useEffect(() => {
    if (modalOpen && !confettiFired.current) {
      confettiFired.current = true;
      confetti({
        particleCount: 250,
        spread: 120,
        origin: { y: 0.4 },
        startVelocity: 50,
        scalar: 2,
        zIndex: 10000,
      });
    }
  }, [modalOpen]);

  useEffect(() => {
    setMaxExpandedDepth(0);
  }, [search]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    const path = findPathByName(familyTree, search.trim());
    if (path) {
      setExpandPath(path);
      setHighlightName(path[path.length - 1]);
      setActivePath(path);
    } else {
      setExpandPath([]);
      setHighlightName('');
      setActivePath([]);
      alert('Name not found in the family tree.');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setModalImg(null), 300);
  };

  const closeSourceModal = () => {
    setSourceModalOpen(false);
  };

  return (
    <div className="app-container">
      <div className="source-btn-container">
        <button className="source-btn" onClick={() => setSourceModalOpen(true)}>
          Source
        </button>
      </div>
      <div className="search-bar-topright">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            className="search-bar"
            placeholder="Search name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>
      </div>
      <div className="heading-center">
        <h1 className="neon-heading">Roots of the Bhatt Family</h1>
      </div>
      <div className="tree-container" ref={treeContainerRef}>
        <TreeNode 
          expandPath={expandPath} 
          highlightName={highlightName} 
          activePath={activePath} 
          onMaxDepth={handleMaxDepth} 
          maxExpandedDepth={maxExpandedDepth}
          onPhotoClick={handlePhotoClick}
        />
      </div>
      {modalOpen && modalImg && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-img-container" onClick={e => e.stopPropagation()}>
            <img src={modalImg} alt="Enlarged" className="modal-img" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }} />
            <button className="modal-close" onClick={closeModal}>&times;</button>
          </div>
        </div>
      )}
      {sourceModalOpen && (
        <div className="source-modal-overlay" onClick={closeSourceModal}>
          <div className="source-modal-content" onClick={e => e.stopPropagation()}>
            <button className="source-modal-close" onClick={closeSourceModal}>&times;</button>
            <h2 className="source-modal-title">Source Documentation</h2>
            
            {/* Drive-like header */}
            <div className="source-header">
              <div className="source-header-item">Name</div>
              <div className="source-header-item">Type</div>
              <div className="source-header-item">Date</div>
              <div className="source-header-item">Preview</div>
            </div>

            {/* Source items list */}
            <div className="source-list">
              {sources.map((source, index) => (
                <div key={index} className="source-item">
                  <div className="source-item-name">
                    <span className="source-icon">📄</span>
                    {source.title}
                  </div>
                  <div className="source-item-type">{source.type}</div>
                  <div className="source-item-date">{source.date}</div>
                  <div 
                    className="source-item-preview"
                    onClick={() => handleSourceImageClick(getOptimizedPhotoPath(source.image))}
                  >
                    <img 
                      src={getOptimizedPhotoPath(source.image)} 
                      alt={source.title}
                      className="source-thumbnail"
                    />
                    <div className="source-preview-overlay">
                      <span>View</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {sourceImageModalOpen && selectedSourceImage && (
        <div className="source-image-modal-overlay" onClick={closeSourceImageModal}>
          <div className="source-image-modal-content" onClick={e => e.stopPropagation()}>
            <button className="source-image-modal-close" onClick={closeSourceImageModal}>&times;</button>
            <img 
              src={selectedSourceImage} 
              alt="Source Document" 
              className="source-image-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export { TreeNode };
export default FamilyTreeApp;
