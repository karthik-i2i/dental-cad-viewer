import { useEffect, useMemo, useState } from 'react';
import { PROGRESS_STEPS } from '../constants';

const useProgressSimulation = ({
  scanData,
  resultUrl,
  sampleResultUrl,
  onSetResultUrl,
}) => {
  const [progressIndex, setProgressIndex] = useState(0);

  const canRender = Boolean(resultUrl);

  useEffect(() => {
    if (!scanData || canRender) {
      setProgressIndex(0);
      return;
    }

    setProgressIndex(0);

    const delayPerStep = 900;

    const timers = PROGRESS_STEPS.map((_, index) =>
      window.setTimeout(() => {
        setProgressIndex(index + 1);

        if (
          index === PROGRESS_STEPS.length - 1 &&
          !resultUrl &&
          typeof onSetResultUrl === 'function' &&
          sampleResultUrl
        ) {
          onSetResultUrl(sampleResultUrl);
        }
      }, delayPerStep * (index + 1))
    );

    return () => timers.forEach(clearTimeout);
  }, [
    scanData,
    canRender,
    resultUrl,
    sampleResultUrl,
    onSetResultUrl,
  ]);

  const currentProgress = useMemo(() => {
    if (progressIndex === 0) {
      return null;
    }

    return PROGRESS_STEPS[
      Math.min(progressIndex - 1, PROGRESS_STEPS.length - 1)
    ];
  }, [progressIndex]);

  const progressPercentage = currentProgress?.progress ?? 0;
  const currentStep = currentProgress?.label ?? 'Preparing AI generation...';

  return {
    progressIndex,
    progressPercentage,
    currentStep,
    totalSteps: PROGRESS_STEPS.length,
  };
};

export default useProgressSimulation;