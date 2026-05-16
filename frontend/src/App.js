import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home        from './pages/Home';
import Auth        from './pages/Auth';
import Stories     from './pages/Stories';
import StoryDetail from './pages/StoryDetail';
import PostStory   from './pages/PostStory';
import EditStory   from './pages/EditStory';
import MyStories   from './pages/MyStories';
import Admin       from './pages/Admin';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/auth"        element={<Auth />} />
          <Route path="/stories"     element={<Stories />} />
          <Route path="/stories/:id" element={<StoryDetail />} />
          <Route path="/post"        element={<PostStory />} />
          <Route path="/edit/:id"    element={<EditStory />} />
          <Route path="/my-stories"  element={<MyStories />} />
          <Route path="/admin"       element={<Admin />} />
          <Route path="/about"       element={<Home />} />
          <Route path="*"            element={<Home />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
