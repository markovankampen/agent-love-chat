import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Verify from "./pages/Verify";
import ApiVerify from "./pages/ApiVerify";
import ProfileSetup from "./pages/ProfileSetup";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import ReuploadPhoto from "./pages/ReuploadPhoto";
import NotFound from "./pages/NotFound";
import Maintenance from "./pages/Maintenance";
import InternalPreviewGate from "./pages/InternalPreviewGate";

// ─── MAINTENANCE MODE ───
// Set to false to restore the full site
const MAINTENANCE_MODE = true;

const PREVIEW_SESSION_KEY = "flori_internal_preview";

function isPreviewUnlocked() {
  try {
    return sessionStorage.getItem(PREVIEW_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

const queryClient = new QueryClient();

function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useHeartbeat();
  return <>{children}</>;
}

const FullRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/home" element={<Home />} />
    <Route path="/chat" element={<Chat />} />
    <Route path="/verify" element={<Verify />} />
    <Route path="/api-verify" element={<ApiVerify />} />
    <Route path="/profile-setup" element={<ProfileSetup />} />
    <Route path="/account" element={<Account />} />
    <Route path="/admin" element={<Admin />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/reupload-photo" element={<ReuploadPhoto />} />
    <Route path="/internal-preview-flori" element={<InternalPreviewGate />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  const showFull = !MAINTENANCE_MODE || isPreviewUnlocked();

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <HeartbeatProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {showFull ? (
              <FullRoutes />
            ) : (
              <Routes>
                <Route path="/admin" element={<Admin />} />
                <Route path="/internal-preview-flori" element={<InternalPreviewGate />} />
                <Route path="*" element={<Maintenance />} />
              </Routes>
            )}
          </BrowserRouter>
          </HeartbeatProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
