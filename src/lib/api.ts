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

      // 1. Save sale record
      const docRef = await addDoc(collection(db, "sales"), saleData);

      // 2. Safely deduct product stock
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
            // Check direct document ID match first
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
              // Fallback query if product document ID differs from internal product.id field
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

    const response = await fetch("/api/sheets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, payload: payloadWithActor }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "API error");
    }
    return result.data;

  } catch (error: any) {
    console.error("API Call Error:", error);
    throw error;
  }
}