import React, { useState, useEffect, useRef } from 'react';
import familyTree from "../data/familyData";
import confetti from 'canvas-confetti';
import './TreeNode.css';

// Translations object
const translations = {
  en: {
    searchPlaceholder: "Search name...",
    source: "Source",
    rootsOfFamily: "Roots of the Bhatt Family",
    born: "Born",
    passed: "Passed",
    sourceDocumentation: "Source Documentation",
    name: "Name",
    type: "Type",
    date: "Date",
    preview: "Preview",
    view: "View",
    nameNotFound: "Name not found in the family tree."
  },
  gu: {
    searchPlaceholder: "નામ શોધો...",
    source: "સ્રોત",
    rootsOfFamily: "ભટ્ટ પરિવાર",
    born: "જન્મ",
    passed: "અવસાન",
    sourceDocumentation: "સ્રોત દસ્તાવેજીકરણ",
    name: "નામ",
    type: "પ્રકાર",
    date: "તારીખ",
    preview: "પૂર્વાવલોકન",
    view: "જુઓ",
    nameNotFound: "પરિવાર વૃક્ષમાં નામ મળ્યું નથી."
  }
};

// Translation hook
const useTranslation = (isGujarati) => {
  const t = (key) => {
    return translations[isGujarati ? 'gu' : 'en'][key] || key;
  };
  return t;
};

