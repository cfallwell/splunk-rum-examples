import React, { useState } from "react";
import { Routes, Route, Link, NavLink } from "react-router-dom";
import { RumRouterTracker, useEnableReplayPersist } from "@cfallwell/rumbootstrap";
import ProductList from "./ProductList";
import ProductDetail from "./ProductDetail";
import Cart from "./Cart";
import LoremPage from "./LoremPage";

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

const initialProducts: Product[] = [
  { id: 1, name: "Noise-Cancelling Headphones", price: 199.99, image: "/images/product-1.svg" },
  { id: 2, name: "Smart Watch", price: 149.99, image: "/images/product-2.svg" },
  { id: 3, name: "Wireless Mouse", price: 39.99, image: "/images/product-3.svg" },
  { id: 4, name: "Mechanical Keyboard", price: 89.99, image: "/images/product-4.svg" },
  { id: 5, name: "4K Monitor", price: 329.99, image: "/images/product-5.svg" },
];

export interface CartItem extends Product {
  quantity: number;
}

export default function App() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const enableReplay = useEnableReplayPersist();

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const handleDelete = (_productId: number) => {
    // Intentionally broken for observability testing.
    try {
      throw new Error("Delete is intentionally broken for demo purposes.");
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div style={styles.appShell}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>
            <Link to="/" style={styles.brandLink}>
              Shopping SPA TS Demo
            </Link>
          </h1>
          <button type="button" onClick={enableReplay} style={styles.replayButton}>
            Enable Session Replay
          </button>
        </div>

        <nav style={styles.nav}>
          <NavLink to="/" style={navStyle} end>
            Products
          </NavLink>
          <NavLink to="/cart" style={navStyle}>
            Cart ({totalCount})
          </NavLink>
          <NavLink to="/about" style={navStyle}>
            About
          </NavLink>
          <NavLink to="/support" style={navStyle}>
            Support
          </NavLink>
          <NavLink to="/terms" style={navStyle}>
            Terms
          </NavLink>
        </nav>
      </header>

      {/* Route tracking for Splunk RUM */}
      <RumRouterTracker />

      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<ProductList products={initialProducts} onAddToCart={addToCart} />} />
          <Route
            path="/product/:id"
            element={<ProductDetail products={initialProducts} onAddToCart={addToCart} />}
          />
          <Route
            path="/cart"
            element={<Cart items={cartItems} onUpdateQuantity={updateQuantity} onDelete={handleDelete} />}
          />
          <Route path="/about" element={<LoremPage title="About (Lorem Ipsum)" />} />
          <Route path="/support" element={<LoremPage title="Support (Lorem Ipsum)" />} />
          <Route path="/terms" element={<LoremPage title="Terms (Lorem Ipsum)" />} />
          <Route path="*" element={<LoremPage title="Not Found (Lorem Ipsum)" />} />
        </Routes>
      </main>
    </div>
  );
}

const navStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  textDecoration: "none",
  color: isActive ? "#111827" : "#2563eb",
  fontWeight: 700,
});

const styles: Record<string, React.CSSProperties> = {
  appShell: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    maxWidth: "1040px",
    margin: "0 auto",
    padding: "1rem",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "1rem",
    gap: "1rem",
    flexWrap: "wrap",
  },
  brandLink: {
    textDecoration: "none",
    color: "#111827",
  },
  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    alignItems: "center",
    paddingTop: "0.25rem",
  },
  main: {
    backgroundColor: "#f9fafb",
    padding: "1rem",
    borderRadius: "0.75rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  replayButton: {
    marginTop: "0.5rem",
    padding: "0.25rem 0.75rem",
    borderRadius: "0.375rem",
    border: "1px solid #2563eb",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 700,
  },
};
