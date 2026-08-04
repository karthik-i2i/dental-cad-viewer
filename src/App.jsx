import React, { useReducer, useCallback } from "react";
import LoginStep from "./components/Login";
import RegisterStep from "./components/Register";
import UploadStep from "./components/Upload";
import ResultViewer from "./components/ResultViewer";
import { APP_HEADER_TOAST_ROOT_ID } from "./components/ResultViewer/components/StageReadyToast";
import { uploadReducer } from "./components/Upload/state/uploadReducer";
import { uploadInitialState } from "./components/Upload/state/uploadInitialState";
import { ACTION } from "./components/Upload/state/uploadConstants";
import "./App.css";

function App() {
  const [step, setStep] = React.useState("login"); // 'login' | 'register' | 'upload' | 'result'
  const [user, setUser] = React.useState(null);
  const [scanData, setScanData] = React.useState(null);
  const [resultUrl, setResultUrl] = React.useState(null);
  const [uploadState, uploadDispatch] = useReducer(
    uploadReducer,
    uploadInitialState
  );

  const sampleResultUrl = "/models/DV0001_LATERALIZING_LEFT.stl";

  const resetUploadDraft = useCallback(() => {
    uploadDispatch({ type: ACTION.WORKFLOW_RESET });
  }, []);

  const handleLogin = (userData) => {
    console.log('User logged in:', userData);
    setUser(userData);
    setStep("upload");
  };

  const handleLogout = () => {
    console.log('User logged out');
    setUser(null);
    setScanData(null);
    setResultUrl(null);
    resetUploadDraft();
    setStep("login");
  };

  const handleOpenRegister = () => {
    setStep("register");
  };

  const handleRegisterSuccess = (userData) => {
    console.log('User registered:', userData);
    setUser(userData);
    setStep("upload");
  };

  const handleConfirm = (data) => {
    console.log('Upload confirmed with data:', data);
    setScanData(data);
    setResultUrl(null);
    setStep("result");
  };

  /** Fresh Upload — clears result session and upload draft. */
  const handleGoHome = () => {
    setScanData(null);
    setResultUrl(null);
    resetUploadDraft();
    setStep("upload");
  };

  /** Return to Upload with the shared draft intact (review state). */
  const handleGoBack = () => {
    setStep("upload");
  };

  return (
    <div className="appShell">
      {step === "login" ? (
        <LoginStep onLogin={handleLogin} onRegister={handleOpenRegister} />
      ) : step === "register" ? (
        <RegisterStep
          onRegisterSuccess={handleRegisterSuccess}
          onBackToLogin={() => setStep("login")}
        />
      ) : (
        <>
          <div className="appHeader">
            <div className="appBrand">
              <img
                className="appLogo"
                src="/logo-kallisio.svg"
                alt="Kallisio Stentra Design System"
              />
            </div>
            <div
              id={APP_HEADER_TOAST_ROOT_ID}
              className="appHeaderToastRoot"
              aria-live="off"
            />
            <div className="appHeaderRight">
              <span className="appWelcome">
                Welcome, {user?.userName || 'User'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="logoutBtn"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="appContent">
            {step === "upload" ? (
              <UploadStep
                onConfirm={handleConfirm}
                uploadState={uploadState}
                uploadDispatch={uploadDispatch}
              />
            ) : (
              <ResultViewer
                resultUrl={resultUrl}
                scanData={scanData}
                onGoHome={handleGoHome}
                onGoBack={handleGoBack}
                onSetResultUrl={setResultUrl}
                sampleResultUrl={sampleResultUrl}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
