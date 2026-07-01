import React from 'react';
import styles from '../ResultViewer.module.css';
import {
  Rotate360Icon,
  WireframeIcon,
  ResetIcon,
} from '../icons';

const VIEW_BUTTONS = [
  { label: 'Front', view: 'front' },
  { label: 'Back', view: 'back' },
  { label: 'Left', view: 'left' },
  { label: 'Right', view: 'right' },
  { label: 'Top', view: 'top' },
  { label: 'Bottom', view: 'bottom' },
];

const ViewerToolbar = ({
  canRender,
  autoRotate,
  wireframe,
  activeView,
  setActiveView,
  onToggleRotate,
  onToggleWireframe,
  onReset,
}) => {

  const dispatchView = (view) => {
    setActiveView(view);
    window.dispatchEvent(new CustomEvent(`viewer-${view}-view`));
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolGroup}>
        <button
          className={`${styles.toolBtn} ${autoRotate ? styles.toolBtnActive : ''}`}
          onClick={onToggleRotate}
          disabled={!canRender}
        >
          <Rotate360Icon />
          <span>360° Auto-Rotate</span>
        </button>

        <button
          className={`${styles.toolBtn} ${wireframe ? styles.toolBtnActive : ''}`}
          onClick={onToggleWireframe}
          disabled={!canRender}
        >
          <WireframeIcon />
          <span>Wireframe</span>
        </button>

        {VIEW_BUTTONS.map(({ label, view }) => (
          <button
            key={view}
            className={`${styles.toolBtn} ${
              activeView === view ? styles.toolBtnActive : ''
            }`}
            onClick={() => dispatchView(view)}
            disabled={!canRender}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className={styles.toolDivider} />

      <div className={styles.toolGroup}>
        <button
          className={styles.toolBtn}
          onClick={onReset}
          disabled={!canRender}
        >
          <ResetIcon />
          <span>Reset View</span>
        </button>
      </div>

      <div className={styles.toolHints}>
        <div className={styles.hintPill}>
          🖱️ Drag to rotate
        </div>
        <div className={styles.hintPill}>
          ⚲ Scroll to zoom
        </div>
      </div>
    </div>
  );
};

export default ViewerToolbar;