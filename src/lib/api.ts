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

    const payloadWithActor = {
      ...payload,
      _actor: payload._actor || (currentUser ? {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role,
        station: currentUser.currentStation || (currentUser.role === "admin" ? "Admin Office" : "Station POS Terminal")
      } : undefined)
    };

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
       
      const saleData = {
        ...payloadWithActor,
        invoiceNumber,
        createdAt: serverTimestamp(),
        date: payload.date || now.toISOString().split("T")[0],
        timestamp: now.toISOString()
      };

      // Save sale record to Firestore
      const docRef = await addDoc(collection(db, "sales"), saleData);

      // Safely deduct product stock
      if (Array.isArray(payload.items)) {
        for (const item of payload.items) {
          const rawId = item.productId || item.id || item._id;
          const qtyToDeduct = Number(item.quantity || item.qty || 1);

          if (!rawId || isNaN(qtyToDeduct)) {
            console.warn("Skipping item depletion due to missing ID or quantity:", item);
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
              console.log(`Depleted stock for product document [${targetId}] from ${oldStock} to ${newStock}`);
            } else {
              const q = query(
                collection(db, "products"), 
                where("id", "==", targetId)
              );
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
                console.log(`Depleted stock for queried product [${docSnap.id}] from ${oldStock} to ${newStock}`);
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

    // 3. Handle generic data fetching directly from Firestore
    if (action === "getProducts" || action === "products") {
      const querySnapshot = await getDocs(collection(db, "products"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (action === "getSales" || action === "sales") {
      const querySnapshot = await getDocs(collection(db, "sales"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (action === "getCustomers" || action === "customers") {
      const querySnapshot = await getDocs(collection(db, "customers"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (action === "getUsers" || action === "users") {
      const querySnapshot = await getDocs(collection(db, "users"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Fallback for any other custom action
    console.warn(`Unhandled action "${action}" passed to apiCall.`);
    return { success: true, data: [] };

  } catch (error: any) {
    console.error("API Call Error:", error);
    throw error;
  }
}