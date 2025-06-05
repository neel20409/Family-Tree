import React, { useState, useEffect, useRef } from 'react';
import familyTree from "../data/familyData";
import confetti from 'canvas-confetti';

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

const TreeNode = ({ node = familyTree, level = 0, onPhotoClick, expandPath = [], highlightName, activePath = [], onMaxDepth }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [glow, setGlow] = useState(false);
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

    // Preload pop sound
    if (!popAudioRef.current) {
      popAudioRef.current = new Audio(`${import.meta.env.BASE_URL}pop.mp3`);
      popAudioRef.current.load();
    }

    // Expand if in path
    if (expandPath && expandPath[level] === node.name) {
      setIsExpanded(true);
    } else if (expandPath && expandPath.length > 0) {
      setIsExpanded(false);
    }

    return () => clearTimeout(timer);
  }, [level, expandPath, node.name]);

  // Report max expanded depth upward
  useEffect(() => {
    if (onMaxDepth && isExpanded) {
      onMaxDepth(level);
    }
  }, [isExpanded, level, onMaxDepth]);

  // Horizontal connector calculation
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

  const handlePhotoClick = (e) => {
    e.stopPropagation();
    if (node.photo && onPhotoClick) {
      setGlow(true);
      setTimeout(() => setGlow(false), 1000);
      // Play pop sound instantly
      if (popAudioRef.current) {
        popAudioRef.current.currentTime = 0;
        popAudioRef.current.play();
      }
      onPhotoClick(`${import.meta.env.BASE_URL}optimized/${node.photo ? node.photo.replace(/^\//, '') : ''}`);
    }
  };

  const getNodeColors = (level) => {
    const colors = [
      { bg: '#1a365d', shadow: '#0f172a', border: '#3b82f6' }, // Darker blue
      { bg: '#9c2706', shadow: '#7c1810', border: '#f97316' }, // Deep orange
      { bg: '#134e4a', shadow: '#042f2e', border: '#2dd4bf' }, // Deep teal
      { bg: '#581c87', shadow: '#3b0764', border: '#c084fc' }, // Deep purple
    ];
    return colors[Math.min(level, colors.length - 1)];
  };

  const isActivePath = activePath && activePath.includes(node.name);

  return (
    <div className={`tree-node ${level === 0 ? 'root-node' : ''} ${isVisible ? 'visible' : ''}`}>
      <div 
        className={`node-box ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''} ${glow ? 'glow' : ''} ${highlightName === node.name ? 'highlighted' : ''} ${isActivePath ? 'active-path' : ''}`}
        onClick={handleClick}
        style={{
          backgroundColor: isActivePath ? '#1ed760' : getNodeColors(level).bg,
          borderColor: isActivePath ? '#1ed760' : getNodeColors(level).border,
          boxShadow: `0 4px 6px -1px ${isActivePath ? '#1ed760' : getNodeColors(level).shadow}40, 0 2px 4px -2px ${isActivePath ? '#1ed760' : getNodeColors(level).shadow}40, inset 0 1px 0 ${isActivePath ? '#1ed760' : getNodeColors(level).border}40`,
          color: isActivePath ? '#134e4a' : 'white',
        }}
      >
        {hasChildren && (
          <span className="node-indicator">
            {isExpanded ? '−' : '+'}
          </span>
        )}
        <div className="node-photo" onClick={handlePhotoClick} style={{ cursor: node.photo ? 'zoom-in' : 'default' }}>
          {node.photo ? (
            <img src={`${import.meta.env.BASE_URL}optimized/${node.photo.replace(/^\//, '')}`} alt={node.name} />
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

      {/* Connection lines */}
      {isExpanded && hasChildren && (
        <div style={{ position: "relative", display: "inline-block", width: "auto" }}>
          {/* Vertical line from parent to horizontal connector */}
          <div
            style={{
              width: 0,
              height: 20,
              borderLeft: `2px solid ${getNodeColors(level).border}`,
              margin: "0 auto",
              position: "absolute",
              left: "50%",
              top: -20,
              transform: "translateX(-50%)",
              zIndex: 2,
            }}
          />
          {/* Horizontal connector above children */}
          {childrenCount > 1 && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: startOffset,
                width: lineWidth,
                borderTop: `2px solid ${getNodeColors(level).border}`,
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
                {/* Vertical line from horizontal to child */}
                {childrenCount > 1 && (
                  <div
                    style={{
                      width: 0,
                      height: 20,
                      borderLeft: `2px solid ${getNodeColors(level).border}`,
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

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
        .tree-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 20px 10px;
          position: relative;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s ease-out;
          min-width: max-content;
        }

        .tree-node.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .node-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 220px;
          padding: 15px;
          color: white;
          border-radius: 16px;
          cursor: pointer;
          font-weight: 500;
          font-family: Arial, sans-serif;
          position: relative;
          border: 1px solid;
          transition: all 0.3s ease;
          gap: 12px;
        }

        .node-box:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .node-box.expanded {
          transform: translateY(-2px);
        }

        .node-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .node-header {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          gap: 8px;
        }

        .node-photo {
          width: 85px;
          height: 85px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: 3px solid rgba(255, 255, 255, 0.3);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          transition: all 0.3s ease;
        }

        .node-box:hover .node-photo {
          transform: scale(1.05);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .node-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .node-photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          font-weight: 600;
        }

        .node-name {
          font-size: 15px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          text-align: center;
          font-weight: 600;
          margin-bottom: 8px;
          padding: 0 5px;
        }

        .dates-container {
          display: flex;
          flex-direction: row;
          gap: 8px;
          width: 100%;
          justify-content: center;
        }

        .date-box {
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 8px;
          border-radius: 8px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 85px;
        }

        .date-label {
          font-size: 10px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .date-value {
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
        }

        .node-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 16px;
          font-weight: bold;
          opacity: 0.8;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .connector-line {
          position: absolute;
          top: -20px;
          left: 50%;
          width: 2px;
          height: 20px;
          background: ${getNodeColors(level).border};
          transform: translateX(-50%);
          z-index: 2;
        }

        .connector-line::before {
          display: none;
        }

        .children-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          min-width: 0;
          position: relative;
          padding-top: 0;
        }

        .children-inner {
          display: flex;
          position: relative;
          width: 100%;
          justify-content: center;
          align-items: flex-start;
        }

        .horizontal-connector {
          position: absolute;
          top: 0;
          height: 2px;
          background: ${getNodeColors(level).border};
          z-index: 1;
          left: 0;
          right: 0;
          margin-left: 110px;
          margin-right: 110px;
        }

        .child-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          margin: 0 10px;
        }

        .node-box.glow {
          animation: glowEffect 1s;
          box-shadow: 0 0 0 6px #fff, 0 0 16px 8px #fffd44, 0 0 32px 16px #ff005a;
          border: 2px solid #fffd44;
        }

        @keyframes glowEffect {
          0% {
            box-shadow: 0 0 0 0 #fff, 0 0 0 0 #fffd44, 0 0 0 0 #ff005a;
            border-color: #fffd44;
          }
          60% {
            box-shadow: 0 0 0 6px #fff, 0 0 16px 8px #fffd44, 0 0 32px 16px #ff005a;
            border-color: #fffd44;
          }
          100% {
            box-shadow: 0 0 0 0 #fff, 0 0 0 0 #fffd44, 0 0 0 0 #ff005a;
            border-color: inherit;
          }
        }

        .node-box.highlighted {
          border: 3px solid #ff8ee6;
          box-shadow: 0 0 16px 4px #ff8ee6, 0 0 32px 8px #fff2fa;
        }

        .node-box.active-path {
          border: 2px solid #1ed760;
          /* No custom box-shadow, use inline style */
        }

        @media (max-width: 768px) {
          .node-box {
            width: 180px;
            padding: 12px;
          }

          .node-photo {
            width: 70px;
            height: 70px;
            border-width: 2px;
          }

          .node-photo-placeholder {
            font-size: 22px;
          }

          .node-name {
            font-size: 13px;
          }

          .dates-container {
            gap: 6px;
          }

          .date-box {
            padding: 3px 6px;
            min-width: 70px;
          }

          .date-value {
            font-size: 10px;
          }

          .date-label {
            font-size: 9px;
          }
        }

        @media (max-width: 480px) {
          .node-box {
            width: 160px;
            padding: 10px;
          }

          .date-box {
            min-width: 60px;
          }

          .date-value {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
};

const FamilyTreeApp = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState(null);
  const confettiFired = useRef(false);
  const [search, setSearch] = useState('');
  const [expandPath, setExpandPath] = useState([]);
  const [highlightName, setHighlightName] = useState('');
  const [activePath, setActivePath] = useState([]);
  const [maxExpandedDepth, setMaxExpandedDepth] = useState(0);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [enlargedSourceImg, setEnlargedSourceImg] = useState(null);

  // Handler to update max expanded depth
  const handleMaxDepth = (depth) => {
    setMaxExpandedDepth(prev => (depth > prev ? depth : prev));
  };

  const handlePhotoClick = (img) => {
    setModalImg(img);
    setModalOpen(true);
    confettiFired.current = false;
  };

  const openSourceModal = () => setSourceModalOpen(true);
  const closeSourceModal = () => setSourceModalOpen(false);
  const handleSourceImgClick = (src) => setEnlargedSourceImg(src);
  const closeEnlargedSourceImg = () => setEnlargedSourceImg(null);

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
    // Reset maxExpandedDepth when search changes
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
    setTimeout(() => setModalImg(null), 300); // match animation duration
  };

  return (
    <div className="app-container">
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
      <div className="source-btn-container">
        <button className="source-btn" onClick={openSourceModal}>Source</button>
      </div>
      <div className="heading-center">
        <h1 className="neon-heading">Roots of the Bhatt Family</h1>
      </div>
      <div className="tree-container" style={{
        transform: `scale(${Math.max(1 - maxExpandedDepth * 0.06, 0.8)})`, transition: 'transform 0.4s cubic-bezier(.4,2,.6,1)'
      }}>
        <TreeNode onPhotoClick={handlePhotoClick} expandPath={expandPath} highlightName={highlightName} activePath={activePath} onMaxDepth={handleMaxDepth} />
      </div>

      {/* Modal for enlarged photo */}
      {modalOpen && modalImg && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-img-container" onClick={e => e.stopPropagation()}>
            <div className="colorful-border-wrapper">
              <img src={`${import.meta.env.BASE_URL}optimized/${modalImg ? modalImg.replace(/^\//, '') : ''}`} alt="Enlarged" className="modal-img" />
            </div>
            <button className="modal-close" onClick={closeModal}>&times;</button>
          </div>
        </div>
      )}

      {/* Source Modal */}
      {sourceModalOpen && (
        <div className="modal-overlay" onClick={closeSourceModal}>
          <div className="modal-img-container" onClick={e => e.stopPropagation()}>
            <div className="source-modal-gallery">
              <img src={`${import.meta.env.BASE_URL}optimized/source1.jpg`} alt="Source 1" className="source-modal-img" onClick={() => handleSourceImgClick(`${import.meta.env.BASE_URL}optimized/source1.jpg`)} />
              <img src={`${import.meta.env.BASE_URL}optimized/source2.jpg`} alt="Source 2" className="source-modal-img" onClick={() => handleSourceImgClick(`${import.meta.env.BASE_URL}optimized/source2.jpg`)} />
              <img src={`${import.meta.env.BASE_URL}optimized/source3.jpg`} alt="Source 3" className="source-modal-img" onClick={() => handleSourceImgClick(`${import.meta.env.BASE_URL}optimized/source3.jpg`)} />
              <img src={`${import.meta.env.BASE_URL}optimized/source4.jpg`} alt="Source 4" className="source-modal-img" onClick={() => handleSourceImgClick(`${import.meta.env.BASE_URL}optimized/source4.jpg`)} />
              <img src={`${import.meta.env.BASE_URL}optimized/source5.jpg`} alt="Source 5" className="source-modal-img" onClick={() => handleSourceImgClick(`${import.meta.env.BASE_URL}optimized/source5.jpg`)} />
            </div>
            <button className="modal-close" onClick={closeSourceModal}>&times;</button>
          </div>
        </div>
      )}

      {/* Enlarged Source Image Modal */}
      {enlargedSourceImg && (
        <div className="modal-overlay" onClick={closeEnlargedSourceImg}>
          <div className="modal-img-container" onClick={e => e.stopPropagation()}>
            <img src={enlargedSourceImg && !enlargedSourceImg.startsWith('http') ? `${import.meta.env.BASE_URL}optimized/${enlargedSourceImg.replace(/^\//, '')}` : enlargedSourceImg} alt="Enlarged Source" className="modal-img" />
            <button className="modal-close" onClick={closeEnlargedSourceImg}>&times;</button>
          </div>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
        .app-container {
          padding: 0;
          width: 100vw;
          min-height: 100vh;
          background-image: url('${import.meta.env.BASE_URL}optimized/castle.jpg');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 0;
          overflow-x: auto;
          box-sizing: border-box;
        }
        :global(html), :global(body), :global(#root), :global(.app-container) {
          margin: 0;
          padding: 0;
          width: 100vw;
          min-height: 100vh;
          box-sizing: border-box;
          overflow-x: hidden;
          background-image: url('${import.meta.env.BASE_URL}optimized/castle.jpg');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          background-attachment: fixed;
        }
        .search-bar-topright {
          position: fixed;
          top: 18px;
          right: 18px;
          z-index: 100;
          background: none;
        }
        .source-btn-container {
          position: absolute;
          left: 0;
          top: 90px;
          z-index: 101;
          display: flex;
          align-items: flex-start;
          width: 100px;
          justify-content: flex-start;
        }
        .source-btn {
          font-family: 'Segoe UI', 'Arial', sans-serif;
          font-size: 1.1rem;
          color: #fff;
          background: #2563eb;
          border: none;
          border-radius: 12px;
          padding: 8px 22px;
          margin-left: 12px;
          margin-top: 0;
          cursor: pointer;
          box-shadow:
            0 0 8px #39fff6,
            0 0 16px #39fff6,
            0 0 32px #39fff6,
            0 0 64px #2563eb;
          animation: neonPulse 1.5s infinite alternate;
          transition: filter 0.2s, background 0.2s;
        }
        .source-btn:hover {
          filter: brightness(1.2) drop-shadow(0 0 8px #39fff6);
          background: #1e40af;
        }
        .heading-center {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 24px;
          margin-bottom: 0;
        }
        .neon-heading {
          font-family: 'Dancing Script', cursive, 'Brush Script MT', 'Playfair Display', serif;
          font-size: 2.8rem;
          color: #39fff6;
          text-shadow:
            0 0 8px #39fff6,
            0 0 16px #39fff6,
            0 0 32px #39fff6,
            0 0 64px #0ff,
            0 0 2px #fff;
          letter-spacing: 2px;
          padding: 12px 28px;
          border-radius: 18px;
          background: rgba(0,0,0,0.6);
          animation: neonPulse 1.5s infinite alternate;
          margin: 20px 0 40px 0;
          text-align: center;
          margin-left: auto;
          margin-right: auto;
          max-width: 90vw;
        }
        @keyframes neonPulse {
          0% {
            text-shadow:
              0 0 8px #39fff6,
              0 0 16px #39fff6,
              0 0 32px #39fff6,
              0 0 64px #0ff,
              0 0 2px #fff;
            color: #39fff6;
          }
          100% {
            text-shadow:
              0 0 16px #fff,
              0 0 32px #0ff,
              0 0 64px #39fff6,
              0 0 128px #0ff,
              0 0 4px #fff;
            color: #fff;
          }
        }

        .tree-container {
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: fit-content;
          width: auto;
          max-width: 100vw;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(5px);
          border-radius: 25px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          height: auto;
          min-height: 85vh;
          position: relative;
          overflow-x: auto;
          margin: 0 auto;
        }

        .tree-container::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        .tree-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
        }

        .tree-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .tree-container::-webkit-scrollbar-corner {
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .app-container {
            padding: 10px;
          }

          .tree-container {
            padding: 15px;
            max-width: 100vw;
            min-width: 0;
          }

          h1 {
            font-size: 1.8rem;
            margin: 15px 0 20px 0;
            padding: 8px 15px;
          }
        }

        @media (max-width: 480px) {
          .node-box {
            min-width: 140px;
            padding: 8px 12px;
          }

          .node-name {
            font-size: 12px;
          }
        }

        @media (max-width: 600px) {
          .search-bar-topright {
            top: 8px;
            right: 8px;
          }
          .neon-heading {
            font-size: 1.5rem;
            padding: 8px 8px;
          }
          .source-btn-container {
            top: 60px;
            width: auto;
          }
          .source-btn {
            font-size: 1rem;
            padding: 6px 14px;
            margin-left: 4px;
          }
        }

        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s;
        }
        .modal-img-container {
          position: relative;
          background: transparent;
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          animation: scaleIn 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 90vw;
          max-height: 90vh;
        }
        .colorful-border-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 16px;
          background: linear-gradient(135deg, #ff005a, #fffd44, #00ffae, #00c3ff, #ff005a);
        }
        .modal-img {
          width: min(90vw, 500px);
          height: auto;
          max-width: 90vw;
          max-height: 80vh;
          object-fit: contain;
          border-radius: 12px;
          background: transparent;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        }
        .modal-close {
          position: absolute;
          top: 10px;
          right: 16px;
          background: none;
          border: none;
          font-size: 2rem;
          color: #333;
          cursor: pointer;
          z-index: 2;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .search-bar {
          padding: 4px 12px;
          border-radius: 16px;
          border: 1.5px solid #ff8ee6;
          font-size: 1rem;
          width: 140px;
          outline: none;
          background: rgba(30,30,30,0.5);
          color: #fff;
          box-shadow: 0 0 8px #ff8ee6;
          transition: border 0.2s, box-shadow 0.2s;
        }
        .search-bar:focus {
          border: 2px solid #fff;
          box-shadow: 0 0 12px #ff8ee6, 0 0 2px #fff;
        }

        .source-modal-gallery {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          justify-items: center;
          align-items: center;
          padding: 10px 0;
        }
        .source-modal-img {
          max-width: 180px;
          max-height: 180px;
          border-radius: 10px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
          background: #fff;
          object-fit: cover;
          transition: transform 0.2s;
        }
        .source-modal-img:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default FamilyTreeApp;
