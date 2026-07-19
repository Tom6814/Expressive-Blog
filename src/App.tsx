/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Post } from "./pages/Post";
import { Archive } from "./pages/Archive";
import { Tags } from "./pages/Tags";
import { About } from "./pages/About";
import { Moments } from "./pages/Moments";
import { Friends } from "./pages/Friends";
import { Profile } from "./pages/Profile";
import { Auth } from "./pages/Auth";
import { AdminLayout } from "./pages/admin/Layout";
import { Dashboard } from "./pages/admin/Dashboard";
import { AdminPosts } from "./pages/admin/Posts";
import { AdminEditor } from "./pages/admin/Editor";
import { AdminMoments } from "./pages/admin/Moments";
import { AdminComments } from "./pages/admin/Comments";
import { AdminSettings } from "./pages/admin/Settings";
import { AdminTaxonomy } from "./pages/admin/Taxonomy";
import { AdminLogin } from "./pages/admin/Login";
import { Loader } from "./components/Loader";
import { PageMeta } from "./components/PageMeta";
import { AnimatePresence } from "motion/react";
import { ScrollToTop } from "./components/ScrollToTop";

function AuthRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("admin_token");
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { isLoading } = useSettings();

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && <Loader fullScreen key="loading" />}
      </AnimatePresence>

      {!isLoading && (
        <Router>
          <ScrollToTop />
          <PageMeta />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="post/:slug" element={<Post />} />
              <Route path="archive" element={<Archive />} />
              <Route path="tags" element={<Tags />} />
              <Route path="about" element={<About />} />
              <Route path="moments" element={<Moments />} />
              <Route path="friends" element={<Friends />} />
              <Route path="profile" element={<Profile />} />
              <Route path="category/:id" element={<Home />} />
              <Route path="tag/:id" element={<Home />} />
            </Route>

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AuthRoute><AdminLayout /></AuthRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="editor" element={<AdminEditor />} />
              <Route path="moments" element={<AdminMoments />} />
              <Route path="comments" element={<AdminComments />} />
              <Route path="taxonomy" element={<AdminTaxonomy />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Routes>
        </Router>
      )}
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
