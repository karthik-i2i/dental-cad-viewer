import { useState, useRef, useCallback, useEffect } from 'react';
import { validateFile } from '../utils';

const useUploadState = (onConfirm) => {
  const [maxillaFile, setMaxillaFile] = useState(null);
  const [mandibleFile, setMandibleFile] = useState(null);
  const [shieldOption, setShieldOption] = useState('');
  const [selectedPreview, setSelectedPreview] = useState('maxilla');
  const [error, setError] = useState('');
  const inputRef  = useRef();
  const input2Ref = useRef();
  const canProceed = !!maxillaFile && !!mandibleFile && !!shieldOption;

  const handleFile = useCallback((f, slot) => {
    setError('');
    if (!f) return;
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (slot === 1) setMaxillaFile(f);
    if (slot === 2) setMandibleFile(f);
  }, []);

  const handleFiles = useCallback((files) => {
    if (!files || files.length === 0) {
      return;
    }

    if (files.length > 2) {
      setError('Please select only two STL files: one Mandible scan and one Maxilla scan.');
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
    if (!maxillaFile || !mandibleFile || !shieldOption) return; // should not happen due to button disable
    if (typeof onConfirm === 'function') {
      onConfirm({
        shieldOption,
        scan1: maxillaFile,
        scan2: mandibleFile,
      });
    }
  };

  useEffect(() => {
    if (!maxillaFile && !mandibleFile) {
      setShieldOption('');
      setSelectedPreview('maxilla');
      setError('');
    }
  }, [maxillaFile, mandibleFile]);

  return {
    maxillaFile,
    setMaxillaFile,
    mandibleFile,
    setMandibleFile,
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