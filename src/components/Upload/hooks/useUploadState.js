import { useState, useRef, useCallback, useEffect } from 'react';
import { validateFile } from '../utils';

const useUploadState = (onConfirm) => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [shieldOption, setShieldOption] = useState(''); // new radiation shield form
  const [selectedPreview, setSelectedPreview] = useState('scan1'); // 'scan1' or 'scan2'
  const [error, setError] = useState('');
  const inputRef  = useRef();
  const input2Ref = useRef();
  const canProceed = !!file1 && !!file2 && !!shieldOption;

  const handleFile = useCallback((f, slot) => {
    setError('');
    if (!f) return;
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (slot === 1) setFile1(f);
    if (slot === 2) setFile2(f);
  }, []);

const handleFiles = useCallback((files) => {
  if (!files || files.length === 0) {
    return;
  }

  const [first, second] = Array.from(files);

  if (first) {
    handleFile(first, 1);
  }

  if (second) {
    handleFile(second, 2);
  }
}, [handleFile]);

  const handleConfirm = () => {
    if (!file1 || !file2 || !shieldOption) return; // should not happen due to button disable
    if (typeof onConfirm === 'function') {
      onConfirm({
        shieldOption,
        scan1: file1,
        scan2: file2,
      });
    }
  };

  useEffect(() => {
    if (!file1 && !file2) {
      setShieldOption('');
      setSelectedPreview('scan1');
      setError('');
    }
  }, [file1, file2]);

  return {
    file1,
    setFile1,
    file2,
    setFile2,
    shieldOption,
    setShieldOption,
    selectedPreview,
    setSelectedPreview,
    error,
    setError,
    inputRef,
    input2Ref,
    canProceed,
    handleFile,
    handleFiles,
    handleConfirm,
  };
};

export default useUploadState;