// Helper to get the correct optimized image path (returns base path without extension)
const getOptimizedPhotoBase = (photo) => {
  if (!photo) return '';
  // Remove extension and replace /photos/ with /Family-Tree/optimized/
  return photo.replace(/\.(jpg|jpeg|png)$/i, '').replace('/photos/', '/Family-Tree/optimized/');
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

// Gujarati months
const guMonths = [
  'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
  'જુલાઈ', 'ઑગસ્ટ', 'સપ્ટેમ્બર', 'ઑક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
];

function formatDate(dateStr, isGujarati) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr; // fallback if invalid
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  if (isGujarati) {
    return `${day} ${guMonths[month]} ${year}`;
  } else {
    // Default: e.g. 12 Mar 1845
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

const TreeNode = ({ node = familyTree, level = 0, onPhotoClick, expandPath = [], highlightName, activePath = [], onMaxDepth, isGujarati }) => {
  const t = useTranslation(isGujarati);
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
            if (node.photo && onPhotoClick) onPhotoClick(getOptimizedPhotoBase(node.photo));
          }} 
          style={{ cursor: node.photo ? 'zoom-in' : 'default' }}
        >
          {node.photo ? (
            <picture>
              <source srcSet={getOptimizedPhotoBase(node.photo) + '.avif'} type="image/avif" />
              <source srcSet={getOptimizedPhotoBase(node.photo) + '.webp'} type="image/webp" />
              <img 
                src={getOptimizedPhotoBase(node.photo) + '.jpeg'} 
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
            </picture>
          ) : (
            <div className="node-photo-placeholder">
              {node.name.substring(0, 2)}
            </div>
          )}
        </div>
        <span className="node-name">{isGujarati && node.gujaratiName ? node.gujaratiName : node.name}</span>
        <div className="dates-container">
          <div className="date-box">
            <span className="date-label">{t('born')}</span>
            <span className="date-value">{formatDate(node.birthDate, isGujarati) || '??/??/????'}</span>
          </div>
          <div className="date-box">
            <span className="date-label">{t('passed')}</span>
            <span className="date-value">{formatDate(node.deathDate, isGujarati) || '----'}</span>
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
                  isGujarati={isGujarati}
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
  const [isGujarati, setIsGujarati] = useState(false);
  const confettiFired = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandPath, setExpandPath] = useState([]);
  const [highlightName, setHighlightName] = useState('');
  const [activePath, setActivePath] = useState([]);
  const [maxExpandedDepth, setMaxExpandedDepth] = useState(0);
  const treeContainerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [foundNode, setFoundNode] = useState(null);
  const t = useTranslation(isGujarati);

  const sources = [
    {
      title: "Source 1",
      description: "Original family tree documentation",
      image: "/photos/source1.jpeg",
      type: "document",
      date: "2024-03-15"
    },
    {
      title: "Source 2",
      description: "Historical records and archives",
      image: "/photos/source2.jpeg",
      type: "archive",
      date: "2024-03-14"
    },
    {
      title: "Source 3",
      description: "Family photographs collection",
      image: "/photos/source3.jpeg",
      type: "photo",
      date: "2024-03-13"
    },
    {
      title: "Source 4",
      description: "Ancestral documents and certificates",
      image: "/photos/source4.jpeg",
      type: "certificate",
      date: "2024-03-12"
    },
    {
      title: "Source 5",
      description: "Family heritage artifacts",
      image: "/photos/source5.jpeg",
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
  }, [searchTerm]);

  // Function to center the tree
  const centerTree = () => {
    if (treeContainerRef.current) {
      const container = treeContainerRef.current;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const maxScroll = scrollWidth - clientWidth;
      const centerScroll = maxScroll / 2;
      
      container.scrollTo({
        left: centerScroll,
        behavior: 'smooth'
      });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setZoomLevel(1);
      return;
    }
    const path = findPathByName(familyTree, searchTerm.trim());
    if (path) {
      setExpandPath(path);
      setHighlightName(path[path.length - 1]);
      setActivePath(path);
      setZoomLevel(0.25);
      setTimeout(() => {
        centerTree();
        if (treeContainerRef.current) {
          const nodeElement = document.querySelector('.node-box.highlighted');
          if (nodeElement) {
            nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 300);
    } else {
      setExpandPath([]);
      setHighlightName('');
      setActivePath([]);
      setZoomLevel(1);
      alert(t('nameNotFound'));
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
      <div className="search-bar-topright">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            className="search-bar"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
      </div>

      <div className="source-btn-container" style={{flexDirection: 'column', alignItems: 'center', width: 'auto'}}>
        <button className="source-btn" onClick={() => setSourceModalOpen(true)}>
          {t('source')}
        </button>
        <div className="lang-toggle-row">
          <span className={`lang-label${!isGujarati ? ' selected' : ''}`}>English</span>
          <div
            className={`lang-toggle${isGujarati ? ' gujarati' : ' english'}`}
            onClick={() => setIsGujarati(v => !v)}
          >
            <span className="lang-thumb">
              {!isGujarati ? (
                <span role="img" aria-label="English">🇬🇧</span>
              ) : (
                <span role="img" aria-label="Gujarati">🇮🇳</span>
              )}
            </span>
          </div>
          <span className={`lang-label${isGujarati ? ' selected' : ''}`}>Gujarati</span>
        </div>
      </div>

      <div className="heading-center">
        <h1 className="neon-heading">{t('rootsOfFamily')}</h1>
      </div>

      <div 
        className="tree-container" 
        ref={treeContainerRef}
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: 'transform 0.3s ease-out',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        <TreeNode 
          onPhotoClick={handlePhotoClick} 
          expandPath={expandPath} 
          highlightName={highlightName} 
          activePath={activePath} 
          onMaxDepth={handleMaxDepth}
          isGujarati={isGujarati}
        />
      </div>
      {modalOpen && modalImg && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-img-container" onClick={e => e.stopPropagation()}>
            <picture>
              <source srcSet={modalImg + '.avif'} type="image/avif" />
              <source srcSet={modalImg + '.webp'} type="image/webp" />
              <img 
                src={modalImg + '.jpeg'} 
                alt="Enlarged" 
                className="modal-img" 
                style={{ 
                  maxWidth: '90vw', 
                  maxHeight: '90vh', 
                  objectFit: 'contain',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
                }} 
              />
            </picture>
            <button 
              className="modal-close" 
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                zIndex: 2
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
      {sourceModalOpen && (
        <div className="source-modal-overlay" onClick={closeSourceModal}>
          <div className="source-modal-content" onClick={e => e.stopPropagation()}>
            <button className="source-modal-close" onClick={closeSourceModal}>&times;</button>
            <h2 className="source-modal-title">{t('sourceDocumentation')}</h2>
            
            <div className="source-header">
              <div className="source-header-item">{t('name')}</div>
              <div className="source-header-item">{t('type')}</div>
              <div className="source-header-item">{t('date')}</div>
              <div className="source-header-item">{t('preview')}</div>
            </div>

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
                    onClick={() => handleSourceImageClick(getOptimizedPhotoBase(source.image))}
                  >
                    <picture>
                      <source srcSet={getOptimizedPhotoBase(source.image) + '.avif'} type="image/avif" />
                      <source srcSet={getOptimizedPhotoBase(source.image) + '.webp'} type="image/webp" />
                      <img 
                        src={getOptimizedPhotoBase(source.image) + '.jpeg'} 
                        alt={source.title}
                        className="source-thumbnail"
                      />
                    </picture>
                    <div className="source-preview-overlay">
                      <span>{t('view')}</span>
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
            <picture>
              <source srcSet={selectedSourceImage + '.avif'} type="image/avif" />
              <source srcSet={selectedSourceImage + '.webp'} type="image/webp" />
              <img 
                src={selectedSourceImage + '.jpeg'} 
                alt="Source Document" 
                className="source-image-full"
                style={{ 
                  maxWidth: '90vw', 
                  maxHeight: '90vh', 
                  objectFit: 'contain',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
                }}
              />
            </picture>
            <button 
              className="source-image-modal-close" 
              onClick={closeSourceImageModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                zIndex: 2
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTreeApp;
