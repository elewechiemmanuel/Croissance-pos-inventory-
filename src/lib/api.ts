import { db } from "../firebase";
import {  
  collection,  
  addDoc,  
  doc,  
  getDoc,  
  updateDoc,  
  getDocs,  
  query,  
  where,  
  serverTimestamp  
} from "firebase/firestore";

// Helper to remove any undefined fields recursively so Firestore doesn't crash
function cleanObject(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      cleaned[key] = cleanObject(obj[key]);
    }
  }
  return cleaned;
}

export async function apiCall(action: string, payload: any = {}) {
  try {
    let currentUser: any = null;
    try {
      const stored = localStorage.getItem("croissance_user");
      if (stored) {
        currentUser = JSON.parse(stored);
      }
    } catch (e) {
      // ignore JSON parse error
    }

    const rawActor = payload._actor || (currentUser ? {
      id: currentUser.id || "admin",
      fullName: currentUser.fullName || currentUser.name || "Admin",
      email: currentUser.email || "admin@croissance.com",
      role: currentUser.role || "admin",
      station: currentUser.currentStation || currentUser.station || "Admin Office"
    } : {
      id: "system",
      fullName: "System User",
      email: "system@croissance.com",
      role: "admin",
      station: "Main Office"
    });

    const payloadWithActor = cleanObject({
      ...payload,
      _actor: rawActor
    });

    // 1. Handle user login action directly against Firestore "users" collection
    if (action === "login") {
      const { email, password } = payload;
      
      if (!email || !password) {
        throw new Error("Please provide both email and password.");
      }

      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        throw new Error("Invalid email or password.");
      }

      const userDoc = querySnap.docs[0];
      const userData = userDoc.data();

      if (userData.password && userData.password !== password) {
        throw new Error("Invalid email or password.");
      }

      const userSession = {
        id: userDoc.id,
        fullName: userData.fullName || userData.name,
        email: userData.email,
        role: userData.role || "staff",
        currentStation: userData.currentStation || userData.station || "Station POS Terminal"
      };

      localStorage.setItem("croissance_user", JSON.stringify(userSession));

      return {
        success: true,
        data: userSession
      };
    }

    // 2. Handle addSale action
    if (action === "addSale") {
      const now = new Date();
      const invoiceNumber = `INV-${now.getTime().toString().slice(-6)}`;
       
      const saleData = cleanObject({
        ...payloadWithActor,
        invoiceNumber,
        createdAt: serverTimestamp(),
        date: payload.date || now.toISOString().split("T")[0],
        timestamp: now.toISOString()
      });

      const docRef = await addDoc(collection(db, "sales"), saleData);

      if (Array.isArray(payload.items)) {
        for (const item of payload.items) {
          const rawId = item.productId || item.id || item._id;
          const qtyToDeduct = Number(item.quantity || item.qty || 1);

          if (!rawId || isNaN(qtyToDeduct)) {
            continue;
          }

          const targetId = String(rawId);

          try {
            const directRef = doc(db, "products", targetId);
            const directSnap = await getDoc(directRef);

            if (directSnap.exists()) {
              const currentData = directSnap.data();
              const oldStock = Number(currentData.currentStock ?? currentData.stock ?? currentData.quantity ?? 0);
              const newStock = Math.max(0, oldStock - qtyToDeduct);

              await updateDoc(directRef, {
                currentStock: newStock,
                quantity: newStock,
                stock: newStock
              });
            } else {
              const q = query(collection(db, "products"), where("id", "==", targetId));
              const querySnap = await getDocs(q);
               
              for (const docSnap of querySnap.docs) {
                const currentData = docSnap.data();
                const oldStock = Number(currentData.currentStock ?? currentData.stock ?? currentData.quantity ?? 0);
                const newStock = Math.max(0, oldStock - qtyToDeduct);

                await updateDoc(doc(db, "products", docSnap.id), {
                  currentStock: newStock,
                  quantity: newStock,
                  stock: newStock
                });
              }
            }
          } catch (err) {
            console.error(`Error updating stock for product ${targetId}:`, err);
          }
        }
      }

      const itemData = {  
        id: docRef.id,  
        ...saleData,  
        createdAt: now.toISOString()  
      };

      return {
        success: true,
        data: itemData,
        ...itemData
      };
    }

    // 3. Handle addProduct action
    if (action === "addProduct") {
      const initialStock = Number(payload.stock ?? payload.currentStock ?? payload.quantity ?? 0);
      const productData = cleanObject({
        ...payloadWithActor,
        stock: initialStock,
        currentStock: initialStock,
        quantity: initialStock,
        createdAt: serverTimestamp()
      });
      const docRef = await addDoc(collection(db, "products"), productData);
      return { success: true, id: docRef.id, ...productData };
    }

    // 4. Handle generic data fetching directly from Firestore
    if (action === "getProducts" || action === "products") {
      const querySnapshot = await getDocs(collection(db, "products"));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const stockVal = Number(data.currentStock ?? data.stock ?? data.quantity ?? 0);
        return {
          id: doc.id,
          ...data,
          stock: stockVal,
          currentStock: stockVal,
          quantity: stockVal
        };
      });
    }

    if (action === "getSales" || action === "sales") {
      const querySnapshot = await getDocs(collection(db, "sales"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (action === "getInvoices" || action === "invoices") {
      const querySnapshot = await getDocs(collection(db, "sales"));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date || data.timestamp || new Date().toISOString()
        };
      });
    }

    if (action === "getCustomers" || action === "customers") {
      const querySnapshot = await getDocs(collection(db, "customers"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (action === "getUsers" || action === "users") {
      const querySnapshot = await getDocs(collection(db, "users"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (action === "getWaybills" || action === "waybills") {
      const querySnapshot = await getDocs(collection(db, "waybills"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (action === "getInitialData") {
      const [productsSnap, salesSnap, customersSnap, usersSnap, waybillsSnap] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "sales")),
        getDocs(collection(db, "customers")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "waybills"))
      ]);

      return {
        products: productsSnap.docs.map(doc => {
          const data = doc.data();
          const stockVal = Number(data.currentStock ?? data.stock ?? data.quantity ?? 0);
          return {
            id: doc.id,
            ...data,
            stock: stockVal,
            currentStock: stockVal,
            quantity: stockVal
          };
        }),
        sales: salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        invoices: salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        customers: customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        users: usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        waybills: waybillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        stationAddress: "Main Station Address"
      };
    }

    // Fallback for any other custom action
    console.warn(`Unhandled action "${action}" passed to apiCall.`);
    return { success: true, data: [] };

  } catch (error: any) {
    console.error("API Call Error:", error);
    throw error;
  }
}