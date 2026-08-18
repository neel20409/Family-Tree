import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
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
    close: "Close",
    docsShort: "Docs",
    searchShort: "Search",
    langShort: "Lang",
    fullShort: "Full",
    exitFullShort: "Exit",
    prevShort: "Prev",
    nextShort: "Next",
    allShort: "All",
    tourShort: "Tour",
    pauseShort: "Pause",
    resetShort: "Reset",
    genShort: "Gen"
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
    close: "બંધ કરો",
    docsShort: "દસ્તાવેજ",
    searchShort: "શોધો",
    langShort: "ભાષા",
    fullShort: "ફુલ",
    exitFullShort: "બહાર",
    prevShort: "પાછળ",
    nextShort: "આગળ",
    allShort: "બધું",
    tourShort: "ટૂર",
    pauseShort: "થોભો",
    resetShort: "રિસેટ",
    genShort: "પીઢી"
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

// Base URL helper for robust asset resolution across localhost, Vercel, and GitHub Pages
const getAssetPath = (path) => {
  if (!path) return '';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const rawBase = import.meta.env.BASE_URL || './';
  const base = rawBase.endsWith('/') ? rawBase : rawBase + '/';
  return `${base}${cleanPath}`;
};

// Helper to get optimized photo base path
const getOptimizedPhotoBase = (photo) => {
  if (!photo) return '';
  const cleanPhoto = photo.replace(/\.(jpg|jpeg|png|avif|webp)$/i, '');
  if (cleanPhoto.includes('/photos/')) {
    return getAssetPath(cleanPhoto.replace('/photos/', '/optimized/'));
  }
  return getAssetPath(cleanPhoto);
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
const MIN_ZOOM = 0.08; // Allow zooming out well past 25% to fit large generations on screen

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
// Clean Flat 2D Card Wrapper Component
// --------------------------------------------------------------------------
const CardWrapper = React.forwardRef(({ children, className, style, onClick, parentShift = 0 }, ref) => {
  return (
    <div
      ref={ref}
      className={`card-wrapper ${className}`}
      style={{
        ...style,
        // Set the shift as a CSS variable rather than an inline `transform`:
        // an inline transform would permanently win over the stylesheet's
        // `.node-box:hover { transform: translateY(-4px) }` rule (inline
        // style always beats a stylesheet rule for the same property, even
        // under :hover), silently killing the hover-lift effect. Letting
        // the stylesheet own `transform` and just feed it this variable
        // keeps both the shift and the hover lift working together.
        '--parent-shift': `${parentShift}px`,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

// --------------------------------------------------------------------------
// TreeNode Component & Flat 2D SVG Branch Lineage Renderer
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
    if (!popAudioRef.current) {
      popAudioRef.current = new Audio('pop.mp3');
      popAudioRef.current.load();
    }

    if (expandPath && expandPath.includes(node.name)) {
      setIsExpanded(true);
    }
  }, [level, expandPath, node.name]);

  // Calculate Bezier SVG Curves & Parent Shift to align parent card directly over children cards
  const calculateBranchPaths = useCallback(() => {
    if (!childrenContainerRef.current || !isExpanded || childrenCount === 0) {
      setParentShift(0);
      return;
    }

    const container = childrenContainerRef.current;
    const containerWidth = container.offsetWidth;

    if (containerWidth === 0) return;

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0) return;

    // A child card carries its own cosmetic `translateX(--parent-shift)` to
    // re-center it over its own children -- a CSS transform, invisible to
    // offsetLeft. Reading getBoundingClientRect instead captures the card's
    // true painted position (transform + ancestor zoom included), then we
    // divide out the container's current render scale to land back in the
    // SVG's local, unscaled coordinate space. Without this, any child whose
    // own card had been re-centered got its incoming line pointed at its
    // pre-shift slot instead of where it actually renders.
    const scale = containerRect.width / containerWidth;
    const childElements = Array.from(container.children);

    const getCenterX = (childEl) => {
      const card = childEl.querySelector('.node-box') || childEl;
      const rect = card.getBoundingClientRect();
      return (rect.left + rect.width / 2 - containerRect.left) / scale;
    };

    const firstChildCenter = getCenterX(childElements[0]);
    const lastChildCenter = getCenterX(childElements[childElements.length - 1]);

    const idealParentX = (firstChildCenter + lastChildCenter) / 2;
    const currentParentX = containerWidth / 2;
    const shift = idealParentX - currentParentX;

    setParentShift(shift);

    const paths = childElements.map((childEl, index) => {
      const childCenterX = getCenterX(childEl);
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

    // Children run their own mount effect (and may schedule their own
    // parentShift update) *before* this effect fires, since effects run
    // child-first -- but that update lands in a separate, React-batched
    // re-render this effect doesn't wait for. So the line above can compute
    // using each child's still-pre-shift position. Recomputing again a
    // couple of frames later, once that batched re-render has landed,
    // re-targets the lines at where the children's cards actually settle.
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(calculateBranchPaths);
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
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
    <motion.div
      className={`tree-node level-${level} ${level === 0 ? 'root-node' : ''}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: level * 0.08, ease: [0.4, 0, 0.2, 1] }}
    >
      <CardWrapper
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
      </CardWrapper>

      {/* Children Container & SVG Lineage Bezier Branch Renderer */}
      {isExpanded && hasChildren && (
          <motion.div
            className="tree-children-wrapper"
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "max-content",
              transformOrigin: "top center"
            }}
            initial={{ opacity: 0, scaleY: 0.85, y: -12 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
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
          </motion.div>
      )}
    </motion.div>
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
  const [searchBarOpen, setSearchBarOpen] = useState(false);
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
      image: getAssetPath('/optimized/source1.jpg'),
      type: "Document",
      date: "1942"
    },
    {
      title: "Ancestral Heritage Archive",
      description: "Historical municipal records, deed registry, and ancestral heritage notes.",
      image: getAssetPath('/optimized/source2.jpg'),
      type: "Archive",
      date: "1968"
    },
    {
      title: "Family Portrait Collection",
      description: "Vintage photographs collection capturing generations of the Bhatt family.",
      image: getAssetPath('/optimized/source3.jpg'),
      type: "Photograph",
      date: "1975"
    },
    {
      title: "Lineage Certificates",
      description: "Certificates, birth entries, and historical family certificates.",
      image: getAssetPath('/optimized/source4.jpg'),
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
      const rootCard = document.querySelector('.root-node > .card-wrapper > .node-box');
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

  // Center once on mount only -- intentionally NOT depending on centerCanvas,
  // whose identity changes on every zoomLevel update; depending on it here
  // would re-schedule this timer on every zoom and snap the view back to
  // the initial zoom level, fighting the user's own zoom in/out.
  useEffect(() => {
    const timer = setTimeout(centerCanvas, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const newZoom = Math.min(Math.max(zoomLevel * zoomFactor, MIN_ZOOM), 2.2);

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
      const newZoom = Math.min(Math.max(scale, MIN_ZOOM), 2.2);
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
      setSearchBarOpen(false);

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
    setZoomLevel(prev => Math.min(Math.max(prev + delta, MIN_ZOOM), 2.2));
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
    // reducedMotion="user" makes every motion.div/AnimatePresence transition
    // here respect the OS "reduce motion" accessibility setting -- without
    // it, a user with that setting on would see content that starts at
    // opacity:0 (our `initial` props) and never animates to visible, since
    // the animation itself is what's supposed to reveal it.
    <MotionConfig reducedMotion="user">
    <div className="app-container">
      {/* Subtle Static Clean Backdrop Gradient */}
      <div className="bg-clean-gradient" />

      {/* Faded Bhatt Family Crest Watermark -- fixed to viewport, sits behind the tree canvas */}
      <div className="bg-watermark" aria-hidden="true">
        <img 
          src={getAssetPath('bhatt-family-logo.png')} 
          alt="" 
          onError={(e) => {
            if (!e.target.dataset.triedFallback) {
              e.target.dataset.triedFallback = '1';
              e.target.src = '/bhatt-family-logo.png';
            } else if (e.target.dataset.triedFallback === '1') {
              e.target.dataset.triedFallback = '2';
              e.target.src = 'bhatt-family-logo.png';
            }
          }}
        />
      </div>

      {/* --- Ultra-Minimalist Floating Top Header (Single Line Glass Pill) --- */}
      <header className="main-header">
        <div className="header-left">
          <img 
            src={getAssetPath('bhatt-family-logo.png')} 
            alt="Bhatt Family" 
            className="brand-logo" 
            onError={(e) => {
              if (!e.target.dataset.triedFallback) {
                e.target.dataset.triedFallback = '1';
                e.target.src = '/bhatt-family-logo.png';
              } else if (e.target.dataset.triedFallback === '1') {
                e.target.dataset.triedFallback = '2';
                e.target.src = 'bhatt-family-logo.png';
              }
            }}
          />
          <div className="brand-title">
            <h1 className="neon-heading">{isMobile ? (isGujarati ? 'ભટ્ટ પરિવાર' : 'Bhatt Lineage') : t('rootsOfFamily')}</h1>
            <span className="members-badge">🌱 {TOTAL_MEMBERS}</span>
          </div>
        </div>

        {/* Right Toolbar Icon Actions */}
        <div className="header-actions">
          {/* Source Docs Button */}
          <button
            className={`action-btn source-btn ${isMobile ? 'mobile-labeled' : 'icon-only'}`}
            onClick={() => setSourceModalOpen(true)}
            title={t('source')}
          >
            <span className="btn-icon">📜</span>
            {isMobile && <span className="btn-label">{t('docsShort')}</span>}
          </button>

          {/* Search Toggle -- opens a thin search bar under the header, on both mobile and desktop */}
          <button
            className={`action-btn ${searchBarOpen ? 'active-tour' : ''} ${isMobile ? 'mobile-labeled' : 'icon-only'}`}
            onClick={() => setSearchBarOpen(v => !v)}
            title={t('searchShort')}
          >
            <span className="btn-icon">🔍</span>
            {isMobile && <span className="btn-label">{t('searchShort')}</span>}
          </button>

          {/* Language Toggle */}
          <button
            className={`action-btn lang-btn ${isMobile ? 'mobile-labeled' : 'icon-only'}`}
            onClick={() => setIsGujarati(v => !v)}
            title="Toggle Language"
          >
            <span className="btn-icon">{isGujarati ? '🇮🇳' : '🇬🇧'}</span>
            {isMobile && <span className="btn-label">{t('langShort')}</span>}
          </button>

          {/* Fullscreen Button */}
          <button
            className={`action-btn fullscreen-btn ${isMobile ? 'mobile-labeled' : 'icon-only'}`}
            onClick={toggleFullscreen}
            title={isFullScreen ? t('exitFullscreen') : t('fullscreen')}
          >
            <span className="btn-icon">{isFullScreen ? '↙️' : '⛶'}</span>
            {isMobile && <span className="btn-label">{isFullScreen ? t('exitFullShort') : t('fullShort')}</span>}
          </button>
        </div>
      </header>

      {/* --- Thin Search Flyout: separate pill, appears only when the search icon is tapped --- */}
      <AnimatePresence>
        {searchBarOpen && (
          <motion.div
            className="search-flyout card-glass"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
                {searchTerm && (
                  <button type="button" className="clear-search-btn" onClick={handleClearSearch} aria-label="Clear">
                    ✕
                  </button>
                )}
              </div>
            </form>
            <button
              type="button"
              className="search-flyout-close"
              onClick={() => setSearchBarOpen(false)}
              aria-label="Close search"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Ultra-Minimalist Floating Bottom Controls Dock (Single Line Pill) --- */}
      <div className="controls-dock">
        {isMobile ? (
          <div className="mobile-dock-row">
            <button className="dock-btn mobile-labeled" onClick={handlePrevGen} title={t('prevGen')}>
              <span className="btn-icon">◀</span>
              <span className="btn-label">{t('prevShort')}</span>
            </button>

            <span className="step-badge" title="Current Generation Level">
              {t('genShort')} {visibleGenLevel - 1}/{MAX_TREE_DEPTH}
            </span>

            <button className="dock-btn mobile-labeled" onClick={handleNextGen} title={t('nextGen')}>
              <span className="btn-icon">▶</span>
              <span className="btn-label">{t('nextShort')}</span>
            </button>

            <div className="dock-divider" />

            <button className="dock-btn mobile-labeled" onClick={centerCanvas} title={t('resetZoom')}>
              <span className="btn-icon">🎯 {Math.round(zoomLevel * 100)}%</span>
              <span className="btn-label">{t('resetShort')}</span>
            </button>

            <button className="dock-btn mobile-labeled" onClick={handleShowAll} title={t('expandAll')}>
              <span className="btn-icon">⏩</span>
              <span className="btn-label">{t('allShort')}</span>
            </button>

            <button className={`dock-btn mobile-labeled ${isPlayingTour ? 'active-tour' : ''}`} onClick={toggleTour} title={isPlayingTour ? t('pauseTour') : t('playTour')}>
              <span className="btn-icon">{isPlayingTour ? '⏸️' : '▶'}</span>
              <span className="btn-label">{isPlayingTour ? t('pauseShort') : t('tourShort')}</span>
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

      {/* --- Mobile Member Bottom Sheet Drawer --- */}
      <AnimatePresence>
        {isMobile && selectedMember && (
          <motion.div
            className="modal-overlay"
            onClick={() => setSelectedMember(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="mobile-member-sheet card-glass"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="modal-overlay"
            onClick={() => setModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="modal-content card-glass"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close">&times;</button>
              <div className="modal-body">
                <picture>
                  <source srcSet={`${modalImg}.avif`} type="image/avif" />
                  <source srcSet={`${modalImg}.webp`} type="image/webp" />
                  <img src={`${modalImg}.jpg`} alt="Family Member" className="enlarged-image" />
                </picture>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Source Documentation Modal --- */}
      <AnimatePresence>
        {sourceModalOpen && (
          <motion.div
            className="modal-overlay"
            onClick={() => setSourceModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="source-modal-content card-glass"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              <button className="modal-close" onClick={() => setSourceModalOpen(false)} aria-label="Close">&times;</button>
              <h2 className="source-modal-title">📜 {t('sourceDocumentation')}</h2>
              <div className="source-grid">
                {sources.map((src, idx) => (
                  <motion.div
                    key={idx}
                    className="source-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06, duration: 0.3 }}
                  >
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
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Enlarged Source Image Lightbox --- */}
      <AnimatePresence>
        {enlargedSourceImage && (
          <motion.div
            className="modal-overlay"
            onClick={() => setEnlargedSourceImage(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="modal-content card-glass"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              <button className="modal-close" onClick={() => setEnlargedSourceImage(null)} aria-label="Close">&times;</button>
              <div className="modal-body">
                <img src={enlargedSourceImage} alt="Enlarged Document" className="enlarged-image" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
};

export default FamilyTreeApp;
