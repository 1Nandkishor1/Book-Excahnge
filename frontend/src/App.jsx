import { useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import EmptyState from "./components/EmptyState";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookDetails from "./pages/BookDetails";
import BookForm from "./pages/BookForm";
import MyBooks from "./pages/MyBooks";
import Offers from "./pages/Offers";
import Profile from "./pages/Profile";
import ProtectedRoute from "./routes/ProtectedRoute";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/books/:id" element={<BookDetails />} />

          <Route path="/add-book" element={<ProtectedRoute><BookForm /></ProtectedRoute>} />
          <Route path="/edit-book/:id" element={<ProtectedRoute><BookForm /></ProtectedRoute>} />
          <Route path="/my-books" element={<ProtectedRoute><MyBooks /></ProtectedRoute>} />
          <Route path="/offers" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route
            path="*"
            element={
              <EmptyState
                title="That page doesn't exist"
                body="The link may be old or mistyped."
                action={<Link to="/" className="btn-primary">Browse books</Link>}
              />
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
