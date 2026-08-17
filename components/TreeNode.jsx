import React, { useState, useEffect, useRef, useCallback } from 'react';
import familyTree from "../data/familyData";
import confetti from 'canvas-confetti';
import './TreeNode.css';

// Translations object
const translations = {
  en: {
    searchPlaceholder: "Search family member...",
    source: "Source Docs",
    rootsOfFamily: "Roots of Bhatt Family",
    born: "Born",
    passed: "Passed",
    sourceDocumentation: "Source Documentation",
    name: "Name",
    type: "Type",
    date: "Date",
    preview: "Preview",
    view: "View",
    nameNotFound: "Name not found in the family tree.",
    expandAll: "Expand All",
    collapseAll: "Collapse All",
    resetZoom: "Reset Canvas",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit Fullscreen",
    totalMembers: "Total Members",
    generation: "Gen",
    rootAncestor: "Root Ancestor",
    prevGen: "Prev Gen",
    nextGen: "Next Gen",
    playTour: "Play Tour",
    pauseTour: "Pause Tour",
    rootOnly: "Root Only",
    focusMember: "Focus Member",
    memberDetails: "Member Details",
    close: "Close"
  },
  gu: {
    searchPlaceholder: "પરિવારના સભ્યને શોધો...",
    source: "સ્રોત દસ્તાવેજો",
    rootsOfFamily: "ભટ્ટ પરિવારનું વૃક્ષ",
    born: "જન્મ",
    passed: "અવસાન",
    sourceDocumentation: "સ્રોત દસ્તાવેજીકરણ",
    name: "નામ",
    type: "પ્રકાર",
    date: "તારીખ",
    preview: "પૂર્વાવલોકન",
    view: "જુઓ",
    nameNotFound: "પરિવાર વૃક્ષમાં નામ મળ્યું નથી.",
    expandAll: "બધું વિસ્તારો",
    collapseAll: "બધું સંકોચો",
    resetZoom: "કૅનવાસ રિસેટ કરો",
    fullscreen: "ફુલસ્ક્રીન",
    exitFullscreen: "ફુલસ્ક્રીનમાંથી બહાર નીકળો",
    totalMembers: "કુલ સભ્યો",
    generation: "પીઢી",
    rootAncestor: "મૂળ પૂર્વજ",
    prevGen: "પાછલી પીઢી",
    nextGen: "આગલી પીઢી",
    playTour: "ટૂર શરુ કરો",
    pauseTour: "ટૂર થોભો",
    rootOnly: "માત્ર મૂળ",
    focusMember: "કેન્દ્રિત કરો",
    memberDetails: "સભ્ય વિગતો",
    close: "બંધ કરો"
  }
};

// Helper to calculate total members in tree recursively
const countMembers = (node) => {
  if (!node) return 0;
  let count = 1;
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      count += countMembers(child);
    });
  }
  return count;
};

// Helper to calculate max depth of tree
const getMaxTreeDepth = (node, currentLevel = 0) => {
  if (!node || !node.children || node.children.length === 0) return currentLevel;
  let max = currentLevel;
  node.children.forEach(child => {
    const depth = getMaxTreeDepth(child, currentLevel + 1);
    if (depth > max) max = depth;
  });
  return max;
};

const TOTAL_MEMBERS = countMembers(familyTree);
const MAX_TREE_DEPTH = getMaxTreeDepth(familyTree);

// Translation hook
const useTranslation = (isGujarati) => {
  return (key) => translations[isGujarati ? 'gu' : 'en'][key] || key;
};

// Helper to get optimized photo base path
const getOptimizedPhotoBase = (photo) => {
  if (!photo) return '';
  return photo.replace(/\.(jpg|jpeg|png)$/i, '').replace('/photos/', '/Family-Tree/optimized/');
};

// Helper to normalize names for search matching
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/mit|meet/g, 'meet')
    .replace(/hemi|hemangini/g, 'hemangini');
}

// Find path from root to node matching name
function findPathByName(node, name, path = []) {
  if (!node) return null;
  const target = normalizeName(name);
  const currentEng = normalizeName(node.name);
  const currentGuj = normalizeName(node.gujaratiName);
  
  if (currentEng.includes(target) || currentGuj.includes(target)) {
    return [...path, node.name];
  }
  
  if (node.children) {
    for (const child of node.children) {
      const result = findPathByName(child, name, [...path, node.name]);
      if (result) return result;
    }
  }
  return null;
}

