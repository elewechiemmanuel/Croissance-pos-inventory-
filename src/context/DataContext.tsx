import React, { createContext, useContext, useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

const DataContext = createContext<any>({});

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    // Automatically sign in anonymously if not already logged in
    const initAuth = async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous auth error:", error);
        }
      }
    };

    initAuth();

    // Listen for auth state and fetch data once authenticated
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribeSnapshot = onSnapshot(
          collection(db, "products"),
          (snapshot) => {
            const productList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            }));
            setProducts(productList);
            setLoading(false);
          },
          (error) => {
            console.error("Firestore real-time subscription error:", error);
            setLoading(false);
          }
        );
      } else {
        setProducts([]);
        setLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return (
    <DataContext.Provider value={{ products, loading }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);