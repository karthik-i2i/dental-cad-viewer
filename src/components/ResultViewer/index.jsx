import React, { useState, useMemo } from 'react';
import STLViewer from '../STLViewer/STLViewerR3F';
import styles from './ResultViewer.module.css';
import { STL_FILES } from './constants';

import Header from './components/Header';
import EmptyState from './components/EmptyState';
import ProgressState from './components/ProgressState';
import ModelExplorer from './components/ModelExplorer';
import ViewerToolbar from './components/ViewerToolbar';
import InfoBar from './components/InfoBar';
import { useDownloadZip } from './hooks/useDownloadZip';
import { formatOption } from './utils'
import useProgressSimulation from './hooks/useProgressSimulation';

const ResultViewer = ({ resultUrl, scanData, onStartOver, onSetResultUrl, sampleResultUrl }) => {
  const originalFile  = scanData?.scan1;
  const secondFile    = scanData?.scan2;
  const shieldOption  = scanData?.shieldOption; // ← new

  const [wireframe,   setWireframe]   = useState(false);
  const [autoRotate,  setAutoRotate]  = useState(false);
  const [activeView, setActiveView] = useState(null);
  const [viewerKey,   setViewerKey]   = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([
    STL_FILES[STL_FILES.length - 1]
  ]);

  const selectedPaths = useMemo(
    () => selectedFiles.map(f => f.path),
    [selectedFiles]
  );

  const accentColor = wireframe ? '#3E4A5A' : '#E8D5C3';

  const {
    progressIndex,
    progressPercentage,
    currentStep,
    totalSteps,
  } = useProgressSimulation({
    scanData,
    resultUrl,
    sampleResultUrl,
    onSetResultUrl,
  });

  // Derived state
  const canRender = Boolean(resultUrl);
  const isWaitingForResult = Boolean(scanData && !resultUrl);
  const { isDownloading, downloadZip } = useDownloadZip(selectedFiles);

  // Event handlers
  const handleReset = () => {
    setActiveView(null);
    setViewerKey(k => k + 1);
  };

  const toggleFileSelection = (file) => {
    setSelectedFiles((prev) => {
      const alreadySelected = prev.some(
        (f) => f.id === file.id
      );

      if (alreadySelected) {
        if (prev.length === 1) return prev;

        return prev.filter((f) => f.id !== file.id);
      }

      return [...prev, file];
    });
  };

  return (
    <div className={styles.container}>

      <Header canRender={canRender} onStartOver={onStartOver}/>

      {/* ── Main 3D Viewer ─────────────────────────────────────────────────── */}
      <div className={styles.viewerContainer}>
        <div className={styles.viewerInner}>
          {canRender ? (
            <>
              <div className={styles.viewerLayout}>
                <div className={styles.viewerPane}>
                  <STLViewer
                    key={viewerKey}
                    stlUrls={selectedPaths}
                    accentColor={accentColor}
                    background="#07111F"
                    autoRotate={autoRotate}
                    wireframe={wireframe}
                    showGrid={false}
                    enablePan={true}
                  />
                </div>
                <ModelExplorer selectedFiles={selectedFiles} onToggle={toggleFileSelection}/>
              </div>
            </>
          ) : isWaitingForResult ? (
            <ProgressState
              progressPercentage={progressPercentage}
              currentStep={currentStep}
              progressIndex={progressIndex}
              totalSteps={totalSteps}
            />
          ) : (
            <EmptyState
              originalFile={originalFile}
              secondFile={secondFile}
              shieldOption={shieldOption}
              formatOption={formatOption}
            />
          )}

        </div>

        <ViewerToolbar
          canRender={canRender}
          autoRotate={autoRotate}
          wireframe={wireframe}
          activeView={activeView}
          setActiveView={setActiveView}
          onToggleRotate={() => setAutoRotate(v => !v)}
          onToggleWireframe={() => setWireframe(v => !v)}
          onReset={handleReset}
        />
      </div>

      <InfoBar
        originalFile={originalFile}
        shieldOption={shieldOption}
        formatOption={formatOption}
        selectedCount={selectedFiles.length}
        totalCount={STL_FILES.length}
        isDownloading={isDownloading}
        canRender={canRender}
        onDownload={downloadZip}
      />
    </div>
  );
};


export default ResultViewer;