const STEM_HEIGHT = 46; // Fixed vertical height for SVG branch connectors matching top badge offset

const getNodeColors = (level) => {
  const colors = [
    { bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', border: '#6366f1', badgeBg: '#4f46e5', lineGrad: ['#6366f1', '#39fff6'] },
    { bg: 'linear-gradient(135deg, #1e293b 0%, #0f766e 100%)', border: '#14b8a6', badgeBg: '#0d9488', lineGrad: ['#14b8a6', '#2dd4bf'] },
    { bg: 'linear-gradient(135deg, #31103f 0%, #701a75 100%)', border: '#c084fc', badgeBg: '#9333ea', lineGrad: ['#c084fc', '#e879f9'] },
    { bg: 'linear-gradient(135deg, #451a03 0%, #9a3412 100%)', border: '#fb923c', badgeBg: '#ea580c', lineGrad: ['#fb923c', '#fde047'] },
    { bg: 'linear-gradient(135deg, #172554 0%, #1d4ed8 100%)', border: '#60a5fa', badgeBg: '#2563eb', lineGrad: ['#60a5fa', '#38bdf8'] },
  ];
  return colors[Math.min(level, colors.length - 1)];
};

// Gujarati months
const guMonths = [
  'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
  'જુલાઈ', 'ઑગસ્ટ', 'સપ્ટેમ્બર', 'ઑક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
];

function formatDate(dateStr, isGujarati) {
  if (!dateStr || dateStr === 'unknown') return '----';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  if (isGujarati) {
    return `${day} ${guMonths[month]} ${year}`;
  } else {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

// --------------------------------------------------------------------------
// Mobile-Optimized 3D Card Tilt Component
// --------------------------------------------------------------------------
const TiltCard = React.forwardRef(({ children, className, style, onClick, parentShift = 0 }, ref) => {
  const cardRef = useRef(null);
  const combinedRef = (node) => {
    cardRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const [transform3D, setTransform3D] = useState('rotateX(0deg) rotateY(0deg) translateZ(0px)');
  const [sheenPos, setSheenPos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -8;
    const rotY = ((x - centerX) / centerX) * 8;

    setTransform3D(`rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(10px) scale3d(1.02, 1.02, 1.02)`);
    setSheenPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.3
    });
  };

  const handleMouseLeave = () => {
    setTransform3D('rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)');
    setSheenPos(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={combinedRef}
      className={`card-3d-wrapper ${className}`}
      style={{
        ...style,
        transform: `translateX(${parentShift}px) perspective(1000px) ${transform3D}`,
        transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 0.2s ease',
        transformStyle: 'preserve-3d'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div
        className="card-3d-sheen"
        style={{
          background: `radial-gradient(circle at ${sheenPos.x}% ${sheenPos.y}%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%)`,
          opacity: sheenPos.opacity,
          transition: 'opacity 0.25s ease'
        }}
      />
      {children}
    </div>
  );
});

// --------------------------------------------------------------------------
// TreeNode Component & Distortion-Free SVG Branch Renderer
// --------------------------------------------------------------------------
const TreeNode = ({
  node = familyTree,
  level = 0,
  onPhotoClick,
  onMemberSelect,
  expandPath = [],
  highlightName = '',
  activePath = [],
  isGujarati = false,
  forceExpand = null,
  visibleGenLevel = null,
  isMobile = false
}) => {
  const t = useTranslation(isGujarati);
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  const parentCardRef = useRef(null);
  const childrenContainerRef = useRef(null);
  const popAudioRef = useRef(null);

  const [linePaths, setLinePaths] = useState([]);
  const [svgBounds, setSvgBounds] = useState({ width: 0, height: STEM_HEIGHT });
  const [parentShift, setParentShift] = useState(0);

  const hasChildren = node.children && node.children.length > 0;
  const childrenCount = node.children ? node.children.length : 0;
  const boxWidth = isMobile ? 175 : 220;
  const nodeGap = isMobile ? 16 : 36;

  // Stepwise Progression & forceExpand / expandPath sync
  useEffect(() => {
    if (visibleGenLevel !== null) {
      setIsExpanded(level < visibleGenLevel);
    } else if (forceExpand !== null) {
      setIsExpanded(forceExpand);
    }
  }, [visibleGenLevel, forceExpand, level]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, level * 80);

    if (!popAudioRef.current) {
      popAudioRef.current = new Audio('pop.mp3');
      popAudioRef.current.load();
    }

    if (expandPath && expandPath.includes(node.name)) {
      setIsExpanded(true);
    }

    return () => clearTimeout(timer);
  }, [level, expandPath, node.name]);

  // Calculate Bezier SVG Curves & Parent Shift to align parent card directly over children cards
  const calculateBranchPaths = useCallback(() => {
    if (!childrenContainerRef.current || !isExpanded || childrenCount === 0) {
      setParentShift(0);
      return;
    }
    
    const container = childrenContainerRef.current;
    const childElements = Array.from(container.children);
    const containerWidth = container.offsetWidth;

    if (containerWidth === 0) return;

    const firstChildCard = childElements[0].querySelector('.node-box');
    const lastChildCard = childElements[childElements.length - 1].querySelector('.node-box');

    let firstChildCenter = childElements[0].offsetLeft + childElements[0].offsetWidth / 2;
    let lastChildCenter = childElements[childElements.length - 1].offsetLeft + childElements[childElements.length - 1].offsetWidth / 2;

    if (firstChildCard) {
      firstChildCenter = childElements[0].offsetLeft + firstChildCard.offsetLeft + firstChildCard.offsetWidth / 2;
    }
    if (lastChildCard) {
      lastChildCenter = childElements[childElements.length - 1].offsetLeft + lastChildCard.offsetLeft + lastChildCard.offsetWidth / 2;
    }

    const idealParentX = (firstChildCenter + lastChildCenter) / 2;
    const currentParentX = containerWidth / 2;
    const shift = idealParentX - currentParentX;

    setParentShift(shift);

    const paths = childElements.map((childEl, index) => {
      const childCard = childEl.querySelector('.node-box');
      let childCenterX = childEl.offsetLeft + childEl.offsetWidth / 2;
      if (childCard) {
        childCenterX = childEl.offsetLeft + childCard.offsetLeft + childCard.offsetWidth / 2;
      }
      const isChildActive = activePath && activePath.includes(node.children[index]?.name);
      
      const d = `M ${idealParentX} 0 C ${idealParentX} ${STEM_HEIGHT * 0.45}, ${childCenterX} ${STEM_HEIGHT * 0.45}, ${childCenterX} ${STEM_HEIGHT - 4}`;
      return {
        d,
        isChildActive,
        key: `${node.name}-${index}`
      };
    });

    setSvgBounds({ width: containerWidth, height: STEM_HEIGHT });
    setLinePaths(paths);
  }, [isExpanded, childrenCount, node.children, activePath, node.name]);

  useEffect(() => {
    calculateBranchPaths();
  }, [calculateBranchPaths]);

  // Use ResizeObserver to auto-update lines whenever children layout dimensions change
  useEffect(() => {
    if (!isExpanded || !hasChildren || !childrenContainerRef.current) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(calculateBranchPaths);
    });

    observer.observe(childrenContainerRef.current);
    return () => observer.disconnect();
  }, [isExpanded, hasChildren, calculateBranchPaths]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (popAudioRef.current) {
      popAudioRef.current.currentTime = 0;
      popAudioRef.current.play().catch(() => {});
    }
    if (isMobile && onMemberSelect) {
      onMemberSelect(node, level);
    }
    setIsExpanded(!isExpanded);
  };

  const handlePhotoSelect = (e) => {
    e.stopPropagation();
    if (popAudioRef.current) {
      popAudioRef.current.currentTime = 0;
      popAudioRef.current.play().catch(() => {});
    }
    if (node.photo && onPhotoClick) {
      onPhotoClick(getOptimizedPhotoBase(node.photo));
    }
  };

  const isHighlighted = highlightName && normalizeName(node.name) === normalizeName(highlightName);
  const isInActivePath = activePath && activePath.includes(node.name);
  const colorStyle = getNodeColors(level);

  return (
    <div className={`tree-node level-${level} ${level === 0 ? 'root-node' : ''} ${isVisible ? 'visible' : ''}`}>
      <TiltCard 
        ref={parentCardRef}
        parentShift={parentShift}
        className={`node-box ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''} ${isHighlighted ? 'highlighted' : ''} ${isInActivePath ? 'active-path' : ''}`}
        onClick={handleClick}
        style={{
          background: colorStyle.bg,
          borderColor: isHighlighted ? '#39fff6' : colorStyle.border,
          color: '#fff',
        }}
      >
        {/* Generation Badge */}
        <div className="gen-badge" style={{ background: colorStyle.badgeBg }}>
          {level === 0 ? t('rootAncestor') : `${t('generation')} ${level}`}
        </div>

        {/* Children expand indicator */}
        {hasChildren && (
          <span className="node-indicator">
            {isExpanded ? '−' : `+${childrenCount}`}
          </span>
        )}

        {/* Node Photo Avatar */}
        <div 
          className={`node-photo ${imageLoadError ? 'image-error' : ''}`} 
          onClick={handlePhotoSelect}
          title={node.photo ? "Click to view photo" : ""}
          style={{ cursor: node.photo ? 'zoom-in' : 'pointer' }}
        >
          {node.photo && !imageLoadError ? (
            <picture>
              <source srcSet={`${getOptimizedPhotoBase(node.photo)}.avif`} type="image/avif" />
              <source srcSet={`${getOptimizedPhotoBase(node.photo)}.webp`} type="image/webp" />
              <img 
                src={`${getOptimizedPhotoBase(node.photo)}.jpg`}
                alt={node.name} 
                className="avatar-img"
                onError={() => setImageLoadError(true)}
                onLoad={() => setImageLoadError(false)}
              />
            </picture>
          ) : (
            <div className="node-photo-placeholder">
              {node.name ? node.name.substring(0, 2).toUpperCase() : '??'}
            </div>
          )}
        </div>

        {/* Node Names */}
        <span className="node-name">
          {isGujarati && node.gujaratiName ? node.gujaratiName : node.name}
        </span>
        {isGujarati && node.name && (
          <span className="node-subname">{node.name}</span>
        )}

        {/* Dates Info */}
        <div className="dates-container">
          <div className="date-box">
            <span className="date-label">{t('born')}</span>
            <span className="date-value">{formatDate(node.birthDate, isGujarati)}</span>
          </div>
          <div className="date-box">
            <span className="date-label">{t('passed')}</span>
            <span className="date-value">{formatDate(node.deathDate, isGujarati)}</span>
          </div>
        </div>
      </TiltCard>

      {/* Children Container & SVG Lineage Bezier Branch Renderer */}
      {isExpanded && hasChildren && (
        <div 
          className="tree-children-wrapper" 
          style={{ 
            position: "relative", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center",
            width: "max-content"
          }}
        >
          {/* SVG Canvas connecting parent bottom to children top */}
          <svg
            className="lineage-svg-canvas"
            width={svgBounds.width || "100%"}
            height={STEM_HEIGHT}
            style={{
              overflow: 'visible',
              pointerEvents: 'none',
              zIndex: 3
            }}
          >
            <defs>
              <linearGradient id={`grad-standard-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colorStyle.lineGrad[0]} />
                <stop offset="100%" stopColor={colorStyle.lineGrad[1]} />
              </linearGradient>
              <linearGradient id={`grad-active-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#39fff6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
              <filter id="neon-line-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {linePaths.map((p) => (
              <g key={p.key}>
                <path
                  d={p.d}
                  fill="none"
                  stroke="rgba(2, 6, 23, 0.85)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d={p.d}
                  fill="none"
                  stroke={p.isChildActive ? `url(#grad-active-${level})` : `url(#grad-standard-${level})`}
                  strokeWidth={p.isChildActive ? "3.5" : "2.5"}
                  filter={p.isChildActive ? "url(#neon-line-glow)" : "none"}
                  className={p.isChildActive ? "flowing-lineage-path" : "lineage-path"}
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>

          {/* Render Children Nodes Flexbox */}
          <div
            className="children-flex-container"
            ref={childrenContainerRef}
            style={{
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "flex-start",
              position: "relative",
              gap: `${nodeGap}px`,
              width: "max-content"
            }}
          >
            {node.children.map((child, index) => (
              <div
                key={`${child.name}-${index}`}
                className="flex flex-col items-center relative"
                style={{ minWidth: boxWidth }}
              >
                <TreeNode 
                  node={child}
                  level={level + 1}
                  onPhotoClick={onPhotoClick}
                  onMemberSelect={onMemberSelect}
                  expandPath={expandPath}
                  highlightName={highlightName}
                  activePath={activePath}
                  isGujarati={isGujarati}
                  forceExpand={forceExpand}
                  visibleGenLevel={visibleGenLevel}
                  isMobile={isMobile}
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
  const [isGujarati, setIsGujarati] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandPath, setExpandPath] = useState([]);
  const [highlightName, setHighlightName] = useState('');
  const [activePath, setActivePath] = useState([]);
  
  // Mobile Responsiveness States
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMemberLevel, setSelectedMemberLevel] = useState(0);

  // Stepwise Progression State
  const [visibleGenLevel, setVisibleGenLevel] = useState(2);
  const [isPlayingTour, setIsPlayingTour] = useState(false);

  // Infinite Seamless 2D Canvas State
  const [pan, setPan] = useState({ x: 0, y: 100 });
  const [zoomLevel, setZoomLevel] = useState(window.innerWidth <= 768 ? 0.75 : 1);
  const [isDragging, setIsDragging] = useState(false);
  const [forceExpandAll, setForceExpandAll] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [enlargedSourceImage, setEnlargedSourceImage] = useState(null);

  const confettiFired = useRef(false);
  const viewportRef = useRef(null);
  const treeContainerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchDistanceRef = useRef(null);
  const touchZoomStartRef = useRef(1);

  const t = useTranslation(isGujarati);

  const sources = [
    {
      title: "Original Family Register",
      description: "Original handwritten Bhatt family tree documentation and genealogical records.",
      image: "/Family-Tree/optimized/source1.jpg",
      type: "Document",
      date: "1942"
    },
    {
      title: "Ancestral Heritage Archive",
      description: "Historical municipal records, deed registry, and ancestral heritage notes.",
      image: "/Family-Tree/optimized/source2.jpg",
      type: "Archive",
      date: "1968"
    },
    {
      title: "Family Portrait Collection",
      description: "Vintage photographs collection capturing generations of the Bhatt family.",
      image: "/Family-Tree/optimized/source3.jpg",
      type: "Photograph",
      date: "1975"
    },
    {
      title: "Lineage Certificates",
      description: "Certificates, birth entries, and historical family certificates.",
      image: "/Family-Tree/optimized/source4.jpg",
      type: "Certificate",
      date: "1988"
    }
  ];

  // Mobile resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePhotoClick = (img) => {
    setModalImg(img);
    setModalOpen(true);
    confettiFired.current = false;
  };

  const handleMemberSelect = (node, level) => {
    setSelectedMember(node);
    setSelectedMemberLevel(level);
  };

  useEffect(() => {
    if (modalOpen && !confettiFired.current) {
      confettiFired.current = true;
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.5 },
        startVelocity: 45,
        scalar: 1.2,
        zIndex: 10000,
      });
    }
  }, [modalOpen]);

  // Center Kaduji Bhatt (Root Node) card directly in the screen horizontal center on Reset Canvas
  const centerCanvas = useCallback(() => {
    if (viewportRef.current && treeContainerRef.current) {
      const rootCard = document.querySelector('.root-node > .card-3d-wrapper > .node-box');
      const vWidth = viewportRef.current.clientWidth;
      const initialZoom = isMobile ? 0.75 : 1;

      if (rootCard) {
        const rootRect = rootCard.getBoundingClientRect();
        const containerRect = treeContainerRef.current.getBoundingClientRect();

        const rootCenterXRelativeToContainer = ((rootRect.left + rootRect.width / 2) - containerRect.left) / zoomLevel;
        const targetPanX = (vWidth / 2) - rootCenterXRelativeToContainer * initialZoom;

        setPan({ x: targetPanX, y: isMobile ? 65 : 120 });
        setZoomLevel(initialZoom);
        return;
      }

      const cWidth = treeContainerRef.current.scrollWidth;
      const initialX = Math.max(10, (vWidth - cWidth) / 2);
      setPan({ x: initialX, y: isMobile ? 65 : 120 });
      setZoomLevel(initialZoom);
    }
  }, [zoomLevel, isMobile]);

  useEffect(() => {
    const timer = setTimeout(centerCanvas, 150);
    return () => clearTimeout(timer);
  }, [centerCanvas]);

  // Auto-play Stepwise Lineage Tour
  useEffect(() => {
    let interval = null;
    if (isPlayingTour) {
      interval = setInterval(() => {
        setVisibleGenLevel(prev => {
          if (prev >= MAX_TREE_DEPTH + 1) {
            setIsPlayingTour(false);
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
            return prev;
          }
          return prev + 1;
        });
      }, 2200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingTour]);

  // Stepwise Generation Handlers
  const handlePrevGen = () => {
    setIsPlayingTour(false);
    setForceExpandAll(null);
    setVisibleGenLevel(prev => Math.max(prev - 1, 1));
  };

  const handleNextGen = () => {
    setIsPlayingTour(false);
    setForceExpandAll(null);
    setVisibleGenLevel(prev => Math.min(prev + 1, MAX_TREE_DEPTH + 1));
  };

  const handleRootOnly = () => {
    setIsPlayingTour(false);
    setForceExpandAll(null);
    setVisibleGenLevel(1);
    centerCanvas();
  };

  const handleShowAll = () => {
    setIsPlayingTour(false);
    setVisibleGenLevel(MAX_TREE_DEPTH + 1);
    setForceExpandAll(true);
  };

  const toggleTour = () => {
    if (!isPlayingTour) {
      if (visibleGenLevel >= MAX_TREE_DEPTH + 1) {
        setVisibleGenLevel(1);
      }
      setIsPlayingTour(true);
    } else {
      setIsPlayingTour(false);
    }
  };

  // Pointer & Gesture Event Handlers (2D Drag & Pinch Zoom)
  const handlePointerDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    if (viewportRef.current) {
      viewportRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      if (viewportRef.current && e.pointerId !== undefined) {
        try {
          viewportRef.current.releasePointerCapture(e.pointerId);
        } catch {
          return;
        }
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newZoom = Math.min(Math.max(zoomLevel * zoomFactor, 0.25), 2.2);

    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoomLevel);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoomLevel);

      setZoomLevel(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  const getTouchDistance = (t1, t2) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      touchDistanceRef.current = getTouchDistance(e.touches[0], e.touches[1]);
      touchZoomStartRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = (currentDist / touchDistanceRef.current) * touchZoomStartRef.current;
      const newZoom = Math.min(Math.max(scale, 0.25), 2.2);
      setZoomLevel(newZoom);
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  // Search Member & Route Canvas Directly to Target Card Center
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setExpandPath([]);
      setHighlightName('');
      setActivePath([]);
      return;
    }
    const path = findPathByName(familyTree, searchTerm.trim());
    if (path) {
      setExpandPath(path);
      const targetName = path[path.length - 1];
      setHighlightName(targetName);
      setActivePath(path);
      setMobileSearchOpen(false);

      const targetGenDepth = path.length;
      if (visibleGenLevel < targetGenDepth) {
        setVisibleGenLevel(targetGenDepth);
      }

      setTimeout(() => {
        const nodeElement = document.querySelector('.node-box.highlighted');
        if (nodeElement && viewportRef.current && treeContainerRef.current) {
          const vWidth = viewportRef.current.clientWidth;
          const vHeight = viewportRef.current.clientHeight;

          const nRect = nodeElement.getBoundingClientRect();
          const cRect = treeContainerRef.current.getBoundingClientRect();

          const nodeCenterX = ((nRect.left + nRect.width / 2) - cRect.left) / zoomLevel;
          const nodeCenterY = ((nRect.top + nRect.height / 2) - cRect.top) / zoomLevel;

          const targetPanX = (vWidth / 2) - nodeCenterX * zoomLevel;
          const targetPanY = (vHeight / 2) - nodeCenterY * zoomLevel;

          setPan({
            x: targetPanX,
            y: targetPanY
          });
        }
      }, 250);
    } else {
      setExpandPath([]);
      setHighlightName('');
      setActivePath([]);
      alert(t('nameNotFound'));
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setExpandPath([]);
    setHighlightName('');
    setActivePath([]);
  };

  const handleZoomChange = (delta) => {
    setZoomLevel(prev => Math.min(Math.max(prev + delta, 0.25), 2.2));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullScreen(false);
    }
  };

  return (
    <div className="app-container">
      {/* Dynamic Ambient Background Glowing Orbs for Live 3D Atmosphere */}
      <div className="bg-glow-orb orb-1" />
      <div className="bg-glow-orb orb-2" />
      <div className="bg-glow-orb orb-3" />

      {/* --- Ultra-Minimalist Floating Top Header (Single Line Glass Pill) --- */}
      <header className="main-header">
        <div className="header-left">
          <div className="brand-title">
            <h1 className="neon-heading">{isMobile ? (isGujarati ? 'ભટ્ટ પરિવાર' : 'Bhatt Lineage') : t('rootsOfFamily')}</h1>
            <span className="members-badge">🌱 {TOTAL_MEMBERS}</span>
          </div>
        </div>

        {/* Desktop Search Bar */}
        {!isMobile && (
          <div className="header-search">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button type="button" className="clear-search-btn" onClick={handleClearSearch}>
                    ✕
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Right Toolbar Icon Actions */}
        <div className="header-actions">
          {/* Source Docs Button */}
          <button
            className="action-btn source-btn icon-only"
            onClick={() => setSourceModalOpen(true)}
            title={t('source')}
          >
            📜
          </button>

          {/* Mobile Search Icon */}
          {isMobile && (
            <button 
              className="action-btn icon-only" 
              onClick={() => setMobileSearchOpen(true)}
              title="Search"
            >
              🔍
            </button>
          )}

          {/* Language Toggle */}
          <button 
            className="action-btn lang-btn icon-only" 
            onClick={() => setIsGujarati(v => !v)}
            title="Toggle Language"
          >
            {isGujarati ? '🇮🇳' : '🇬🇧'}
          </button>

          {/* Fullscreen Button */}
          <button 
            className="action-btn fullscreen-btn icon-only"
            onClick={toggleFullscreen}
            title={isFullScreen ? t('exitFullscreen') : t('fullscreen')}
          >
            {isFullScreen ? '↙️' : '⛶'}
          </button>
        </div>
      </header>

      {/* --- Ultra-Minimalist Floating Bottom Controls Dock (Single Line Pill) --- */}
      <div className="controls-dock">
        {isMobile ? (
          <div className="mobile-dock-row">
            <button className="dock-btn mobile-dock-btn icon-only" onClick={handlePrevGen} title={t('prevGen')}>
              ◀
            </button>

            <span className="step-badge" title="Current Generation Level">
              {visibleGenLevel - 1}/{MAX_TREE_DEPTH}
            </span>

            <button className="dock-btn mobile-dock-btn icon-only" onClick={handleNextGen} title={t('nextGen')}>
              ▶
            </button>

            <div className="dock-divider" />

            <button className="dock-btn mobile-dock-btn" onClick={centerCanvas} title={t('resetZoom')}>
              🎯 {Math.round(zoomLevel * 100)}%
            </button>

            <button className="dock-btn mobile-dock-btn icon-only" onClick={handleShowAll} title={t('expandAll')}>
              ⏩
            </button>

            <button className={`dock-btn mobile-dock-btn icon-only ${isPlayingTour ? 'active-tour' : ''}`} onClick={toggleTour} title={isPlayingTour ? t('pauseTour') : t('playTour')}>
              {isPlayingTour ? '⏸️' : '▶'}
            </button>
          </div>
        ) : (
          <div className="desktop-dock-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button className="dock-btn" onClick={handleRootOnly} title={t('rootOnly')}>
              ⏮️ {t('rootOnly')}
            </button>
            <button className="dock-btn" onClick={handlePrevGen} title={t('prevGen')}>
              ◀ {t('prevGen')}
            </button>

            <span className="step-badge" title="Current Generation Level">
              {t('generation')} {visibleGenLevel - 1}/{MAX_TREE_DEPTH}
            </span>

            <button className="dock-btn" onClick={handleNextGen} title={t('nextGen')}>
              {t('nextGen')} ▶
            </button>

            <button className={`dock-btn ${isPlayingTour ? 'active-tour' : ''}`} onClick={toggleTour} title={isPlayingTour ? t('pauseTour') : t('playTour')}>
              {isPlayingTour ? `⏸️ ${t('pauseTour')}` : `▶ ${t('playTour')}`}
            </button>

            <button className="dock-btn" onClick={handleShowAll} title={t('expandAll')}>
              ⏩ {t('expandAll')}
            </button>

            <div className="dock-divider" />

            <button className="dock-btn" onClick={() => handleZoomChange(-0.15)} title="Zoom Out">
              ➖
            </button>
            <span className="zoom-indicator" onClick={centerCanvas} title={t('resetZoom')}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button className="dock-btn" onClick={() => handleZoomChange(0.15)} title="Zoom In">
              ➕
            </button>
            <button className="dock-btn" onClick={centerCanvas} title={t('resetZoom')}>
              🎯 {t('resetZoom')}
            </button>
          </div>
        )}
      </div>

      {/* --- Mobile Full-Screen Search Modal --- */}
      {isMobile && mobileSearchOpen && (
        <div className="modal-overlay" onClick={() => setMobileSearchOpen(false)}>
          <div className="mobile-search-modal card-glass" onClick={e => e.stopPropagation()}>
            <div className="mobile-search-header">
              <h3>🔍 Search Family Member</h3>
              <button className="modal-close" onClick={() => setMobileSearchOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="action-btn search-submit-btn">
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Mobile Member Bottom Sheet Drawer --- */}
      {isMobile && selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="mobile-member-sheet card-glass" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMember(null)}>&times;</button>
            <div className="member-sheet-header">
              <div className="member-sheet-avatar">
                {selectedMember.photo ? (
                  <img src={`${getOptimizedPhotoBase(selectedMember.photo)}.jpg`} alt={selectedMember.name} />
                ) : (
                  <span>{selectedMember.name ? selectedMember.name.substring(0, 2).toUpperCase() : '??'}</span>
                )}
              </div>
              <div className="member-sheet-info">
                <span className="gen-pill">{selectedMemberLevel === 0 ? t('rootAncestor') : `${t('generation')} ${selectedMemberLevel}`}</span>
                <h2>{isGujarati && selectedMember.gujaratiName ? selectedMember.gujaratiName : selectedMember.name}</h2>
                {isGujarati && selectedMember.name && <span className="subname">{selectedMember.name}</span>}
              </div>
            </div>

            <div className="member-sheet-dates">
              <div className="sheet-date-box">
                <span className="date-label">{t('born')}</span>
                <span className="date-val">{formatDate(selectedMember.birthDate, isGujarati)}</span>
              </div>
              <div className="sheet-date-box">
                <span className="date-label">{t('passed')}</span>
                <span className="date-val">{formatDate(selectedMember.deathDate, isGujarati)}</span>
              </div>
            </div>

            {selectedMember.photo && (
              <button 
                className="drawer-action-btn primary"
                onClick={() => {
                  handlePhotoClick(getOptimizedPhotoBase(selectedMember.photo));
                  setSelectedMember(null);
                }}
              >
                📸 View Full Photo
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- Infinite Seamless 2D Canvas Viewport --- */}
      <main
        className={`tree-viewport ${isDragging ? 'is-dragging' : ''}`}
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="tree-container"
          ref={treeContainerRef}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoomLevel})`,
            transformOrigin: '0 0'
          }}
        >
          <TreeNode
            onPhotoClick={handlePhotoClick}
            onMemberSelect={handleMemberSelect}
            expandPath={expandPath}
            highlightName={highlightName}
            activePath={activePath}
            isGujarati={isGujarati}
            forceExpand={forceExpandAll}
            visibleGenLevel={visibleGenLevel}
            isMobile={isMobile}
          />
        </div>
      </main>

      {/* --- Photo Lightbox Modal --- */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content card-glass" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close">&times;</button>
            <div className="modal-body">
              <picture>
                <source srcSet={`${modalImg}.avif`} type="image/avif" />
                <source srcSet={`${modalImg}.webp`} type="image/webp" />
                <img src={`${modalImg}.jpg`} alt="Family Member" className="enlarged-image" />
              </picture>
            </div>
          </div>
        </div>
      )}

      {/* --- Source Documentation Modal --- */}
      {sourceModalOpen && (
        <div className="modal-overlay" onClick={() => setSourceModalOpen(false)}>
          <div className="source-modal-content card-glass" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSourceModalOpen(false)} aria-label="Close">&times;</button>
            <h2 className="source-modal-title">📜 {t('sourceDocumentation')}</h2>
            <div className="source-grid">
              {sources.map((src, idx) => (
                <div key={idx} className="source-card">
                  <div className="source-card-header">
                    <span className="source-type-pill">{src.type}</span>
                    <span className="source-date">{src.date}</span>
                  </div>
                  <h3 className="source-title">{src.title}</h3>
                  <p className="source-desc">{src.description}</p>
                  <div className="source-thumbnail-container" onClick={() => setEnlargedSourceImage(src.image)}>
                    <img src={src.image} alt={src.title} className="source-thumbnail" />
                    <div className="source-hover-overlay">
                      <span>🔍 {t('view')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Enlarged Source Image Lightbox --- */}
      {enlargedSourceImage && (
        <div className="modal-overlay" onClick={() => setEnlargedSourceImage(null)}>
          <div className="modal-content card-glass" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEnlargedSourceImage(null)} aria-label="Close">&times;</button>
            <div className="modal-body">
              <img src={enlargedSourceImage} alt="Enlarged Document" className="enlarged-image" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTreeApp;
