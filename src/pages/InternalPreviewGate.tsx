import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PREVIEW_SESSION_KEY = "flori_internal_preview";

const InternalPreviewGate = () => {
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.setItem(PREVIEW_SESSION_KEY, "true");
    // Force a full reload so App re-evaluates maintenance check
    window.location.replace("/");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Unlocking preview…</p>
    </div>
  );
};

export default InternalPreviewGate;
