// =========================
// Firebase SAFE Initialization
// =========================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// 🔥 Prevent duplicate initialization
let app;
if (!getApps().length) {
  app = initializeApp({
    apiKey: "AIzaSyCbzEw-EpNrUIcLeAcWxAH1PE318Bxh-5I",
    authDomain: "sebbygames-61beb.firebaseapp.com",
    projectId: "sebbygames-61beb",
    storageBucket: "sebbygames-61beb.firebasestorage.app",
    messagingSenderId: "344907692435",
    appId: "1:344907692435:web:8c4c2d716e8c180f3cd066",
  });
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

/************************
     ELEMENTS
************************/
const adminPanel = document.getElementById("admin-panel");
const toggleAddPanel = document.getElementById("toggleAddPanel");
const addPanelContent = document.getElementById("addPanelContent");
const addItemFormBtn = document.getElementById("addItemFormBtn");
const itemList = document.getElementById("itemList");
const searchBox = document.getElementById("searchBox");
const filterSelect = document.getElementById("filterSelect");

let allItems = [];

/************************
     ROLE CHECK
************************/
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      loadItems("User");
      return;
    }

    const userData = snap.data();
    const role = userData.Role || "User";

    if (role === "Admin") adminPanel.classList.remove("hidden");

    loadItems(role);
  } catch (err) {
    console.error("Error fetching user role:", err);
    loadItems("User");
  }
});

/************************
   TOGGLE ADD PANEL
************************/
toggleAddPanel.addEventListener("click", () => {
  if (addPanelContent.classList.contains("open")) {
    // Collapse
    addPanelContent.style.maxHeight = "0px";
    addPanelContent.classList.remove("open");
    toggleAddPanel.innerHTML = `<i class="fa fa-plus"></i> Add Item`;
  } else {
    // Expand dynamically
    addPanelContent.classList.add("open");

    // Force the panel to fully expand including the fixed-height textarea
    const extraHeight = 20; // extra padding buffer
    addPanelContent.style.maxHeight = addPanelContent.scrollHeight + extraHeight + "px";

    toggleAddPanel.innerHTML = `<i class="fa fa-minus"></i> Close`;
  }
});

/************************
      ADD ITEM
************************/
addItemFormBtn.addEventListener("click", async () => {
  const title = document.getElementById("item-title").value.trim();
  const desc = document.getElementById("item-desc").value.trim();
  const price = Number(document.getElementById("item-price").value.trim());

  if (!title || !desc || !price) return;

  try {
    await addDoc(collection(db, "items"), { title, desc, price, createdAt: Date.now() });

    document.getElementById("item-title").value = "";
    document.getElementById("item-desc").value = "";
    document.getElementById("item-price").value = "";

    loadItems("Admin");
  } catch (err) {
    console.error("Error adding item:", err);
  }
});

/************************
     LOAD ITEMS
************************/
async function loadItems(role = "User") {
  itemList.innerHTML = `<p style="color:#fff;">Loading items...</p>`;

  try {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    allItems = [];
    if (snap.empty) {
      itemList.innerHTML = `<p style="color:#aaa;">No items yet.</p>`;
      return;
    }

    snap.forEach(d => {
      const item = d.data();
      item.id = d.id;
      allItems.push(item);
    });

    applyFilters(); // initial render
  } catch (err) {
    console.error("Error loading items:", err);
    itemList.innerHTML = `<p style="color:#ff6b6b;">Failed to load items.</p>`;
  }
}

/************************
     FILTERS
************************/
searchBox.addEventListener("input", applyFilters);
filterSelect.addEventListener("change", applyFilters);

function applyFilters() {
  const searchTerm = searchBox.value.trim().toLowerCase();
  const sortValue = filterSelect.value;

  let filtered = [...allItems];

  if (searchTerm) {
    filtered = filtered.filter(item => item.title.toLowerCase().includes(searchTerm));
  }

  if (sortValue === "low") filtered.sort((a,b) => a.price - b.price);
  if (sortValue === "high") filtered.sort((a,b) => b.price - a.price);

  renderItems(filtered);
}

/************************
     RENDER ITEMS
************************/
function renderItems(items) {
  itemList.innerHTML = "";
  if (!items.length) {
    itemList.innerHTML = `<p style="color:#aaa;">No items match your search.</p>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <h4>${item.title}</h4>
      <p>${item.desc}</p>
      <div class="item-price">₱${item.price}</div>
    `;
    itemList.appendChild(card);
    setTimeout(() => card.classList.add("fade-in"), 50);
  });
}
