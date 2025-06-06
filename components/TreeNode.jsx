import React, { useState, useEffect, useRef } from 'react';
import familyTree from "../data/familyData";
import confetti from 'canvas-confetti';
import './TreeNode.css';

// Helper to get the correct optimized image path
const getOptimizedPhotoPath = (photo) => {
  if (!photo) return '';
  // Remove 'photos/' prefix and convert .png/.jpeg/.jpg to .jpg
  const normalized = photo.replace(/^photos\//, '').replace(/\.(png|jpeg|jpg)$/i, '.jpg');
  return `optimized/${normalized.toLowerCase()}`;
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

const TreeNode = ({ node = familyTree, level = 0, onPhotoClick, expandPath = [], highlightName, activePath = [], onMaxDepth }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [glow, setGlow] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const popAudioRef = useRef(null);
  const hasChildren = node.children && node.children.length > 0;
  const childrenCount = node.children ? node.children.length : 0;
  const containerRef = useRef(null);
  const [lineWidth, setLineWidth] = useState(0);
  const [startOffset, setStartOffset] = useState(0);

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

  const handleClick = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`tree-node ${level === 0 ? 'root-node' : ''} ${isVisible ? 'visible' : ''}`}>
      <div 
        className={`node-box ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''} ${glow ? 'glow' : ''} ${highlightName === node.name ? 'highlighted' : ''} ${activePath && activePath.includes(node.name) ? 'active-path' : ''}`}
        onClick={handleClick}
        style={{
          background: getNodeColors(level).bg,
          borderColor: getNodeColors(level).border,
          color: '#fff',
        }}
      >
        {hasChildren && (
          <span className="node-indicator">
            {isExpanded ? '−' : '+'}
          </span>
        )}
        <div 
          className={`node-photo ${imageLoadError ? 'image-error' : ''}`} 
          onClick={e => {
            e.stopPropagation();
            if (popAudioRef.current) {
              popAudioRef.current.currentTime = 0;
              popAudioRef.current.play();
            }
            if (node.photo && onPhotoClick) onPhotoClick(getOptimizedPhotoPath(node.photo));
          }} 
          style={{ cursor: node.photo ? 'zoom-in' : 'default' }}
        >
          {node.photo ? (
            <img 
              src={getOptimizedPhotoPath(node.photo)} 
              alt={node.name} 
              style={{ 
                width: '85px', 
                height: '85px', 
                objectFit: 'cover', 
                borderRadius: '50%',
                display: imageLoadError ? 'none' : 'block'
              }}
              onError={() => setImageLoadError(true)}
              onLoad={() => setImageLoadError(false)}
            />
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
        <div style={{ position: "relative", display: "inline-block", width: "auto" }}>
          <div
            style={{
              width: 0,
              height: 20,
              borderLeft: `2px solid #3b82f6`,
              margin: "0 auto",
              position: "absolute",
              left: "50%",
              top: -20,
              transform: "translateX(-50%)",
              zIndex: 2,
            }}
          />
          {childrenCount > 1 && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: startOffset,
                width: lineWidth,
                borderTop: `2px solid #3b82f6`,
                zIndex: 1,
                height: 0,
              }}
            />
          )}
          <div
            className="flex flex-row gap-8 items-start justify-center"
            ref={containerRef}
            style={{
              marginTop: childrenCount > 1 ? 20 : 0,
              display: "inline-flex",
              position: "relative",
            }}
          >
            {node.children.map((child, index) => (
              <div
                key={`${child.name}-${index}`}
                className="flex flex-col items-center relative"
                style={{ minWidth: BOX_WIDTH }}
              >
                {childrenCount > 1 && (
                  <div
                    style={{
                      width: 0,
                      height: 20,
                      borderLeft: `2px solid #3b82f6`,
                      position: "absolute",
                      top: -20,
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 2,
                    }}
                  />
                )}
                <TreeNode 
                  node={child}
                  level={level + 1}
                  onPhotoClick={onPhotoClick}
                  expandPath={expandPath}
                  highlightName={highlightName}
                  activePath={activePath}
                  onMaxDepth={onMaxDepth}
                />
              </div>
            ))}
          </div>
        </div>
      )}
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
      <div className="tree-container">
        <TreeNode onPhotoClick={handlePhotoClick} expandPath={expandPath} highlightName={highlightName} activePath={activePath} onMaxDepth={handleMaxDepth} />
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
