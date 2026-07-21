import React from "react";
import LoginStep from "./components/Login";
import RegisterStep from "./components/Register";
import UploadStep from "./components/Upload";
import ResultViewer from "./components/ResultViewer";
import { APP_HEADER_TOAST_ROOT_ID } from "./components/ResultViewer/components/StageReadyToast";
import "./App.css";

function App() {
  const [step, setStep] = React.useState("login"); // 'login' | 'register' | 'upload' | 'result'
  const [user, setUser] = React.useState(null);
  const [scanData, setScanData] = React.useState(null);
  const [resultUrl, setResultUrl] = React.useState(null);

  const sampleResultUrl = "/models/DV0001_LATERALIZING_LEFT.stl";

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

  const handleStartOver = () => {
    setScanData(null);
    setResultUrl(null);
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
            <h2 className="appTitle">
              Kallisio Stentra Design System
            </h2>
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
              <UploadStep onConfirm={handleConfirm} />
            ) : (
              <ResultViewer
                resultUrl={resultUrl}
                scanData={scanData}
                onStartOver={handleStartOver}
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
