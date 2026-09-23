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
        products: productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        sales: salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        customers: customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        users: usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        waybills: waybillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        stationAddress: "Main Station Address" // Fallback string to prevent undefined crashes
      };
    }